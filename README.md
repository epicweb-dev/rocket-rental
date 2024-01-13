# Rocket Rental

Let's launch together!

> This is no longer actively maintained. If you want an up-to-date example of a Remix app that builds on top of what was done here, check [the Epic Stack](https://github.com/epicweb-dev/epic-stack).

## Development

- Initial setup:

  ```sh
  npm run setup
  ```

- Start dev server:

  ```sh
  npm run dev
  ```

This starts your app in development mode, rebuilding assets on file changes.

The database seed script creates a new user with some data you can use to get
started:

- Email: `kody@kcd.dev`
- Password: `kodylovesyou`

### Connecting to your database

The sqlite database lives at `/data/sqlite.db` in the deployed application. You
can connect to the live database by running `fly ssh console -C database-cli`.

## GitHub Actions

We use GitHub Actions for continuous integration and deployment. Anything that
gets into the `main` branch will be deployed to production after running
tests/build/etc. Anything in the `dev` branch will be deployed to staging.

## Testing

### Playwright

We use Playwright for our End-to-End tests in this project. You'll find those in
the `tests` directory. As you make changes, add to an existing file or create a
new file in the `tests` directory to test your changes.

To run these tests in development, run `npm run test:e2e:dev` which will start
the dev server for the app and run Playwright on it.

We have a fixture for testing authenticated features without having to go
through the login flow:

```ts
test('my test', async ({ page, login }) => {
	const user = await login()
	// you are now logged in
})
```

We also auto-delete the user at the end of your test. That way, we can keep your
local db clean and keep your tests isolated from one another.

### Vitest

For lower level tests of utilities and individual components, we use `vitest`.
We have DOM-specific assertion helpers via
[`@testing-library/jest-dom`](https://testing-library.com/jest-dom).

### Type Checking

This project uses TypeScript. It's recommended to get TypeScript set up for your
editor to get a really great in-editor experience with type checking and
auto-complete. To run type checking across the whole project, run
`npm run typecheck`.

### Linting

This project uses ESLint for linting. That is configured in `.eslintrc.js`.

### Formatting

We use [Prettier](https://prettier.io/) for auto-formatting in this project.
It's recommended to install an editor plugin (like the
[VSCode Prettier plugin](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode))
to get auto-formatting on save. There's also a `npm run format` script you can
run to format all files in the project.
