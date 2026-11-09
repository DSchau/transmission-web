import { useEffect, useRef, useState } from 'react'
import { faviconSvg, needsAttention, tabStatus, tabTitle, type WhileAway } from '@/lib/favicon'
import { useTorrents } from '@/lib/queries'
import type { Torrent } from '@/lib/rpc/types'
import { isComplete, isDownloading } from '@/lib/torrent'

/** Shows overall download progress and state in the browser tab's icon and title. */
export function LiveFavicon() {
  const torrents = useTorrents().data
  const away = useWhileAway(torrents)
  const status = tabStatus(torrents ?? [], away)
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

/**
 * Downloads that finished and torrents that started erroring while the tab was hidden, until you
 * come back to it. Errors that already existed are old news and never turn the tab red.
 */
function useWhileAway(torrents: Torrent[] | undefined): WhileAway {
  const [finished, setFinished] = useState(false)
  const [newErrors, setNewErrors] = useState<ReadonlySet<number>>(new Set())
  const downloading = useRef(new Set<number>())
  const erroring = useRef<Set<number> | null>(null)

  useEffect(() => {
    if (!torrents) return
    const nextDownloading = new Set<number>()
    const nextErroring = new Set<number>()
    const appeared: number[] = []
    for (const t of torrents) {
      if (isDownloading(t) && !isComplete(t)) nextDownloading.add(t.id)
      else if (downloading.current.has(t.id) && isComplete(t) && document.hidden) setFinished(true)
      if (needsAttention(t)) {
        nextErroring.add(t.id)
        if (erroring.current && !erroring.current.has(t.id) && document.hidden) appeared.push(t.id)
      }
    }
    downloading.current = nextDownloading
    erroring.current = nextErroring
    setNewErrors((prev) => {
      const next = new Set([...prev, ...appeared].filter((id) => nextErroring.has(id)))
      return next.size === prev.size && appeared.length === 0 ? prev : next
    })
  }, [torrents])

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) return
      setFinished(false)
      setNewErrors(new Set())
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  return { finished, errors: newErrors.size }
}
