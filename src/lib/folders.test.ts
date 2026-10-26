import { describe, expect, test } from 'bun:test'
import { matchFolder, parseRelease, suggestFolders } from './folders'
import type { Torrent } from './rpc/types'

const DIRS = [
  '/media/TVShows/Severance/Season 1',
  '/media/Books',
  '/media/TVShows/Saturday Night Live/Season 46',
  '/media/TVShows/The Planets (2019)/Season 1',
  '/media/TVShows/Nathan for You/Season 2',
  '/media/Movies',
  '/media/Movies',
]

const torrent = (name: string, downloadDir = '/downloads') => ({ name, downloadDir }) as Torrent

describe('parseRelease', () => {
  test.each([
    ['Severance.S02E03.1080p.WEB.H264', 'severance', 2],
    ['The.Planets.2019.S01E02.720p', 'planets', 1],
    ['Saturday Night Live - Season 47 Complete', 'saturday night live', 47],
    ['Obsession.2025.720p.BluRay.DD+5.1.x264-playHD.mkv', 'obsession', null],
  ])('%s', (name, title, season) => {
    expect(parseRelease(name)).toEqual({ title, season })
  })
})

describe('matchFolder', () => {
  test('existing season folder', () => {
    expect(matchFolder('Severance.S01E09.1080p', DIRS)).toBe('/media/TVShows/Severance/Season 1')
  })

  test('next season is named after its siblings', () => {
    expect(matchFolder('Severance.S02E01.1080p', DIRS)).toBe('/media/TVShows/Severance/Season 2')
    expect(matchFolder('The.Planets.2019.S02E01', DIRS)).toBe('/media/TVShows/The Planets (2019)/Season 2')
  })

  test('unknown titles and category folders do not match', () => {
    expect(matchFolder('Some.Other.Show.S01E01', DIRS)).toBeNull()
    expect(matchFolder('Movies.2020.1080p', DIRS)).toBeNull()
  })
})

describe('suggestFolders', () => {
  const base = { dirs: DIRS, recent: [], defaultDir: '/downloads', input: '/downloads', searching: false }

  test('title match, then category folder, then recents and default', () => {
    const suggestions = suggestFolders({
      ...base,
      torrents: [torrent('Severance.S02E01.1080p')],
      recent: ['/media/Books'],
      defaultDir: '/media/incoming',
    })
    expect(suggestions).toEqual([
      { dir: '/media/TVShows/Severance/Season 2', hint: 'Matches title' },
      { dir: '/media/TVShows', hint: 'TV Shows folder' },
      { dir: '/media/Books', hint: 'Used recently' },
      { dir: '/media/incoming', hint: 'Default folder' },
    ])
  })

  test('movies go to the movies folder; the current folder is left out', () => {
    expect(suggestFolders({ ...base, torrents: [torrent('Obsession.2025.720p.BluRay')] })[0]).toEqual({
      dir: '/media/Movies',
      hint: 'Movies folder',
    })
    expect(suggestFolders({ ...base, torrents: [torrent('Obsession.2025.720p.BluRay', '/media/Movies')] })).toEqual([])
  })

  test('typing searches every known folder, including initials', () => {
    const search = (input: string) =>
      suggestFolders({ ...base, torrents: [torrent('x')], input, searching: true }).map((s) => s.dir)
    expect(search('snl')).toEqual([
      '/media/TVShows/Saturday Night Live',
      '/media/TVShows/Saturday Night Live/Season 46',
    ])
    expect(search('saturday')[0]).toBe('/media/TVShows/Saturday Night Live')
  })
})
