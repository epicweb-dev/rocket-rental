import {
	DataFunctionArgs,
	json,
	redirect,
	unstable_createMemoryUploadHandler,
	unstable_parseMultipartFormData,
} from '@remix-run/node'
import {
	Form,
	Link,
	useFetcher,
	useLoaderData,
	useNavigate,
} from '@remix-run/react'
import * as Dialog from '@radix-ui/react-dialog'
import { z } from 'zod'
import clsx from 'clsx'
import { authenticator, requireUserId } from '~/utils/auth.server'
import { prisma } from '~/utils/db.server'
import {
	Button,
	getFieldsFromSchema,
	LabelButton,
	preprocessFormData,
} from '~/utils/forms'
import { getUserImgSrc } from '~/utils/misc'
import * as deleteImageRoute from '~/routes/resources+/delete-image'
import { useState } from 'react'

const MAX_SIZE = 1024 * 1024 * 5 // 5MB

const PhotoFormSchema = z.object({
	photoFile: z.instanceof(File),
})

export async function loader({ request }: DataFunctionArgs) {
	const userId = await requireUserId(request)
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { imageId: true },
	})
	if (!user) {
		await authenticator.logout(request, { redirectTo: '/' })
		return redirect('/') // this is just here for types...
	}
	return json({ user, fieldMetadatas: getFieldsFromSchema(PhotoFormSchema) })
}

export async function action({ request }: DataFunctionArgs) {
	const userId = await requireUserId(request)
	const contentLength = Number(request.headers.get('Content-Length'))
	if (
		contentLength &&
		Number.isFinite(contentLength) &&
		contentLength > MAX_SIZE
	) {
		return json(
			{
				status: 'error',
				errors: {
					formErrors: [],
					fieldErrors: { profileFile: ['File too large'] },
				},
			} as const,
			{ status: 400 },
		)
	}
	const formData = await unstable_parseMultipartFormData(
		request,
		unstable_createMemoryUploadHandler({ maxPartSize: MAX_SIZE }),
	)
	const result = PhotoFormSchema.safeParse(
		preprocessFormData(formData, PhotoFormSchema),
	)

	if (!result.success) {
		return json({ status: 'error', errors: result.error.flatten() } as const, {
			status: 400,
		})
	}

	const { photoFile } = result.data

	const newPrismaPhoto = {
		contentType: photoFile.type,
		file: {
			create: {
				blob: Buffer.from(await photoFile.arrayBuffer()),
			},
		},
	}

	const previousUserPhoto = await prisma.user.findUnique({
		where: { id: userId },
		select: { imageId: true },
	})

	await prisma.user.update({
		select: { id: true },
		where: { id: userId },
		data: {
			image: {
				upsert: {
					update: newPrismaPhoto,
					create: newPrismaPhoto,
				},
			},
		},
	})

	if (previousUserPhoto?.imageId) {
		void prisma.image
			.delete({
				where: { fileId: previousUserPhoto.imageId },
			})
			.catch(() => {}) // ignore the error, maybe it never existed?
	}

	return redirect('/settings/profile')
}

export default function PhotoChooserModal() {
	const data = useLoaderData<typeof loader>()
	const [newImageSrc, setNewImageSrc] = useState<string | null>(null)
	const navigate = useNavigate()
	const deleteImageFetcher = useFetcher<typeof deleteImageRoute.action>()

	const deleteProfilePhotoFormId = 'delete-profile-photo'
	const dismissModal = () => navigate('..')
	return (
		<Dialog.Root open={true}>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 backdrop-blur-[2px]" />
				<Dialog.Content
					onEscapeKeyDown={dismissModal}
					onInteractOutside={dismissModal}
					onPointerDownOutside={dismissModal}
					className="fixed top-1/2 left-1/2 w-[90vw] max-w-3xl -translate-x-1/2 -translate-y-1/2 transform rounded-lg bg-night-muted p-12 shadow-lg"
				>
					<Dialog.Title asChild className="text-center">
						<h2 className="text-4xl font-bold text-white">Profile photo</h2>
					</Dialog.Title>
					<Form
						method="post"
						encType="multipart/form-data"
						className="mt-8 flex flex-col items-center justify-center gap-10"
						onReset={() => setNewImageSrc(null)}
					>
						<img
							src={newImageSrc ?? getUserImgSrc(data.user.imageId)}
							className="h-64 w-64 rounded-full"
						/>
						<input
							id="photoFile"
							type="file"
							name="photoFile"
							accept="image/*"
							className="sr-only"
							tabIndex={newImageSrc ? -1 : 0}
							onChange={e => {
								const file = e.currentTarget.files?.[0]
								if (file) {
									const reader = new FileReader()
									reader.onload = event => {
										setNewImageSrc(event.target?.result?.toString() ?? null)
									}
									reader.readAsDataURL(file)
								}
							}}
						/>
						{newImageSrc ? (
							<div className="flex gap-4">
								<Button type="submit" size="medium" variant="primary">
									Save Photo
								</Button>
								<Button type="reset" size="medium" variant="secondary">
									Reset
								</Button>
							</div>
						) : (
							<div className="flex gap-4">
								<LabelButton
									htmlFor="photoFile"
									size="medium"
									variant="primary"
								>
									✏️ Change
								</LabelButton>
								{data.user.imageId ? (
									<Button
										size="medium"
										variant="secondary"
										type="submit"
										form={deleteProfilePhotoFormId}
									>
										🗑 Delete
									</Button>
								) : null}
							</div>
						)}
					</Form>
					<Dialog.Close asChild>
						<Link
							to=".."
							aria-label="Close"
							className="absolute right-10 top-10"
						>
							❌
						</Link>
					</Dialog.Close>
				</Dialog.Content>
			</Dialog.Portal>
			<deleteImageFetcher.Form
				method="post"
				id={deleteProfilePhotoFormId}
				action={deleteImageRoute.ROUTE_PATH}
			>
				<input name="imageId" type="hidden" value={data.user.imageId ?? ''} />
			</deleteImageFetcher.Form>
		</Dialog.Root>
	)
}
