/// <reference types="bun" />
import { describe, expect, it } from 'bun:test'
import { PendingChanges } from './pending'
import { torrentsQuery } from './queries'
import type { TransmissionClient } from './rpc/client'
import type { Torrent } from './rpc/types'
import { isGap, SpeedHistory } from './speed-history'
import type { Transmission } from './transmission'

function setup(torrents: () => Promise<Partial<Torrent>[]>) {
  const history = new SpeedHistory()
  const t = {
    client: { torrents } as unknown as TransmissionClient,
    pending: new PendingChanges(),
    history,
    key: ['transmission', 0],
  } as unknown as Transmission
  const { queryFn } = torrentsQuery(t, 2)
  const poll = (controller = new AbortController()) =>
    // biome-ignore lint/suspicious/noExplicitAny: only `signal` is read from the query context
    (queryFn as (context: any) => Promise<Torrent[]>)({ signal: controller.signal })
  const samples = () => history.since(0)
  return { poll, samples }
}

describe('torrentsQuery speed sampling', () => {
  it('adds one sample per successful poll with the summed rates', async () => {
    const { poll, samples } = setup(async () => [
      { id: 1, rateDownload: 1000, rateUpload: 10 },
      { id: 2, rateDownload: 500, rateUpload: 0 },
      { id: 3, rateDownload: 0, rateUpload: 250 },
    ])
    await poll()
    await poll()
    expect(samples()).toHaveLength(2)
    expect(samples()[1]).toMatchObject({ down: 1500, up: 260 })
  })

  it('records a gap when a poll fails', async () => {
    const { poll, samples } = setup(() => Promise.reject(new Error('connection refused')))
    await expect(poll()).rejects.toThrow('connection refused')
    expect(samples()).toHaveLength(1)
    expect(isGap(samples()[0]!)).toBe(true)
  })

  it('records nothing when a poll is aborted', async () => {
    const controller = new AbortController()
    const { poll, samples } = setup(() => {
      controller.abort()
      return Promise.reject(new DOMException('Aborted', 'AbortError'))
    })
    await expect(poll(controller)).rejects.toThrow()
    expect(samples()).toHaveLength(0)
  })
})
