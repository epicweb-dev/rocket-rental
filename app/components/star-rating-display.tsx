export function StarRatingDisplay({ rating }: { rating: number }) {
	return (
		<div className="inline-block rounded-full bg-smooth-vert px-3 py-[6px] text-xl text-night-600">
			⭐ {rating.toFixed(1)}
		</div>
	)
}
