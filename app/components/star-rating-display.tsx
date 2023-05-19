import { clsx } from 'clsx'

export function StarRatingDisplay({
	rating,
	size,
}: {
	rating: number
	size: 'sm' | 'md'
}) {
	return (
		<div
			className={clsx(
				'inline-block rounded-full bg-smooth-vert px-3 py-[6px] font-bold text-night-600',
				size === 'sm' ? 'text-body-2xs' : 'text-body-md',
			)}
		>
			⭐ {rating.toFixed(1)}
		</div>
	)
}
