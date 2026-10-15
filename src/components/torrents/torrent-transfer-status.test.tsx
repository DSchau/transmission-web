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

describe('mobile torrent transfer status', () => {
  it('shows progress, size, ETA and both labeled transfer directions independently', () => {
    const html = render()
    for (const text of ['Downloading', '40%', '2 GB of 5 GB', '2m left', 'Download', 'Upload', '8 MB/s', '250 kB/s']) {
      expect(html).toContain(text)
    }
    expect(html).toContain('aria-valuenow="40"')
  })

  it('keeps both speed fields visible when an active transfer stalls', () => {
    const html = render({ rateDownload: 0, rateUpload: 0, eta: -1 })
    expect(html.match(/0 kB\/s/g)).toHaveLength(2)
    expect(html).not.toContain('left</span>')
  })

  it.each([-1, -2])('omits an unavailable ETA (%s)', (eta) => {
    expect(render({ eta })).not.toContain('left</span>')
  })

  it('shows size and ratio while seeding, without a remaining-time label', () => {
    const html = render({ status: TorrentStatus.Seeding, percentDone: 1, leftUntilDone: 0, rateDownload: 0 })
    expect(html).toContain('Seeding')
    expect(html).toContain('5 GB · Ratio 0.25')
    expect(html).toContain('100%')
    expect(html).toContain('250 kB/s')
    expect(html).not.toContain('left</span>')
  })

  it.each([TorrentStatus.Stopped, TorrentStatus.DownloadWait, TorrentStatus.SeedWait])(
    'does not clutter inactive rows with zero-speed fields (status %s)',
    (status) => {
      const html = render({ status, rateDownload: 0, rateUpload: 0 })
      expect(html).not.toContain('kB/s')
      expect(html).not.toContain('left</span>')
    },
  )

  it('shows metadata progress instead of byte progress or an unreliable ETA', () => {
    const html = render({ metadataPercentComplete: 0.25 })
    expect(html).toContain('Fetching metadata')
    expect(html).toContain('aria-valuenow="25"')
    expect(html).toContain('Waiting for torrent information')
    expect(html).not.toContain('2 GB of 5 GB')
    expect(html).not.toContain('left</span>')
  })

  it.each([TorrentStatus.Checking, TorrentStatus.CheckWait])('shows verification progress (status %s)', (status) => {
    const html = render({ status, recheckProgress: 0.7, rateDownload: 0, rateUpload: 0 })
    expect(html).toContain('Verifying')
    expect(html).toContain('aria-valuenow="70"')
    expect(html).toContain('Checking local data')
    expect(html).not.toContain('kB/s')
  })

  it('retains the full error separately from transfer details', () => {
    const errorString = 'Tracker could not be reached at https://tracker.example.org/announce; please try again later.'
    const html = render({ error: 2, errorString })
    expect(html).toContain('Error')
    expect(html).toContain(errorString)
    expect(html).toContain('2 GB of 5 GB')
    expect(html).not.toContain('left</span>')
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
    expect(html).toContain('5 GB · Ratio 0.25')
    expect(html).not.toContain('kB/s')
  })
})
