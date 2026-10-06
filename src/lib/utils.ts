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

export const isMagnetOrUrl = (text: string) => /^(magnet:\?|https?:\/\/)/i.test(text.trim())
