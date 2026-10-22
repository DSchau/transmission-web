import { beforeEach, describe, expect, test } from 'bun:test'
import {
  addServer,
  connectionAtom,
  credentialsAtom,
  displayNameFor,
  removeServer,
  serversAtom,
  setCredentials,
  switchServer,
  updateServer,
} from './connection'

const home = { id: 'default', name: '', url: '', username: '' }

beforeEach(() => {
  serversAtom.set({ servers: [home], activeId: home.id })
  setCredentials(null)
})

describe('server profiles', () => {
  test('add, rename and switch', () => {
    const seedbox = addServer({ name: 'Seedbox', url: 'https://seedbox.example.com/transmission/rpc', username: 'me' })
    expect(connectionAtom.get().id).toBe(home.id)
    switchServer(seedbox.id)
    expect(connectionAtom.get().url).toBe(seedbox.url)
    updateServer(seedbox.id, { name: 'Box' })
    expect(displayNameFor(connectionAtom.get())).toBe('Box')
    updateServer(seedbox.id, { name: '' })
    expect(displayNameFor(connectionAtom.get())).toBe('seedbox.example.com')
  })

  test('switching brings back each server’s password from this tab', () => {
    setCredentials({ username: 'home', password: 'a' })
    const seedbox = addServer({ name: '', url: 'http://10.0.0.2:9091/transmission/rpc', username: '' })
    switchServer(seedbox.id)
    expect(credentialsAtom.get()).toBeNull()
    setCredentials({ username: 'box', password: 'b' })
    switchServer(home.id)
    expect(credentialsAtom.get()?.password).toBe('a')
    switchServer(seedbox.id)
    expect(credentialsAtom.get()?.password).toBe('b')
  })

  test('setting another server’s password leaves the active one alone', () => {
    const seedbox = addServer({ name: '', url: 'http://10.0.0.2:9091/transmission/rpc', username: '' })
    setCredentials({ username: 'box', password: 'b' }, { id: seedbox.id })
    expect(credentialsAtom.get()).toBeNull()
    switchServer(seedbox.id)
    expect(credentialsAtom.get()?.password).toBe('b')
  })

  test('removing the active server switches to another; the last one stays', () => {
    const seedbox = addServer({ name: '', url: 'http://10.0.0.2:9091/transmission/rpc', username: '' })
    switchServer(seedbox.id)
    setCredentials({ username: 'box', password: 'b' })
    removeServer(seedbox.id)
    expect(serversAtom.get().servers.map((s) => s.id)).toEqual([home.id])
    expect(connectionAtom.get().id).toBe(home.id)
    expect(credentialsAtom.get()).toBeNull()
    removeServer(home.id)
    expect(serversAtom.get().servers).toHaveLength(1)
  })

  test('unknown ids are ignored', () => {
    switchServer('nope')
    expect(connectionAtom.get().id).toBe(home.id)
  })
})
