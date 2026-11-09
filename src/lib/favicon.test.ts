import { describe, expect, it } from 'vitest'
import { tabStatus } from './favicon'
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
      false,
    )
    expect(status).toEqual({ kind: 'downloading', progress: 0.25, rate: 15 })
  })

  it('ignores tracker errors on seeding torrents but flags local errors', () => {
    expect(tabStatus([torrent({ status: TorrentStatus.Seeding, error: 2 })], false).kind).toBe('idle')
    expect(tabStatus([torrent({ error: 3 })], false)).toEqual({ kind: 'error', count: 1 })
  })
})
