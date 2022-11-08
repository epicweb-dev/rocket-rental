import { EventEmitter } from 'events'

export const EVENTS = {
	NEW_MESSAGE: 'NEW_MESSAGE',
}

export let chatEmitter: EventEmitter

declare global {
	var __chat_emitter__: EventEmitter
}

// this is needed because in development we don't want to restart
// the server with every change, but we want to make sure we don't
// create a new event emitter with every change either.
if (process.env.NODE_ENV === 'production') {
	chatEmitter = new EventEmitter()
} else {
	if (!global.__chat_emitter__) {
		global.__chat_emitter__ = new EventEmitter()
	}
	chatEmitter = global.__chat_emitter__
}
