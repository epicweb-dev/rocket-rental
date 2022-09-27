import type { InputInfo } from 'remix-validity-state'

export function ListOfErrorMessages({
	info,
	...ulProps
}: { info: InputInfo } & React.ComponentProps<'ul'>) {
	return (
		<div className="relative h-4">
			{info.touched && info.errorMessages ? (
				<ul {...ulProps} className={`absolute ${ulProps.className ?? ''}`}>
					{Object.values(info.errorMessages).map(msg => (
						<li className="pt-1 text-red-700" key={msg}>
							{msg}
						</li>
					))}
				</ul>
			) : null}
		</div>
	)
}
