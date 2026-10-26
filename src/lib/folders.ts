import { useSelector } from '@tanstack/react-store'
import { CATEGORY_INFO, categoryFromFolder, categoryOf } from './category'
import { persistedAtom } from './persisted'
import type { Torrent } from './rpc/types'

/**
 * Folder suggestions for Set Location, ranked by how likely each is to be where the torrent
 * belongs: a folder matching its title (and season), its category's folder, folders recently moved
 * or added to, then the daemon's default. Typing switches to searching every known folder.
 */

export interface FolderSuggestion {
  dir: string
  /** Why it's suggested; omitted for search results. */
  hint?: string
}

const MAX_SUGGESTIONS = 6
const MAX_RECENT = 8

// MARK: Recently used

const recentFoldersAtom = persistedAtom<{ servers: Record<string, string[]> }>('transmission-web.recent-folders', {
  servers: {},
})

const NO_RECENTS: string[] = []

export function useRecentFolders(server: string): string[] {
  return useSelector(recentFoldersAtom, (state) => state.servers[server] ?? NO_RECENTS)
}

/** Records a folder torrents were just moved or added to, most recent first. */
export function rememberFolder(server: string, dir: string) {
  const folder = dir.trim()
  if (!folder) return
  recentFoldersAtom.set((state) => {
    const previous = state.servers[server] ?? []
    const next = [folder, ...previous.filter((d) => d !== folder)].slice(0, MAX_RECENT)
    return { servers: { ...state.servers, [server]: next } }
  })
}

// MARK: Paths

const splitPath = (dir: string) => dir.split(/[\\/]/)
const separatorOf = (dir: string) => (dir.includes('/') || !dir.includes('\\') ? '/' : '\\')
const joinPath = (segments: string[], sep: string) => segments.join(sep) || sep

/** Lowercased words only, so `The.Planets.(2019)` and `The Planets 2019` compare equal. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** A title for matching: normalized, without a trailing year or a leading "the". */
function titleKey(text: string): string {
  return normalize(text)
    .replace(/\s(?:19|20)\d{2}$/, '')
    .replace(/^the\s/, '')
}

/** Every folder and each of its parents (except the filesystem root). */
function withParents(dirs: Iterable<string>): Set<string> {
  const all = new Set<string>()
  for (const dir of dirs) {
    const segments = splitPath(dir)
    const sep = separatorOf(dir)
    for (let i = segments.length; i > 0; i--) {
      const parent = joinPath(segments.slice(0, i), sep)
      if (parent === sep || all.has(parent)) continue
      all.add(parent)
    }
  }
  return all
}

// MARK: Title matching

const EPISODE_TAG =
  /[\s._-]+(?:s(\d{1,2})(?:[\s._-]?e\d{1,3})*|season[\s._-]*(\d{1,2})|(\d{1,2})x\d{2})(?=[\s._)\]-]|$)/i
const RELEASE_TAG =
  /[\s._([-]+(?:(?:19|20)\d{2}|2160p|1080p|720p|480p|4k|uhd|blu-?ray|bdrip|web-?dl|webrip|hdtv|dvdrip|complete)(?=[\s._)\]-]|$)/i

/** The show or movie title (as a match key) and season a release name refers to. */
export function parseRelease(name: string): { title: string; season: number | null } | null {
  const episode = EPISODE_TAG.exec(name)
  const head = episode ? name.slice(0, episode.index) : name.slice(0, RELEASE_TAG.exec(name)?.index ?? name.length)
  const title = titleKey(head)
  if (title.length < 2) return null
  const season = episode ? Number(episode[1] ?? episode[2] ?? episode[3]) : null
  return { title, season }
}

const SEASON_FOLDER = /^(?:season|series|s)[\s._-]*(\d+)$/i

/**
 * The existing folder for this torrent's show or movie, e.g. `/media/TVShows/Severance`, narrowed
 * to its season folder when there is one. A season folder that doesn't exist yet is named after its
 * siblings (`Season 1` → `Season 2`).
 */
export function matchFolder(name: string, dirs: Iterable<string>): string | null {
  const release = parseRelease(name)
  if (!release) return null

  let show: string | null = null
  const children = new Set<string>()
  for (const dir of dirs) {
    const segments = splitPath(dir)
    const index = segments.findIndex(
      (segment, i) => i > 0 && !categoryFromFolder(segment) && titleKey(segment) === release.title,
    )
    if (index < 0) continue
    const folder = joinPath(segments.slice(0, index + 1), separatorOf(dir))
    if (show && folder !== show) continue
    show = folder
    const child = segments[index + 1]
    if (child) children.add(child)
  }
  if (!show || release.season == null) return show

  const sep = separatorOf(show)
  const seasons = [...children].filter((child) => SEASON_FOLDER.test(child))
  const existing = seasons.find((child) => Number(SEASON_FOLDER.exec(child)![1]) === release.season)
  if (existing) return `${show}${sep}${existing}`
  const pattern = seasons[0]
  if (!pattern) return show
  const derived = pattern.replace(/\d+$/, (digits) => String(release.season).padStart(digits.length, '0'))
  return `${show}${sep}${derived}`
}

/** The most used top folder for a category, e.g. `/media/Movies`. */
function categoryFolder(category: string, dirs: string[]): string | null {
  const counts = new Map<string, number>()
  for (const dir of dirs) {
    const segments = splitPath(dir)
    const index = segments.findIndex((segment) => categoryFromFolder(segment) === category)
    if (index < 0) continue
    const root = joinPath(segments.slice(0, index + 1), separatorOf(dir))
    counts.set(root, (counts.get(root) ?? 0) + 1)
  }
  let best: string | null = null
  for (const [root, count] of counts) if (!best || count > counts.get(best)!) best = root
  return best
}

/** The same answer for every torrent, or nothing when they disagree. */
function shared<T>(torrents: Torrent[], pick: (t: Torrent) => T): T | null {
  const values = new Set(torrents.map(pick))
  return values.size === 1 ? [...values][0]! : null
}

// MARK: Search

/** First letters of each word: `Saturday Night Live` → `snl`. */
const initials = (text: string) =>
  normalize(text)
    .split(' ')
    .map((word) => word[0])
    .join('')

function searchScore(dir: string, query: string): number {
  if (/[\\/]/.test(query)) {
    const lower = dir.toLowerCase()
    const q = query.toLowerCase()
    return lower.startsWith(q) ? 3 : lower.includes(q) ? 1 : 0
  }
  const q = normalize(query)
  if (!q) return 0
  const segments = splitPath(dir).filter(Boolean)
  const last = normalize(segments.at(-1) ?? '')
  if (last.startsWith(q)) return 4
  if (segments.some((segment) => normalize(segment).startsWith(q))) return 3
  if (normalize(dir).includes(q)) return 2
  if (q.length >= 2 && !q.includes(' ')) {
    if (initials(segments.at(-1) ?? '').startsWith(q)) return 3
    if (segments.some((segment) => initials(segment).startsWith(q))) return 2
  }
  return 0
}

// MARK: Suggestions

export function suggestFolders({
  torrents,
  dirs,
  recent,
  defaultDir,
  input,
  searching,
}: {
  /** The torrents being moved. */
  torrents: Torrent[]
  /** Every torrent's download folder. */
  dirs: string[]
  recent: string[]
  defaultDir: string
  /** What's in the location field. */
  input: string
  /** Whether the user has typed into the field (rather than it holding a default or a pick). */
  searching: boolean
}): FolderSuggestion[] {
  const current = shared(torrents, (t) => t.downloadDir)
  const typed = input.trim()
  const excluded = (dir: string) => !dir || dir === typed || dir === current

  if (searching && typed) {
    const usage = new Map<string, number>()
    for (const dir of dirs) usage.set(dir, (usage.get(dir) ?? 0) + 1)
    return [...withParents([...dirs, ...recent, defaultDir].filter(Boolean))]
      .filter((dir) => !excluded(dir))
      .map((dir) => ({ dir, score: searchScore(dir, typed) }))
      .filter(({ score }) => score > 0)
      .sort(
        (a, b) => b.score - a.score || (usage.get(b.dir) ?? 0) - (usage.get(a.dir) ?? 0) || a.dir.length - b.dir.length,
      )
      .slice(0, MAX_SUGGESTIONS)
      .map(({ dir }) => ({ dir }))
  }

  const known = [...dirs, ...recent]
  const category = shared(torrents, categoryOf)
  const candidates: FolderSuggestion[] = [
    { dir: shared(torrents, (t) => matchFolder(t.name, known)) ?? '', hint: 'Matches title' },
    {
      dir: (category && category !== 'other' && categoryFolder(category, dirs)) || '',
      hint: category ? `${CATEGORY_INFO[category].title} folder` : undefined,
    },
    ...recent.map((dir) => ({ dir, hint: 'Used recently' })),
    { dir: defaultDir, hint: 'Default folder' },
  ]

  const seen = new Set<string>()
  const suggestions: FolderSuggestion[] = []
  for (const suggestion of candidates) {
    if (excluded(suggestion.dir) || seen.has(suggestion.dir)) continue
    seen.add(suggestion.dir)
    suggestions.push(suggestion)
  }
  return suggestions.slice(0, MAX_SUGGESTIONS)
}
