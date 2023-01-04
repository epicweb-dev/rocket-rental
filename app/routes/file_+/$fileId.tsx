import type { DataFunctionArgs } from '@remix-run/node'
import { imageDb } from '~/utils/image.server'

export async function loader({ params }: DataFunctionArgs) {
	const image = imageDb
		.prepare(/* sql */ `SELECT * FROM "Image" WHERE id = @id`)
		.get({ id: params.fileId })

	if (!image) throw new Response('Not found', { status: 404 })

	return new Response(image.blob, {
		headers: { 'Content-Type': image.contentType },
	})
}
