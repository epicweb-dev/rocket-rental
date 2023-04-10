import dns from 'dns'
import fs from 'fs'
import fsExtra from 'fs-extra'
import path from 'path'

let connected: boolean | null = null

export async function isConnectedToTheInternet() {
	if (connected === null) {
		connected = await new Promise(resolve => {
			dns.lookupService('8.8.8.8', 53, err => {
				resolve(!err)
			})
		})
	}
	return connected
}

const fixturesDirPath = path.join(__dirname, `./fixtures`)

export async function readFixture(subdir: string, name: string) {
	return JSON.parse(
		await fs.promises.readFile(
			path.join(fixturesDirPath, subdir, `${name}.json`),
			'utf8',
		),
	)
}

export async function createFixture(
	subdir: string,
	name: string,
	data: unknown,
) {
	const dir = path.join(fixturesDirPath, subdir)
	await fsExtra.ensureDir(dir)
	return fs.promises.writeFile(
		path.join(dir, `./${name}.json`),
		JSON.stringify(data, null, 2),
	)
}

export function requiredParam(params: URLSearchParams, param: string) {
	if (!params.get(param)) {
		const paramsString = JSON.stringify(
			Object.fromEntries(params.entries()),
			null,
			2,
		)
		throw new Error(
			`Param "${param}" required, but not found in ${paramsString}`,
		)
	}
}

export function requiredHeader(headers: Headers, header: string) {
	if (!headers.get(header)) {
		const headersString = JSON.stringify(
			Object.fromEntries(headers.entries()),
			null,
			2,
		)
		throw new Error(
			`Header "${header}" required, but not found in ${headersString}`,
		)
	}
}

export function requiredProperty(
	object: { [key: string]: unknown },
	property: string,
) {
	if (!object[property]) {
		const objectString = JSON.stringify(object)
		throw new Error(
			`Property "${property}" required, but not found in ${objectString}`,
		)
	}
}
