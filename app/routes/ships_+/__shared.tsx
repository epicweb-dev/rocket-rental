import { type SerializeFrom } from '@remix-run/node'
import { Form, Link } from '@remix-run/react'
import { useState } from 'react'
import { GeneralErrorBoundary } from '~/components/error-boundary.tsx'
import { BrandCombobox } from '~/routes/resources+/brand-combobox.tsx'
import { ModelCombobox } from '~/routes/resources+/model-combobox.tsx'
import { StarportCombobox } from '~/routes/resources+/starport-combobox.tsx'
import { useForm } from '~/utils/forms.tsx'
import { getShipImgSrc } from '~/utils/misc.ts'
import {
	type action as editAction,
	type loader as editLoader,
} from './$shipId_.edit.tsx'
import { type action as newAction, type loader as newLoader } from './new.tsx'

export const labelClassName = 'block text-body-xs font-medium text-gray-700'
export const inputClassName =
	'w-full rounded border border-gray-500 px-2 py-1 text-lg'
export const fieldClassName = 'flex gap-1 flex-col'

export default function ShipEditForm({
	data,
	actionData,
}: {
	data: SerializeFrom<typeof newLoader> | SerializeFrom<typeof editLoader>
	actionData?:
		| SerializeFrom<typeof newAction>
		| SerializeFrom<typeof editAction>
}) {
	const { form, fields } = useForm({
		name: 'ship-edit',
		errors: actionData?.errors,
		fieldMetadatas: data.fieldMetadata,
	})

	const [selectedStarport, setSelectedStarport] = useState<
		NonNullable<typeof data.ship>['starport'] | null
	>(data.ship?.starport ?? null)

	const [selectedModel, setSelectedModel] = useState<Pick<
		NonNullable<typeof data.ship>['model'],
		'id' | 'name' | 'imageId'
	> | null>(data.ship?.model ?? null)

	const [selectedBrand, setSelectedBrand] = useState<
		NonNullable<typeof data.ship>['model']['brand'] | null
	>(data.ship?.model.brand ?? null)

	return (
		<Form
			method="POST"
			className="flex flex-col gap-4"
			encType="multipart/form-data"
			{...form.props}
		>
			<div className={fieldClassName}>
				<img
					src={getShipImgSrc(data.ship?.imageId)}
					alt={data.ship?.name}
					className="h-24 w-24 rounded-full object-cover"
				/>
				<label className={labelClassName} {...fields.imageFile.labelProps}>
					{data.ship?.imageId ? 'Change Ship Photo' : 'Set Ship Photo'}
				</label>
				<input
					className={inputClassName}
					{...fields.imageFile.props}
					type="file"
				/>
				{fields.imageFile.errorUI}
			</div>
			<div className={fieldClassName}>
				<label className={labelClassName} {...fields.name.labelProps}>
					Name
				</label>
				<input
					className={inputClassName}
					defaultValue={data.ship?.name}
					{...fields.name.props}
				/>
				{fields.name.errorUI}
			</div>
			<div className={fieldClassName}>
				<label className={labelClassName} {...fields.description.labelProps}>
					Description
				</label>
				<textarea
					className={inputClassName}
					defaultValue={data.ship?.description}
					{...fields.description.props}
				/>
				{fields.description.errorUI}
			</div>
			<BrandCombobox
				selectedItem={selectedBrand}
				onChange={newBrand => {
					setSelectedBrand(newBrand ?? null)
				}}
			/>
			<ModelCombobox
				selectedItem={selectedModel}
				brandIds={selectedBrand ? [selectedBrand.id] : []}
				onChange={newModel => {
					setSelectedModel(newModel ?? null)
				}}
			/>
			{selectedModel?.id ? (
				<input
					value={selectedModel?.id ?? ''}
					{...fields.modelId.props}
					type="hidden"
				/>
			) : null}
			{fields.modelId.errorUI}
			<div className={fieldClassName}>
				<label className={labelClassName} {...fields.capacity.labelProps}>
					Capacity
				</label>
				<input
					className={inputClassName}
					defaultValue={data.ship?.capacity}
					{...fields.capacity.props}
				/>
				{fields.capacity.errorUI}
			</div>
			<div className={fieldClassName}>
				<label className={labelClassName} {...fields.dailyCharge.labelProps}>
					Daily Charge
				</label>
				<input
					className={inputClassName}
					defaultValue={data.ship?.dailyCharge}
					{...fields.dailyCharge.props}
				/>
				{fields.dailyCharge.errorUI}
			</div>
			<StarportCombobox
				selectedItem={selectedStarport}
				geolocation={null}
				onChange={newStarport => {
					setSelectedStarport(newStarport ?? null)
				}}
			/>
			{selectedStarport?.id ? (
				<input
					value={selectedStarport.id ?? ''}
					{...fields.starportId.props}
					type="hidden"
				/>
			) : null}
			{fields.starportId.errorUI}

			{form.errorUI}

			<button type="submit">Save</button>
		</Form>
	)
}

export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				403: () => (
					<div>
						You are not a host. You must{' '}
						<Link to="/settings/profile" className="underline">
							visit your profile settings
						</Link>{' '}
						page to create your host profile first.
					</div>
				),
			}}
		/>
	)
}
