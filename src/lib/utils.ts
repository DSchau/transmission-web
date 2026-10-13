export { cn } from 'cn'

/** Reads a File as base64 (without the data: URL prefix), for `torrent-add`'s `metainfo`. */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]*,/, ''))
    reader.onerror = () => reject(reader.error ?? new Error('Couldn’t read the file'))
    reader.readAsDataURL(file)
  })
}

export const isTorrentFile = (file: File) =>
  file.name.toLowerCase().endsWith('.torrent') || file.type === 'application/x-bittorrent'

/** iPhone, iPod, or iPad (which reports itself as a Mac with a touch screen). */
export const isAppleMobile = () =>
  /iP(hone|od|ad)/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)

/**
 * The file input's `accept` for .torrent files. iOS has no type for .torrent, so its picker greys out
 * every file when `application/x-bittorrent` is listed, and `.torrent` alone adds a pointless
 * Photo Library / Take Photo menu. A generic binary type goes straight to Files with everything
 * selectable; `isTorrentFile` filters what comes back.
 */
export const torrentFileAccept = () => (isAppleMobile() ? '.torrent,application/octet-stream' : '.torrent')

export const isMagnetOrUrl = (text: string) => /^(magnet:\?|https?:\/\/)/i.test(text.trim())
