import { Link } from '@remix-run/react'
import * as Separator from '@radix-ui/react-separator'
import { getShipImgSrc } from '~/utils/misc'
import { StarRatingDisplay } from './star-rating-display'

export function ShipCard({
	ship,
	brand,
	model,
	dailyChargeFormatted,
	avgRating,
}: {
	ship: { name: string; id: string; imageId: string | null }
	brand: { id: string; name: string }
	model: { id: string; name: string }
	dailyChargeFormatted: string
	avgRating?: number | null
}) {
	return (
		<div
			key={ship.name}
			className="flex h-full w-full max-w-sm flex-col rounded-3xl bg-night-500"
		>
			<Link to={`/ships/${ship.id}`}>
				<img
					className="aspect-[35/31] rounded-3xl"
					src={getShipImgSrc(ship.imageId)}
					alt={ship.name}
				/>
			</Link>
			<div className="h-10" />
			<div className="px-6 pb-8">
				<div className="flex flex-col gap-2">
					<div className="flex items-center gap-2">
						<Link
							to={`/search?${new URLSearchParams({
								brandId: brand.id,
							})}`}
						>
							<p className="font-bold">{brand.name}</p>
						</Link>
						<Separator.Root
							orientation="vertical"
							className="h-[16px] w-[1.5px] bg-night-400"
						/>
						<Link
							to={`/search?${new URLSearchParams({
								modelId: model?.id ?? '',
							})}`}
						>
							<p className="text-night-200">{model?.name}</p>
						</Link>
					</div>
					<Link to={`/ships/${ship.id}`}>
						<h3 className="text-h4">{ship.name}</h3>
					</Link>
				</div>
				<div className="mt-8 flex justify-between">
					<div className="flex items-baseline gap-1">
						<span className="text-h5">{dailyChargeFormatted}</span>
						<span className="text-night-200">day</span>
					</div>
					{avgRating ? (
						<Link to={`/ships/${ship.id}/reviews`}>
							<StarRatingDisplay size="sm" rating={avgRating} />
						</Link>
					) : null}
				</div>
			</div>
		</div>
	)
}
