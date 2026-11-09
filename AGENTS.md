# Agent notes

## Workflow

- Use `pnpm` only (`pnpm install`, `pnpm run …`). Don't use bun or npm: a second lockfile installs a duplicate React and breaks the app.
- Before committing, run `pnpm run typecheck`, `pnpm run lint`, `pnpm test` and `pnpm run build`.
- Commit messages use Conventional Commits (`feat:`, `fix:`, `chore:`, …).
- `pnpm run dev:mock` starts the app against a built-in fake daemon.

## Icons

Every icon comes from the Central Icon System in Figma
([central-icon-system-v1.35](https://www.figma.com/design/ZLZdIuD9mXZkMwG4GIeqsM/central-icon-system-v1.35)) and lives in
`src/components/icons/index.ts`. Don't add an icon library. `pnpm run lint` rejects lucide-react and similar packages.

To add an icon:

1. Find it on the Icons page of the Figma file. Each icon is a component set named after the icon, with aliases after
   the first comma (e.g. `trash-can, delete, remove`).
2. Export the `filled=off, stroke=2, radius=2, join=round` variant as SVG. With the Figma MCP, `use_figma` can call
   `exportAsync({ format: 'SVG_STRING' })` on that variant.
3. Add it to `index.ts` as `export const PascalName = createIcon('central-name', [...])`. Keep the order of children
   and each child's geometry and caps/joins, camelCase the attributes, drop `stroke="black"` and `stroke-width="2"`
   (the root sets them), and turn `fill="black"` into `currentColor`.
4. Import it from `@/components/icons`. Code from `shadcn add` imports lucide, so swap those for the matching
   Central icon (`XIcon` → `CrossMedium`, `CheckIcon` → `Checkmark1`, `ChevronRightIcon` → `ChevronRightMedium`).

If Central has no icon for something, build it from parts of Central icons (as `PauseCircle` does) and say so in a
comment, rather than drawing one from scratch.

Every icon used in the main app has a hover animation in `src/lib/icon-gestures.ts`, keyed by the icon's Central name, so
a new one needs a gesture too. The settings pages are exempt, and so are the plain close and add icons (`cross-medium`,
`plus-medium`), which are controls rather than things worth acting out. Make it act out what the icon means. Slots point
at the SVG's children by index, so if you swap the drawing behind an animated icon, update the gesture's indexes and
pivots to match. `pnpm test` checks that every gesture starts and ends exactly on the resting drawing.

## Changelog

When you ship a major capability (something a user would notice and care about), add it to
`CHANGELOG.md` in the same change. Don't log small fixes, refactors or styling tweaks.

- Follow the existing Conventional Changelog format: `* **scope:** short description ([hash](commit link))`
  under **Features** or **Bug Fixes**.
- Unreleased work goes under an `## Unreleased` heading at the top. Create it if it's missing.
- Keep entries short and plain, and write them for users rather than developers.
