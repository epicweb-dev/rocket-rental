import {
	json,
	unstable_composeUploadHandlers,
	unstable_createMemoryUploadHandler,
	unstable_parseMultipartFormData,
	type DataFunctionArgs,
	type UploadHandler,
} from '@remix-run/node'
import { useFetcher } from '@remix-run/react'
import invariant from 'tiny-invariant'
import { imageDb } from '~/utils/image.server'

const MAX_SIZE = 1024 * 1024 * 5 // 5MB

const imageUploadHandler: UploadHandler = async ({
	name,
	contentType,
	data,
}) => {
	if (name !== 'file') {
		return
	}
	let chunks = []
	let size = 0
	for await (let chunk of data) {
		size += chunk.byteLength
		if (size > MAX_SIZE) {
			throw new Error('File too large')
		}
		chunks.push(chunk)
	}

	const result = imageDb
		.prepare(
			/* sql */ `
			INSERT INTO "Image"
				(contentType, blob)
				VALUES (@contentType, @blob)
				RETURNING id
			`,
		)
		.run({ contentType, blob: Buffer.concat(chunks) })
	const { id } = imageDb
		.prepare(`SELECT id FROM "Image" WHERE rowid = @rowId;`)
		.get({ rowId: result.lastInsertRowid })
	return id
}

export async function action({ request }: DataFunctionArgs) {
	const formData = await unstable_parseMultipartFormData(
		request,
		unstable_composeUploadHandlers(
			// our custom upload handler
			imageUploadHandler,
			unstable_createMemoryUploadHandler(),
		),
	).catch(error => error)

	if (formData instanceof Error) {
		return json({ error: formData.message }, { status: 400 })
	}

	const fileId = formData.get('file')
	invariant(typeof fileId === 'string', 'file not inserted properly')
	const altText = formData.get('altText')
	if (typeof altText === 'string' && altText) {
		imageDb
			.prepare(/* sql */ `UPDATE "Image" SET altText = @altText WHERE id = @id`)
			.run({ id: fileId, altText })
	}

	return json({ fileId })
}

export default function NewFileUpload() {
	const fetcher = useFetcher<typeof action>()
	console.log(fetcher.data)
	return (
		<fetcher.Form method="post" encType="multipart/form-data">
			<label htmlFor="file-input">File</label>
			<input id="file-input" type="file" name="file" />
			<input id="alt-text" type="text" name="altText" placeholder="Alt text" />
			<button type="submit">Upload</button>
		</fetcher.Form>
	)
}
