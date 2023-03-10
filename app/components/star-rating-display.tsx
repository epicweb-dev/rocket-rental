import clsx from 'clsx'
import styles from './star-rating-display.module.css'

export function StarRatingDisplay({ rating }: { rating: number }) {
	return (
		<div
			className={clsx(
				styles.starRatingDisplay,
				'text-muted-dark inline-block rounded-full px-3 py-[6px] text-xl',
			)}
		>
			⭐ {rating.toFixed(1)}
		</div>
	)
}
