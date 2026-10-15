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
 * The file input's `accept` for .torrent files. iOS has no type for .torrent, and with any `accept`
 * (`.torrent`, `application/x-bittorrent`, `application/octet-stream`) its picker greys out .torrent
 * files. Leaving it off there costs an extra Photo Library / Take Photo menu, but every file is
 * selectable; `isTorrentFile` filters what comes back.
 */
export const torrentFileAccept = () => (isAppleMobile() ? undefined : '.torrent')

export const isMagnetOrUrl = (text: string) => /^(magnet:\?|https?:\/\/)/i.test(text.trim())
