import { useEffect, useRef, useState } from 'react'
import { faviconSvg, tabStatus, tabTitle } from '@/lib/favicon'
import { useTorrents } from '@/lib/queries'
import type { Torrent } from '@/lib/rpc/types'
import { isComplete, isDownloading } from '@/lib/torrent'

/** Shows overall download progress and state in the browser tab's icon and title. */
export function LiveFavicon() {
  const torrents = useTorrents().data
  const finishedWhileAway = useFinishedWhileAway(torrents)
  const status = tabStatus(torrents ?? [], finishedWhileAway)
  const svg = faviconSvg(status)
  const [base] = useState(() => document.title)
  const title = tabTitle(status, base)

  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (!link) return
    const original = link.getAttribute('href')!
    if (svg) link.href = `data:image/svg+xml,${encodeURIComponent(svg)}`
    return () => link.setAttribute('href', original)
  }, [svg])

  useEffect(() => {
    document.title = title
    return () => {
      document.title = base
    }
  }, [title, base])

  return null
}

/** True once a download finishes while the tab is hidden, until you come back to it. */
function useFinishedWhileAway(torrents: Torrent[] | undefined) {
  const [finished, setFinished] = useState(false)
  const downloading = useRef(new Set<number>())

  useEffect(() => {
    if (!torrents) return
    const next = new Set<number>()
    for (const t of torrents) {
      if (isDownloading(t) && !isComplete(t)) next.add(t.id)
      else if (downloading.current.has(t.id) && isComplete(t) && document.hidden) setFinished(true)
    }
    downloading.current = next
  }, [torrents])

  useEffect(() => {
    const onVisibility = () => {
      if (!document.hidden) setFinished(false)
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  return finished
}
