/// <reference types="bun" />
import { describe, expect, it } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { type Torrent, TorrentStatus } from '../../lib/rpc/types'
import { TorrentTransferStatus } from './torrent-transfer-status'

const torrent: Torrent = {
  id: 1,
  name: 'Ubuntu desktop image.iso',
  status: TorrentStatus.Downloading,
  percentDone: 0.4,
  metadataPercentComplete: 1,
  recheckProgress: 0,
  rateDownload: 8_000_000,
  rateUpload: 250_000,
  eta: 120,
  totalSize: 5_000_000_000,
  sizeWhenDone: 5_000_000_000,
  leftUntilDone: 3_000_000_000,
  uploadedEver: 500_000_000,
  downloadedEver: 2_000_000_000,
  uploadRatio: 0.25,
  error: 0,
  errorString: '',
  addedDate: 1,
  doneDate: 0,
  queuePosition: 0,
  isFinished: false,
  peersConnected: 10,
  peersSendingToUs: 4,
  peersGettingFromUs: 2,
  downloadDir: '/downloads',
  hashString: 'abc',
}

function render(patch: Partial<Torrent> = {}) {
  return renderToStaticMarkup(<TorrentTransferStatus torrent={{ ...torrent, ...patch }} />)
}

const RATE = /kB\/s|MB\/s/

describe('mobile torrent transfer status', () => {
  it('shows state, percent, ETA and both rates on one line', () => {
    const html = render()
    for (const text of ['Downloading', '40% · 2m', '8 MB/s', '250 kB/s']) expect(html).toContain(text)
    expect(html).toContain('aria-valuenow="40"')
  })

  it('hides rates entirely when there is no transfer activity', () => {
    const html = render({ rateDownload: 0, rateUpload: 0 })
    expect(html).not.toMatch(RATE)
    expect(html).toContain('40% · 2m')
  })

  it('shows only the active direction, keeping the idle slot reserved', () => {
    const html = render({ status: TorrentStatus.Seeding, percentDone: 1, leftUntilDone: 0, rateDownload: 0 })
    expect(html).toContain('Seeding')
    expect(html).toContain('Ratio 0.25')
    expect(html).toContain('250 kB/s')
    expect(html.match(/[kM]B\/s/g)).toHaveLength(1)
    expect(html).toContain('aria-hidden="true"')
  })

  it.each([-1, -2])('omits an unavailable ETA (%s)', (eta) => {
    const html = render({ eta })
    expect(html).toContain('40%</span>')
    expect(html).not.toContain('40% ·')
  })

  it.each([TorrentStatus.Stopped, TorrentStatus.DownloadWait, TorrentStatus.SeedWait])(
    'shows no rates or ETA for inactive rows (status %s)',
    (status) => {
      const html = render({ status, rateDownload: 0, rateUpload: 0 })
      expect(html).not.toMatch(RATE)
      expect(html).not.toContain('2m')
    },
  )

  it('shows metadata progress without an unreliable ETA', () => {
    const html = render({ metadataPercentComplete: 0.25, rateDownload: 0, rateUpload: 0 })
    expect(html).toContain('Fetching metadata')
    expect(html).toContain('aria-valuenow="25"')
    expect(html).toContain('25%')
    expect(html).not.toContain('2m')
  })

  it.each([TorrentStatus.Checking, TorrentStatus.CheckWait])('shows verification progress (status %s)', (status) => {
    const html = render({ status, percentDone: 1, recheckProgress: 0.7, rateDownload: 0, rateUpload: 0 })
    expect(html).toContain('Verifying')
    expect(html).toContain('70%')
    expect(html).not.toContain('Ratio')
    expect(html).not.toMatch(RATE)
  })

  it('shows the error in place of progress details', () => {
    const errorString = 'Tracker gave HTTP response code 404 (Not Found)'
    const html = render({ error: 2, errorString })
    expect(html).toContain('Error')
    expect(html).toContain(errorString)
    expect(html).toContain('text-status-error')
    expect(html).not.toContain('2m')
  })

  it('distinguishes a finished seed from a paused download', () => {
    const html = render({
      status: TorrentStatus.Stopped,
      isFinished: true,
      percentDone: 1,
      rateDownload: 0,
      rateUpload: 0,
    })
    expect(html).toContain('Seeding complete')
    expect(html).toContain('Ratio 0.25')
    expect(html).not.toMatch(RATE)
  })
})
