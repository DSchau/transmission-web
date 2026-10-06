/**
 * In-memory fake Transmission daemon for UI development (a TypeScript port of the iOS
 * project's `tools/mock-transmission.py`, plus piece bitfields, files, and more methods).
 *
 * Rates jitter on every `torrent-get` so the UI has something to animate, and
 * `torrent-stop` is applied after a delay like a real daemon, so stale-poll races
 * (and the optimistic-update reconciliation) can be reproduced.
 */

type Json = Record<string, unknown>

interface MockFile {
  name: string
  length: number
  bytesCompleted: number
  wanted: boolean
  priority: number
}

interface MockTorrent {
  id: number
  name: string
  status: number
  percentDone: number
  metadataPercentComplete: number
  recheckProgress: number
  rateDownload: number
  rateUpload: number
  eta: number
  totalSize: number
  sizeWhenDone: number
  leftUntilDone: number
  uploadedEver: number
  downloadedEver: number
  uploadRatio: number
  error: number
  errorString: string
  addedDate: number
  doneDate: number
  queuePosition: number
  isFinished: boolean
  peersConnected: number
  peersSendingToUs: number
  peersGettingFromUs: number
  downloadDir: string
  hashString: string
  comment: string
  creator: string
  dateCreated: number
  pieceCount: number
  pieceSize: number
  magnetLink: string
  isPrivate: boolean
  // Internal state, projected into wire fields on read.
  _pieces: Uint8Array
  _files: MockFile[]
  _verifyUntil: number
}

const now = () => Math.floor(Date.now() / 1000)
const START = now()
const PIECE_SIZE = 4 << 20

// Small deterministic PRNG so the library looks the same on every restart.
let seed = 42
function random() {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}
const randInt = (min: number, max: number) => Math.floor(min + random() * (max - min + 1))
const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)] as T

const session: Json = {
  version: '4.0.6 (mock)',
  'rpc-version': 17,
  'rpc-version-minimum': 14,
  'download-dir': '/downloads/complete',
  'start-added-torrents': true,
  'alt-speed-enabled': false,
  'alt-speed-down': 500,
  'alt-speed-up': 100,
  'speed-limit-down-enabled': false,
  'speed-limit-down': 10000,
  'speed-limit-up-enabled': true,
  'speed-limit-up': 2000,
  seedRatioLimited: false,
  seedRatioLimit: 2,
}

const SEED_NAMES = [
  'ubuntu-24.04.1-desktop-amd64.iso',
  'debian-12.7.0-amd64-netinst.iso',
  'Big Buck Bunny (2008) 4K',
  'archlinux-2024.10.01-x86_64.iso',
  'Sintel (2010) 1080p',
  'Fedora-Workstation-Live-x86_64-41',
  'Tears of Steel (2012) 4K HDR',
  'linuxmint-22-cinnamon-64bit.iso',
  'Elephants Dream (2006) 1080p',
  'Wikipedia en All Maxi 2024-01 (zim)',
  'FreeBSD-14.1-RELEASE-amd64-dvd1.iso',
  'Cosmos Laundromat (2015) 2K',
  'kali-linux-2024.3-installer-amd64.iso',
  'Project Gutenberg Top 100 (EPUB)',
  'NASA Apollo 11 Mission Audio',
]
const EXTRA_WORDS = ['Archive', 'Collection', 'Dataset', 'Remaster', 'Bundle', 'Pack', 'Edition', 'Mirror']
const CLIENTS = ['qBittorrent 4.6.5', 'Transmission 4.0.6', 'Deluge 2.1.1', 'libtorrent 2.0.10', 'µTorrent 3.6']
const TRACKERS = ['tracker.example.org:443', 'open.tracker.example:6969', 'announce.example.net:80']

/** Pieces filled mostly front-to-back with some gaps, so the piece map has texture. */
function makePieces(count: number, done: number): Uint8Array {
  const bytes = new Uint8Array(Math.ceil(count / 8))
  for (let i = 0; i < count; i++) {
    const position = i / count
    const have = done >= 1 || (position < done ? random() < 0.92 : random() < done * 0.15)
    if (have) bytes[i >> 3]! |= 0x80 >> (i & 7)
  }
  return bytes
}

function haveCount(t: MockTorrent): number {
  let have = 0
  for (let i = 0; i < t.pieceCount; i++) if (t._pieces[i >> 3]! & (0x80 >> (i & 7))) have++
  return have
}

function makeTorrent(
  id: number,
  name: string,
  size: number,
  done: number,
  status: number,
  addedAgo: number,
): MockTorrent {
  const left = Math.floor(size * (1 - done))
  const pieceCount = Math.max(1, Math.ceil(size / PIECE_SIZE))
  const fileCount = name.endsWith('.iso') ? 1 : randInt(2, 6)
  const files: MockFile[] = []
  let remaining = size
  for (let i = 0; i < fileCount; i++) {
    const length = i === fileCount - 1 ? remaining : Math.floor(remaining * (i === 0 ? 0.8 : 0.4))
    remaining -= length
    const fileName =
      fileCount === 1
        ? name
        : i === 0
          ? `${name}/${name}.mkv`
          : `${name}/${i % 2 ? 'Subs' : 'Extras'}/${['English.srt', 'Commentary.mkv', 'Poster.jpg', 'README.txt', 'Sample.mkv'][i - 1]}`
    files.push({ name: fileName, length, bytesCompleted: Math.floor(length * done), wanted: true, priority: 0 })
  }
  const uploaded = Math.floor(size * done * random() * 2.5)
  const hash = Array.from({ length: 40 }, () => '0123456789abcdef'[randInt(0, 15)]).join('')
  return {
    id,
    name,
    status,
    percentDone: done,
    metadataPercentComplete: 1,
    recheckProgress: 0,
    rateDownload: 0,
    rateUpload: 0,
    eta: -1,
    totalSize: size,
    sizeWhenDone: size,
    leftUntilDone: left,
    uploadedEver: uploaded,
    downloadedEver: size - left,
    uploadRatio: size - left > 0 ? Math.round((uploaded / (size - left)) * 100) / 100 : -1,
    error: 0,
    errorString: '',
    addedDate: START - addedAgo,
    doneDate: done >= 1 ? START - Math.floor(addedAgo / 2) : 0,
    queuePosition: id - 1,
    isFinished: false,
    peersConnected: status === 4 || status === 6 ? randInt(1, 40) : 0,
    peersSendingToUs: 0,
    peersGettingFromUs: 0,
    downloadDir: session['download-dir'] as string,
    hashString: hash,
    comment: 'Mock torrent for UI development',
    creator: 'mktorrent 1.1',
    dateCreated: START - 86400 * 30,
    pieceCount,
    pieceSize: PIECE_SIZE,
    magnetLink: `magnet:?xt=urn:btih:${hash}&dn=${encodeURIComponent(name)}`,
    isPrivate: random() < 0.2,
    _pieces: makePieces(pieceCount, done),
    _files: files,
    _verifyUntil: 0,
  }
}

export interface MockOptions {
  /** Number of torrents to generate (default 15). Use ~1600 to test large libraries. */
  count?: number
}

export function createMockDaemon({ count = SEED_NAMES.length }: MockOptions = {}) {
  let torrents: MockTorrent[] = []
  let nextId = 1

  for (let i = 0; i < count; i++) {
    const base = SEED_NAMES[i % SEED_NAMES.length] as string
    const name = i < SEED_NAMES.length ? base : `${base.replace(/\.iso$/, '')} ${pick(EXTRA_WORDS)} ${i}`
    const roll = random()
    const [done, status] =
      roll < 0.35
        ? [random() * 0.95, 4]
        : roll < 0.65
          ? [1, 6]
          : roll < 0.8
            ? [1, 0]
            : roll < 0.93
              ? [random(), 0]
              : [random() * 0.5, 3]
    torrents.push(makeTorrent(nextId++, name, randInt(200, 40_000) * 1_000_000, done, status, randInt(60, 86400 * 60)))
  }
  // A torrent with a tracker error, and one still fetching magnet metadata.
  if (torrents[3])
    Object.assign(torrents[3], { error: 2, errorString: 'Tracker gave HTTP response code 404 (Not Found)' })
  if (torrents[5]) Object.assign(torrents[5], { status: 4, metadataPercentComplete: 0.35, percentDone: 0 })

  const select = (ids: unknown) => {
    if (ids === undefined || ids === 'recently-active') return torrents
    const list = Array.isArray(ids) ? ids : [ids]
    return torrents.filter((t) => list.includes(t.id) || list.includes(t.hashString))
  }

  function tick() {
    const t0 = now()
    for (const t of torrents) {
      if (t.status === 2) {
        t.recheckProgress = Math.min(1, t.recheckProgress + 0.2)
        if (t0 >= t._verifyUntil) {
          t.status = t.percentDone >= 1 ? 6 : 0
          t.recheckProgress = 0
        }
        continue
      }
      if (t.status === 4) {
        if (t.metadataPercentComplete < 1) {
          t.metadataPercentComplete = Math.min(1, t.metadataPercentComplete + 0.02)
          continue
        }
        t.rateDownload = randInt(500_000, 9_000_000)
        t.rateUpload = randInt(0, 400_000)
        t.peersSendingToUs = randInt(1, Math.max(1, t.peersConnected))
        t.leftUntilDone = Math.max(0, t.leftUntilDone - t.rateDownload * 2)
        t.percentDone = 1 - t.leftUntilDone / t.sizeWhenDone
        t.downloadedEver = t.sizeWhenDone - t.leftUntilDone
        t.eta = Math.floor(t.leftUntilDone / t.rateDownload)
        // Fill in a few missing pieces, mostly near the front.
        const target = Math.floor(t.percentDone * t.pieceCount)
        let have = haveCount(t)
        for (let i = 0; i < t.pieceCount && have < target; i++) {
          if (!(t._pieces[i >> 3]! & (0x80 >> (i & 7)))) {
            t._pieces[i >> 3]! |= 0x80 >> (i & 7)
            have++
          }
        }
        for (const f of t._files) f.bytesCompleted = f.wanted ? Math.floor(f.length * t.percentDone) : f.bytesCompleted
        if (t.leftUntilDone === 0) {
          Object.assign(t, { status: 6, eta: -1, doneDate: t0, percentDone: 1 })
          t._pieces = makePieces(t.pieceCount, 1)
        }
      } else if (t.status === 6) {
        t.rateDownload = 0
        t.rateUpload = random() < 0.4 ? randInt(0, 1_500_000) : 0
        t.uploadedEver += t.rateUpload * 2
        t.uploadRatio = Math.round((t.uploadedEver / Math.max(1, t.downloadedEver)) * 100) / 100
        t.peersGettingFromUs = t.rateUpload > 0 ? randInt(1, 5) : 0
      } else {
        t.rateDownload = 0
        t.rateUpload = 0
        t.eta = -1
        t.peersSendingToUs = 0
        t.peersGettingFromUs = 0
      }
    }
  }

  function project(t: MockTorrent, fields: string[]): Json {
    const out: Json = {}
    for (const field of fields) {
      switch (field) {
        case 'pieces':
          out.pieces = Buffer.from(t._pieces).toString('base64')
          break
        case 'files':
          out.files = t._files.map(({ name, length, bytesCompleted }) => ({ name, length, bytesCompleted }))
          break
        case 'fileStats':
          out.fileStats = t._files.map(({ bytesCompleted, wanted, priority }) => ({ bytesCompleted, wanted, priority }))
          break
        case 'trackerStats':
          out.trackerStats = TRACKERS.slice(0, (t.id % 3) + 1).map((host, i) => ({
            id: i,
            host,
            announce: `https://${host}/announce`,
            tier: i,
            lastAnnounceSucceeded: !(t.error && i === 0),
            lastAnnounceResult: t.error && i === 0 ? t.errorString : 'Success',
            seederCount: randInt(5, 400),
            leecherCount: randInt(0, 60),
            lastAnnounceTime: now() - randInt(30, 1800),
          }))
          break
        case 'peers':
          out.peers =
            t.status === 4 || t.status === 6
              ? Array.from({ length: Math.min(t.peersConnected, 8) }, (_, i) => ({
                  address: `10.0.${t.id % 255}.${i + 10}`,
                  port: 51413,
                  clientName: CLIENTS[(t.id + i) % CLIENTS.length],
                  progress: random(),
                  rateToClient: t.status === 4 ? randInt(0, 900_000) : 0,
                  rateToPeer: randInt(0, 200_000),
                  flagStr: 'DE',
                  isEncrypted: i % 2 === 0,
                }))
              : []
          break
        default:
          if (field in t && !field.startsWith('_')) out[field] = t[field as keyof MockTorrent]
      }
    }
    return out
  }

  function handle(method: string, args: Json): Json {
    switch (method) {
      case 'session-get':
        return session
      case 'session-set':
        Object.assign(session, args)
        return {}
      case 'torrent-get': {
        tick()
        const fields = (args.fields as string[]) ?? []
        return { torrents: select(args.ids).map((t) => project(t, fields)) }
      }
      case 'torrent-start':
      case 'torrent-start-now':
        for (const t of select(args.ids)) {
          t.status = t.percentDone >= 1 ? 6 : 4
          t.peersConnected = t.peersConnected || randInt(1, 40)
        }
        return {}
      case 'torrent-stop': {
        // Real daemons apply stop asynchronously: polls right after can still report the old state.
        const targets = select(args.ids)
        setTimeout(() => {
          for (const t of targets) t.status = 0
        }, 1500)
        return {}
      }
      case 'torrent-verify':
        for (const t of select(args.ids)) {
          t.status = 2
          t.recheckProgress = 0
          t._verifyUntil = now() + 4
        }
        return {}
      case 'torrent-reannounce':
        return {}
      case 'torrent-remove': {
        const removed = new Set(select(args.ids).map((t) => t.id))
        torrents = torrents.filter((t) => !removed.has(t.id))
        return {}
      }
      case 'torrent-set-location':
        for (const t of select(args.ids)) t.downloadDir = String(args.location)
        return {}
      case 'torrent-rename-path': {
        const [t] = select(args.ids)
        if (!t) throw new Error('torrent not found')
        const from = String(args.path)
        const to = String(args.name)
        if (t.name === from) t.name = to
        for (const f of t._files) {
          if (f.name === from || f.name.startsWith(`${from}/`)) {
            const parent = from.includes('/') ? from.slice(0, from.lastIndexOf('/') + 1) : ''
            f.name = parent + to + f.name.slice(from.length)
          }
        }
        return { id: t.id, path: from, name: to }
      }
      case 'torrent-set': {
        for (const t of select(args.ids)) {
          for (const i of (args['files-wanted'] as number[]) ?? []) if (t._files[i]) t._files[i].wanted = true
          for (const i of (args['files-unwanted'] as number[]) ?? []) if (t._files[i]) t._files[i].wanted = false
          for (const [key, priority] of [
            ['priority-high', 1],
            ['priority-normal', 0],
            ['priority-low', -1],
          ] as const) {
            for (const i of (args[key] as number[]) ?? []) if (t._files[i]) t._files[i].priority = priority
          }
        }
        return {}
      }
      case 'queue-move-top':
      case 'queue-move-up':
      case 'queue-move-down':
      case 'queue-move-bottom': {
        const ordered = [...torrents].sort((a, b) => a.queuePosition - b.queuePosition)
        const moving = new Set(select(args.ids).map((t) => t.id))
        for (const t of method.endsWith('down') || method.endsWith('top') ? [...ordered].reverse() : ordered) {
          if (!moving.has(t.id)) continue
          const index = ordered.indexOf(t)
          ordered.splice(index, 1)
          const target =
            method === 'queue-move-top'
              ? 0
              : method === 'queue-move-bottom'
                ? ordered.length
                : method === 'queue-move-up'
                  ? Math.max(0, index - 1)
                  : Math.min(ordered.length, index + 1)
          ordered.splice(target, 0, t)
        }
        ordered.forEach((t, i) => {
          t.queuePosition = i
        })
        return {}
      }
      case 'torrent-add': {
        const filename = typeof args.filename === 'string' ? args.filename : ''
        const match = /[?&]dn=([^&]+)/.exec(filename)
        const name = match?.[1]
          ? decodeURIComponent(match[1].replace(/\+/g, ' '))
          : filename
            ? filename.split('/').pop() || 'New torrent'
            : `Uploaded file (${Buffer.from(String(args.metainfo ?? ''), 'base64').length} bytes)`
        const duplicate = torrents.find((t) => t.name === name)
        if (duplicate) {
          return { 'torrent-duplicate': { id: duplicate.id, name: duplicate.name, hashString: duplicate.hashString } }
        }
        const t = makeTorrent(nextId++, name, randInt(100, 4000) * 1_000_000, 0, args.paused ? 0 : 4, 0)
        if (typeof args['download-dir'] === 'string') t.downloadDir = args['download-dir']
        t.queuePosition = torrents.length
        torrents.push(t)
        return { 'torrent-added': { id: t.id, name: t.name, hashString: t.hashString } }
      }
      default:
        throw new Error(`method name not recognized: ${method}`)
    }
  }

  return { handle }
}
