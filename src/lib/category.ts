import { BookOpen, Clapperboard, Disc3, File, type LucideIcon, Music, Tv } from 'lucide-react'
import type { Torrent } from './rpc/types'

/**
 * What kind of thing a torrent is. Transmission has no such field, so it is inferred: first from
 * the download folder (`/media/Movies`, `/media/TVShows`, …), then from the name
 * (`S01E02`, `1080p`, `.epub`, `.iso`, …).
 */
export const CATEGORIES = ['movies', 'tv', 'books', 'music', 'software', 'other'] as const
export type TorrentCategory = (typeof CATEGORIES)[number]

export const CATEGORY_INFO: Record<TorrentCategory, { title: string; icon: LucideIcon; text: string }> = {
  movies: { title: 'Movies', icon: Clapperboard, text: 'text-rose-500' },
  tv: { title: 'TV Shows', icon: Tv, text: 'text-violet-500' },
  books: { title: 'Books', icon: BookOpen, text: 'text-amber-600 dark:text-amber-500' },
  music: { title: 'Music', icon: Music, text: 'text-emerald-600 dark:text-emerald-500' },
  software: { title: 'Software', icon: Disc3, text: 'text-sky-600 dark:text-sky-500' },
  other: { title: 'Other', icon: File, text: 'text-muted-foreground' },
}

/** Folder names (lowercased, letters and digits only) that identify a category. */
const FOLDER_CATEGORIES: Record<string, TorrentCategory> = {
  movies: 'movies',
  movie: 'movies',
  films: 'movies',
  film: 'movies',
  tv: 'tv',
  tvshows: 'tv',
  tvseries: 'tv',
  shows: 'tv',
  series: 'tv',
  anime: 'tv',
  books: 'books',
  ebooks: 'books',
  audiobooks: 'books',
  comics: 'books',
  music: 'music',
  albums: 'music',
  software: 'software',
  apps: 'software',
  isos: 'software',
  games: 'software',
}

/** Name patterns, checked in order: an episode tag beats a resolution tag. */
const NAME_PATTERNS: readonly [RegExp, TorrentCategory][] = [
  [/\bS\d{1,2}(?:E\d{1,3})?\b|\bseason\s*\d+\b|\bcomplete series\b/i, 'tv'],
  [/\.(?:epub|mobi|azw3?|cbz|cbr)$|\b(?:epub|mobi|ebook|audiobook)\b/i, 'books'],
  [/\.(?:flac|mp3|m4a)$|\b(?:flac|mp3|320kbps|discography)\b/i, 'music'],
  [/\.(?:iso|img|dmg|exe|msi|deb|rpm)$|\b(?:x86_64|amd64|arm64|aarch64|installer|netinst)\b/i, 'software'],
  [
    /\b(?:2160p|1080p|720p|480p|4k|bluray|blu-ray|bdrip|web-?dl|webrip|hdr|x26[45]|hevc)\b|\((?:19|20)\d{2}\)/i,
    'movies',
  ],
]

export function categoryFromFolder(downloadDir: string): TorrentCategory | null {
  const segments = downloadDir.split(/[\\/]/).reverse()
  for (const segment of segments) {
    const category = FOLDER_CATEGORIES[segment.toLowerCase().replace(/[^a-z0-9]/g, '')]
    if (category) return category
  }
  return null
}

export function categoryFromName(name: string): TorrentCategory | null {
  for (const [pattern, category] of NAME_PATTERNS) if (pattern.test(name)) return category
  return null
}

// Torrent objects are structurally shared between polls, so unchanged ones hit the cache.
const cache = new WeakMap<Torrent, TorrentCategory>()

export function categoryOf(t: Torrent): TorrentCategory {
  let category = cache.get(t)
  if (!category) {
    category = categoryFromFolder(t.downloadDir) ?? categoryFromName(t.name) ?? 'other'
    cache.set(t, category)
  }
  return category
}
