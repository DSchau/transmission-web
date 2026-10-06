import type { Torrent } from './rpc/types'

/**
 * Optimistic changes held until the server reflects them.
 *
 * Transmission applies some actions (notably stop) asynchronously, so a poll right after the
 * request can still report the old state; without this the UI flips back and forth. Every
 * poll result is passed through `reconcile`, which re-applies unconfirmed changes.
 */
interface PendingChange {
  apply: (t: Torrent) => Torrent
  isConfirmed: (t: Torrent) => boolean
  expires: number
}

export const PENDING_TIMEOUT = 6000

export class PendingChanges {
  private changes = new Map<number, PendingChange>()
  private removals = new Map<number, number>()
  private readonly timeout: number
  private readonly now: () => number

  constructor(timeout = PENDING_TIMEOUT, now: () => number = Date.now) {
    this.timeout = timeout
    this.now = now
  }

  /** Registers a change for `ids` and returns a function that applies it to a list right away. */
  change(ids: number[], apply: (t: Torrent) => Torrent, isConfirmed: (t: Torrent) => boolean) {
    const pending = { apply, isConfirmed, expires: this.now() + this.timeout }
    const set = new Set(ids)
    for (const id of ids) this.changes.set(id, pending)
    return (list: Torrent[] | undefined) => list?.map((t) => (set.has(t.id) ? apply(t) : t))
  }

  remove(ids: number[]) {
    const expires = this.now() + this.timeout
    const set = new Set(ids)
    for (const id of ids) this.removals.set(id, expires)
    return (list: Torrent[] | undefined) => list?.filter((t) => !set.has(t.id))
  }

  /** Drops pending state for `ids`, e.g. when the request failed. */
  discard(ids: number[]) {
    for (const id of ids) {
      this.changes.delete(id)
      this.removals.delete(id)
    }
  }

  /** Overlays unconfirmed optimistic changes onto freshly polled data. */
  reconcile(fetched: Torrent[]): Torrent[] {
    if (this.changes.size === 0 && this.removals.size === 0) return fetched
    const now = this.now()
    let result = fetched

    if (this.removals.size > 0) {
      const present = new Set(fetched.map((t) => t.id))
      for (const [id, expires] of this.removals) {
        if (!present.has(id) || expires <= now) this.removals.delete(id)
      }
      result = result.filter((t) => !this.removals.has(t.id))
    }

    return result.map((t) => {
      const pending = this.changes.get(t.id)
      if (!pending) return t
      if (pending.isConfirmed(t) || pending.expires <= now) {
        this.changes.delete(t.id)
        return t
      }
      return pending.apply(t)
    })
  }
}
