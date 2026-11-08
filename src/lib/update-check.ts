import { toast } from 'sonner'

/** How often an open tab checks for a newer deploy. */
export const UPDATE_CHECK_INTERVAL = 5 * 60_000
/** Coming back to the tab checks again, unless the last check was this recent. */
const MIN_GAP = 30_000

const ENTRY = /assets\/index-[\w-]+\.js/

/** The hashed entry bundle a built `index.html` (or a script URL) points at, e.g. `assets/index-rr11AtmT.js`. */
export function entryScript(html: string): string | null {
  return html.match(ENTRY)?.[0] ?? null
}

/**
 * Transmission serves the web folder with a day-long `Expires` and no way to change it, so browsers
 * keep showing the old UI after a deploy. This refetches the page past the cache now and then and,
 * when it points at a different bundle than the one running, offers a reload. Fetching with
 * `cache: 'reload'` also stores the new page, so the reload (or the next launch) picks it up.
 */
export function watchForUpdates() {
  const script = document.querySelector<HTMLScriptElement>('script[type="module"][src*="assets/index-"]')
  const running = script && entryScript(script.src)
  // Dev server, or a build we don't recognise: nothing to compare against.
  if (!running) return

  let lastCheck = Date.now()
  let notified = false

  const check = async () => {
    if (notified) return
    lastCheck = Date.now()
    try {
      // `./` rather than `index.html`: it's the URL the page was loaded from, so its cache entry is the one to replace.
      const res = await fetch(new URL('./', location.href), { cache: 'reload' })
      if (!res.ok) return
      const latest = entryScript(await res.text())
      if (!latest || latest === running || notified) return
      notified = true
      toast('A new version is available', {
        duration: Number.POSITIVE_INFINITY,
        action: { label: 'Reload', onClick: () => location.reload() },
        onDismiss: () => {
          notified = false
        },
      })
    } catch {
      // Offline or the daemon is down; try again next time.
    }
  }

  setInterval(check, UPDATE_CHECK_INTERVAL)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && Date.now() - lastCheck > MIN_GAP) void check()
  })
}
