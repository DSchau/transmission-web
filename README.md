# Transmission for the Web

A lightweight, responsive remote for a [Transmission](https://transmissionbt.com) daemon — a web
sibling of `../transmission-ios`. Works on phones (list → pushed detail), tablets (split view) and
desktops (sidebar + table + inspector).

Built with React 19, Vite, TanStack Router (file-based, hash history), Query (polling + optimistic
updates), Table v9 + Virtual (one headless table rendered as a table or as cards), Form, and Store;
Tailwind v4 + shadcn/ui (Radix).

## Search queries

Plain words match torrent names; structured terms narrow further. Terms combine (all must match),
a leading `-` excludes:

```
ubuntu status:downloading          words + status
size:>1gb added:30d progress:<50%   comparisons
ratio:<0.5 -status:seeding           exclusions
name:"ubuntu 24"                     quoted phrase
```

Fields: `name` `status` `size` `progress` `ratio` `added` `done` `down` `up` `peers` `seeders`
`leechers` `uploaded` `downloaded` `error` `dir`. Sizes take `kb/mb/gb/tb` (1024-based),
dates take `30d`, `2w`, `1m`, `1y` or `2024-01-01`, ops are `: = != < <= > >=`. The `?` button
in the search field shows the full cheat sheet; malformed terms are skipped (never empty the
list) with a warning explaining what it didn't understand. Queries live in the URL (`?q=`),
so they survive reloads and can be shared.

## Develop

```sh
bun install
bun run dev:mock     # fake daemon built into the dev server (MOCK_COUNT=1600, MOCK_AUTH=user:pass)
bun run dev          # proxies /transmission/rpc to TRANSMISSION_URL (default http://localhost:9091)
```

To use a real daemon while developing, either set `TRANSMISSION_URL=http://192.168.0.250:9091` and
keep **This server**, or pick **Another server** in Connection settings. In `vite dev`, requests to
another origin are forwarded by the dev server (`dev/rpc-proxy.ts`), so the daemon needs no CORS setup.

`bun run build` · `bun run lint` · `bun run typecheck`

## Deploy

The build is static, uses relative asset paths and hash routing, so it runs from any folder. The
simplest setup is to serve it as Transmission's own web UI (same origin → no CORS, and the browser
handles sign-in):

```sh
bun run build
TRANSMISSION_WEB_HOME=/path/to/dist transmission-daemon   # or copy dist/ into the web folder
```

For the NUC, `scripts/deploy.sh` builds and ships `dist/` over SSH into `/opt/transmission-web/current`. Updates
go live without restarting the daemon, and `--rollback` switches back to the previous build. One-time setup is in
`../htpc/TRANSMISSION-WEB.md`.

Connecting to a daemon on another origin works from **Connection** settings, but that server must
allow CORS (including exposing `X-Transmission-Session-Id`). A reverse proxy serving both avoids it.

## Credentials

Never written to localStorage. Same-origin, the browser's own Basic Auth prompt is used. Otherwise
a sign-in dialog keeps the password in memory, or — if you opt in — in `sessionStorage` for that tab
only. Forms use `autocomplete` so password managers can fill them.

## Layout

```
dev/                   dev-server RPC forwarder (no CORS needed in `vite dev`)
mock/                  fake daemon (Vite plugin) — port of the iOS tools/mock-transmission.py
src/lib/rpc/           client (session-id handshake, basic auth) + wire types
src/lib/               queries, mutations (+ PendingChanges reconciliation), stores, formatting
src/routes/            /  /torrents/$id  /settings  /connect  (list state lives in the URL)
src/components/        torrents/ (layout, table, cards, menus), detail/, dialogs/, settings/, ui/
```
