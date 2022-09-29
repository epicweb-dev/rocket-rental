import type { LoaderArgs } from '@remix-run/node'
import { redirect } from '@remix-run/node'
import { prisma } from '~/db.server'
import { authenticator, requireUserId } from '~/services/auth.server'

export async function loader({ request }: LoaderArgs) {
	const userId = await requireUserId(request)
	const user = await prisma.user.findUnique({ where: { id: userId } })
	if (!user) {
		const requestUrl = new URL(request.url)
		const loginParams = new URLSearchParams([
			['redirectTo', `${requestUrl.pathname}${requestUrl.search}`],
		])
		const redirectTo = `/login?${loginParams}`
		await authenticator.logout(request, { redirectTo })
		return redirect(redirectTo)
	}
	return redirect(`/users/${user.username}`)
}
