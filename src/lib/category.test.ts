import { describe, expect, test } from 'bun:test'
import { categoryFromFolder, categoryFromName } from './category'
import type { Torrent } from './rpc/types'
import { compileTorrentQuery } from './torrent'

describe('categoryFromFolder', () => {
  test.each([
    ['/media/Books', 'books'],
    ['/media/Series', 'tv'],
    ['/media/TVShows', 'tv'],
    ['/media/TV Shows/The Expanse', 'tv'],
    ['/media/Movies', 'movies'],
    ['D:\\Media\\Music', 'music'],
  ])('%s → %s', (dir, expected) => {
    expect(categoryFromFolder(dir)).toBe(expected as never)
  })

  test('unknown folders are not categorized', () => {
    expect(categoryFromFolder('/downloads/complete')).toBeNull()
  })
})

describe('categoryFromName', () => {
  test.each([
    ['The Expanse S03E07 1080p WEB-DL', 'tv'],
    ['Planet Earth II S01 2160p', 'tv'],
    ['Sintel (2010) 1080p', 'movies'],
    ['Big Buck Bunny 4K', 'movies'],
    ['Project Gutenberg Top 100 (EPUB)', 'books'],
    ['Some Artist - Discography [FLAC]', 'music'],
    ['ubuntu-24.04.1-desktop-amd64.iso', 'software'],
  ])('%s → %s', (name, expected) => {
    expect(categoryFromName(name)).toBe(expected as never)
  })

  test('plain names are not categorized', () => {
    expect(categoryFromName('Wikipedia en All Maxi 2024-01 (zim)')).toBeNull()
  })
})

describe('type: search', () => {
  const torrent = (name: string, downloadDir: string) => ({ name, downloadDir }) as Torrent
  const show = torrent('Planet Earth II', '/media/TVShows')
  const movie = torrent('Sintel (2010) 1080p', '/downloads')

  test('matches the inferred category, with aliases', () => {
    expect(compileTorrentQuery('type:tv').test(show)).toBe(true)
    expect(compileTorrentQuery('category:series').test(show)).toBe(true)
    expect(compileTorrentQuery('type:tv').test(movie)).toBe(false)
    expect(compileTorrentQuery('-type:movies').test(movie)).toBe(false)
  })
})
