import { describe, expect, it } from 'vitest'
import { needsAttention, tabStatus } from './favicon'
import { type Torrent, TorrentStatus } from './rpc/types'

const torrent = (overrides: Partial<Torrent>) =>
  ({
    id: 1,
    status: TorrentStatus.Stopped,
    error: 0,
    percentDone: 0,
    sizeWhenDone: 100,
    leftUntilDone: 100,
    rateDownload: 0,
    recheckProgress: 0,
    ...overrides,
  }) as Torrent

describe('tabStatus', () => {
  it('combines progress across downloads', () => {
    const status = tabStatus(
      [
        torrent({ status: TorrentStatus.Downloading, sizeWhenDone: 100, leftUntilDone: 50, rateDownload: 10 }),
        torrent({ status: TorrentStatus.Downloading, sizeWhenDone: 300, leftUntilDone: 250, rateDownload: 5 }),
      ],
      { finished: false, errors: 0 },
    )
    expect(status).toEqual({ kind: 'downloading', progress: 0.25, rate: 15 })
  })

  it('ignores tracker errors on seeding torrents but flags local errors', () => {
    expect(needsAttention(torrent({ status: TorrentStatus.Seeding, error: 2 }))).toBe(false)
    expect(needsAttention(torrent({ status: TorrentStatus.Downloading, error: 2 }))).toBe(true)
    expect(needsAttention(torrent({ error: 3 }))).toBe(true)
  })

  it('shows errors from while you were away ahead of downloads', () => {
    const downloading = torrent({ status: TorrentStatus.Downloading })
    expect(tabStatus([downloading], { finished: false, errors: 2 })).toEqual({ kind: 'error', count: 2 })
  })
})
