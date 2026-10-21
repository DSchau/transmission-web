# Agent notes

## Workflow

- Use `bun` only (`bun install`, `bun run …`). Don't use pnpm or npm: a second lockfile installs a duplicate React and breaks the app.
- Before committing, run `bun run typecheck`, `bun run lint`, `bun test` and `bun run build`.
- Commit messages use Conventional Commits (`feat:`, `fix:`, `chore:`, …).
- `bun run dev:mock` starts the app against a built-in fake daemon.

## Changelog

When you ship a major capability (something a user would notice and care about), add it to
`CHANGELOG.md` in the same change. Don't log small fixes, refactors or styling tweaks.

- Follow the existing Conventional Changelog format: `* **scope:** short description ([hash](commit link))`
  under **Features** or **Bug Fixes**.
- Unreleased work goes under an `## Unreleased` heading at the top. Create it if it's missing.
- Keep entries short and plain, and write them for users rather than developers.
