import { test } from 'vitest'
import { faker } from '@faker-js/faker'
import { render, screen } from '@testing-library/react'
import { unstable_createRemixStub as createRemixStub } from '@remix-run/testing'
import { UserProfileBasicInfo } from './__shared'
import invariant from 'tiny-invariant'

function setup(
	props?: Partial<React.ComponentProps<typeof UserProfileBasicInfo>>,
) {
	const user = {
		imageId: faker.datatype.uuid(),
		username: faker.internet.userName(),
		name: faker.name.fullName(),
	}
	const App = createRemixStub([
		{
			path: '/users/:username/host',
			element: (
				<UserProfileBasicInfo
					user={user}
					rating={null}
					userJoinedDisplay={new Date().toLocaleDateString()}
					userLoggedIn={false}
					isSelf={false}
					oneOnOneChatId={null}
					stats={[]}
					bio={null}
					{...props}
				/>
			),
		},
	])
	const routeUrl = `/users/${user}/host`
	render(<App initialEntries={[routeUrl]} />)
	return { routeUrl }
}

test('Link to chat is a form if user is logged in, is not self, and no chat exists yet', async () => {
	const { routeUrl } = setup({
		isSelf: false,
		userLoggedIn: true,
		oneOnOneChatId: null,
	})
	const startChatButton = await screen.findByRole('button', {
		name: /message/i,
	})
	expect(startChatButton).toHaveAttribute('title', 'Start new chat')
	invariant(
		startChatButton instanceof HTMLButtonElement,
		'startChatButton is not a button',
	)
	expect(startChatButton.form).toHaveAttribute('action', routeUrl)
	expect(startChatButton.form).toHaveAttribute('method', 'post')
})

test('Link to chat is link to specific chat if logged in, not self, and there is a history', async () => {
	const oneOnOneChatId = faker.datatype.uuid()
	setup({ isSelf: false, userLoggedIn: true, oneOnOneChatId })
	const chatLink = await screen.findByRole('link', {
		name: /message/i,
	})
	expect(chatLink).toHaveAttribute('href', `/chats/${oneOnOneChatId}`)
})

test('Link to chat is link to all chats if viewing it myself along with edit profile link', async () => {
	setup({ isSelf: true, userLoggedIn: true, oneOnOneChatId: null })
	const myChatLink = await screen.findByRole('link', {
		name: /my chat/i,
	})
	expect(myChatLink).toHaveAttribute('href', '/chats')
	const editProfileLink = await screen.findByRole('link', {
		name: /edit profile/i,
	})
	expect(editProfileLink).toHaveAttribute('href', '/settings/profile')
})

test('Link to chat is links to login if user is not logged in', async () => {
	const { routeUrl } = setup({
		isSelf: false,
		userLoggedIn: false,
		oneOnOneChatId: null,
	})
	const messageLink = await screen.findByRole('link', {
		name: /message/i,
	})
	expect(messageLink).toHaveAttribute(
		'href',
		`/login?${new URLSearchParams({ redirectTo: routeUrl })}`,
	)
})
