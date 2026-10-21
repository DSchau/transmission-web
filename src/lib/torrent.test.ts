import { describe, expect, it } from 'bun:test'
import type { Torrent } from './rpc/types'
import { compileTorrentQuery } from './torrent'

describe('tracker: search', () => {
  const torrent = {
    name: 'Movie',
    trackers: [{ announce: 'https://please.passthepopcorn.me/abc123/announce' }],
  } as Torrent
  const matches = (query: string) => compileTorrentQuery(query).test(torrent)

  it('matches the host:port form the Trackers tab shows', () => {
    expect(matches('tracker:https://please.passthepopcorn.me:443')).toBe(true)
    expect(matches('-tracker:https://please.passthepopcorn.me:443')).toBe(false)
  })

  it('matches parts of the announce URL', () => {
    expect(matches('tracker:passthepopcorn')).toBe(true)
    expect(matches('-tracker:other.org')).toBe(true)
  })
})
