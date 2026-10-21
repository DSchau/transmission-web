# Changelog

## 1.0.0 — October 20, 2026

### Themes
- Pick a colour theme in Settings or the More menu: GitHub, One, Dracula, Dracula PRO, Catppuccin, Tokyo Night, Solarized, Gruvbox, Nord and High Contrast. Each has a light and a dark version.

### Layout
- The header is now frosted glass, and the list scrolls underneath it on phone, tablet and desktop.
- The speed chart folds away while you scroll and comes back when you return to the top.
- The sidebar has three states: full, an icon-only rail with tooltips, and hidden. Press `[` to switch between them.
- The status strip has a cleaner status-bar look.

### Keyboard
- A "Skip to torrents" link is the first Tab stop.
- In the table, arrow keys move the highlight, Enter opens a torrent, Space selects it, and Escape backs out one step at a time.
- Number keys `1`–`7` pick a filter, `,` opens Settings, and Escape leaves it.

### Selecting and removing
- When you select several torrents, they fan out as a stack of cards, one per torrent, with a count for each category.
- To remove several torrents at once, you press and hold the button. The dialog shows what will be removed and how much disk space is freed.

### Search
- Search by tracker with `tracker:`, for example `-tracker:example.org` to hide one tracker's torrents.

### Polish
- Icons animate when you hover over them, focus them or highlight them in a menu, unless your system asks for reduced motion.
- The Add Torrent dialog remembers the last folder you used for the rest of the session.

## October 19, 2026

- A live speed chart and transfer statistics that cover the whole daemon session.

## October 16, 2026

- Torrents get a category (movies, TV, books, music, software) based on their folder and name, shown as an icon and searchable with `type:`.
