# Changelog

All notable changes to this project are documented in this file. The format follows
[Conventional Changelog](https://github.com/conventional-changelog/conventional-changelog), and the
project uses [Semantic Versioning](https://semver.org).

## Unreleased

### Features

* **set location:** suggests the folder a torrent belongs in (matching show and season, or its category's folder), plus folders you've recently used, and searches every known folder as you type ([ba4fca2](https://github.com/DSchau/transmission-web/commit/ba4fca2))

## [1.0.0](https://github.com/DSchau/transmission-web/compare/v0.1.0...v1.0.0) (2026-10-20)

### Features

* **themes:** colour themes (GitHub, One, Dracula, Dracula PRO, Catppuccin, Tokyo Night, Solarized, Gruvbox, Nord and High Contrast), each with light and dark versions ([28a02d1](https://github.com/DSchau/transmission-web/commit/28a02d1), [139a083](https://github.com/DSchau/transmission-web/commit/139a083))
* **layout:** frosted glass header that the list scrolls under on phone, tablet and desktop ([6bc8042](https://github.com/DSchau/transmission-web/commit/6bc8042), [d18c071](https://github.com/DSchau/transmission-web/commit/d18c071))
* **layout:** the speed chart folds away while the list is scrolled ([9ea1c49](https://github.com/DSchau/transmission-web/commit/9ea1c49))
* **sidebar:** three states (full, icon-only rail and hidden), switched with `[` ([7d3d838](https://github.com/DSchau/transmission-web/commit/7d3d838))
* **keyboard:** "Skip to torrents" link; in the table, arrows move the highlight, Enter opens, Space selects and Escape backs out one step at a time ([d66f5fe](https://github.com/DSchau/transmission-web/commit/d66f5fe))
* **keyboard:** `1`–`7` pick a filter, `,` opens Settings and Escape leaves it ([b489afd](https://github.com/DSchau/transmission-web/commit/b489afd), [f018b55](https://github.com/DSchau/transmission-web/commit/f018b55))
* **selection:** selected torrents fan out as a stack of cards, in the order you picked them, with a count per category ([09fa9ed](https://github.com/DSchau/transmission-web/commit/09fa9ed), [edb90dd](https://github.com/DSchau/transmission-web/commit/edb90dd))
* **remove:** press and hold to confirm removing several torrents ([43be62e](https://github.com/DSchau/transmission-web/commit/43be62e))
* **search:** `tracker:` filter, e.g. `-tracker:example.org` ([ac4a0bc](https://github.com/DSchau/transmission-web/commit/ac4a0bc))
* **charts:** live speed chart and transfer statistics covering the whole daemon session ([a0f8588](https://github.com/DSchau/transmission-web/commit/a0f8588), [1f5a8e2](https://github.com/DSchau/transmission-web/commit/1f5a8e2))
* **categories:** torrents get a category (movies, TV, books, music or software), shown as an icon and searchable with `type:` ([120860e](https://github.com/DSchau/transmission-web/commit/120860e))
* **search:** filters such as `status:downloading size:>1gb added:30d`, with `-` to exclude a term, kept in the URL ([57a762b](https://github.com/DSchau/transmission-web/commit/57a762b))
* **layout:** resizable sidebar and inspector ([2d00e32](https://github.com/DSchau/transmission-web/commit/2d00e32))
* **mobile:** Add button and an always-visible search field in the phone header ([4202a8f](https://github.com/DSchau/transmission-web/commit/4202a8f))
* **add:** the Add Torrent dialog remembers the last folder used in the session ([bba9f44](https://github.com/DSchau/transmission-web/commit/bba9f44))
* **icons:** icons animate on hover, focus and menu highlight, unless the system asks for reduced motion ([a17c034](https://github.com/DSchau/transmission-web/commit/a17c034))

### Bug Fixes

* **mobile:** adding torrents works on iPhone (the `.torrent` file picker, no zooming in on form fields, drag-and-drop anywhere) ([6a5261e](https://github.com/DSchau/transmission-web/commit/6a5261e))
* **mobile:** tapping anywhere on a torrent card opens it on the first try ([d3139cd](https://github.com/DSchau/transmission-web/commit/d3139cd))
* **mobile:** torrent status and speeds fit on one line that is easy to scan ([a2b2203](https://github.com/DSchau/transmission-web/commit/a2b2203))

## [0.1.0](https://github.com/DSchau/transmission-web/releases/tag/v0.1.0) (2026-10-06)

### Features

* web remote for a Transmission daemon, with layouts for phone (list, then detail), tablet (split view) and desktop (sidebar, table and inspector)
* torrent details: overview, files, peers, trackers and a piece map
* add torrents from a magnet link, a `.torrent` file or drag-and-drop
* pause, resume, verify, move and remove torrents, one at a time or several at once
* connect to this server or another one; sign-in uses a dialog, and passwords are never saved to disk
* dark mode, and a built-in fake daemon for development
