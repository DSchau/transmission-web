# Agent notes

## Workflow

- Use `pnpm` only (`pnpm install`, `pnpm run …`). Don't use bun or npm: a second lockfile installs a duplicate React and breaks the app.
- Before committing, run `pnpm run typecheck`, `pnpm run lint`, `pnpm test` and `pnpm run build`.
- Commit messages use Conventional Commits (`feat:`, `fix:`, `chore:`, …).
- `pnpm run dev:mock` starts the app against a built-in fake daemon.

## Changelog

When you ship a major capability (something a user would notice and care about), add it to
`CHANGELOG.md` in the same change. Don't log small fixes, refactors or styling tweaks.

- Follow the existing Conventional Changelog format: `* **scope:** short description ([hash](commit link))`
  under **Features** or **Bug Fixes**.
- Unreleased work goes under an `## Unreleased` heading at the top. Create it if it's missing.
- Keep entries short and plain, and write them for users rather than developers.
