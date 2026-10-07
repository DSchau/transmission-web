/**
 * Wire types for the Transmission RPC protocol (the subset this app uses).
 * Spec: https://github.com/transmission/transmission/blob/main/docs/rpc-spec.md
 */

export const TorrentStatus = {
  Stopped: 0,
  CheckWait: 1,
  Checking: 2,
  DownloadWait: 3,
  Downloading: 4,
  SeedWait: 5,
  Seeding: 6,
} as const
export type TorrentStatus = (typeof TorrentStatus)[keyof typeof TorrentStatus]

export interface TorrentFile {
  name: string
  length: number
  bytesCompleted: number
}

export interface TorrentFileStat {
  wanted: boolean
  priority: number
}

export interface TrackerStat {
  id: number
  host: string
  announce: string
  tier: number
  lastAnnounceSucceeded: boolean
  lastAnnounceResult: string
  seederCount: number
  leecherCount: number
  lastAnnounceTime: number
}

export interface Peer {
  address: string
  port: number
  clientName: string
  progress: number
  rateToClient: number
  rateToPeer: number
  flagStr: string
  isEncrypted: boolean
}

/**
 * A torrent as returned by `torrent-get`. List fields are always requested; the
 * detail-only fields are optional and only populated by the detail query.
 */
export interface Torrent {
  id: number
  name: string
  status: TorrentStatus
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

  // Detail-only
  comment?: string
  creator?: string
  dateCreated?: number
  pieceCount?: number
  pieceSize?: number
  magnetLink?: string
  isPrivate?: boolean
  /** Base64 bitfield of pieces we have (MSB first). */
  pieces?: string
  files?: TorrentFile[]
  fileStats?: TorrentFileStat[]
  trackerStats?: TrackerStat[]
  peers?: Peer[]
}

export const LIST_FIELDS = [
  'id',
  'name',
  'status',
  'percentDone',
  'metadataPercentComplete',
  'recheckProgress',
  'rateDownload',
  'rateUpload',
  'eta',
  'totalSize',
  'sizeWhenDone',
  'leftUntilDone',
  'uploadedEver',
  'downloadedEver',
  'uploadRatio',
  'error',
  'errorString',
  'addedDate',
  'doneDate',
  'queuePosition',
  'isFinished',
  'peersConnected',
  'peersSendingToUs',
  'peersGettingFromUs',
  'downloadDir',
  'hashString',
] as const satisfies readonly (keyof Torrent)[]

export const DETAIL_FIELDS = [
  ...LIST_FIELDS,
  'comment',
  'creator',
  'dateCreated',
  'pieceCount',
  'pieceSize',
  'magnetLink',
  'isPrivate',
  'pieces',
  'files',
  'fileStats',
  'trackerStats',
  'peers',
] as const satisfies readonly (keyof Torrent)[]

/** Subset of `session-get` the app cares about. */
export interface SessionInfo {
  version: string
  'rpc-version': number
  'download-dir': string
  'download-dir-free-space': number
  'start-added-torrents': boolean
  'alt-speed-enabled': boolean
  'alt-speed-down': number
  'alt-speed-up': number
  'speed-limit-down-enabled': boolean
  'speed-limit-down': number
  'speed-limit-up-enabled': boolean
  'speed-limit-up': number
  seedRatioLimited: boolean
  seedRatioLimit: number
}

/** Arguments for `session-set`. Only provided keys are sent. */
export type SessionUpdate = Partial<Omit<SessionInfo, 'version' | 'rpc-version'>>

export interface AddTorrentArguments {
  /** Magnet link or URL to a .torrent file. */
  filename?: string
  /** Base64-encoded .torrent file contents. */
  metainfo?: string
  'download-dir'?: string
  paused?: boolean
}

export interface AddedTorrent {
  id: number
  name: string
  hashString: string
}

export type AddTorrentResult = { kind: 'added'; torrent: AddedTorrent } | { kind: 'duplicate'; torrent: AddedTorrent }

export type QueueDirection = 'top' | 'up' | 'down' | 'bottom'

export interface FileUpdate {
  wanted?: number[]
  unwanted?: number[]
  priorityHigh?: number[]
  priorityNormal?: number[]
  priorityLow?: number[]
}
