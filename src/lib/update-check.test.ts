import { describe, expect, test } from 'vitest'
import { entryScript } from './update-check'

describe('entryScript', () => {
  test('finds the hashed bundle in a built index.html', () => {
    const html = '<script type="module" crossorigin src="./assets/index-rr11AtmT.js"></script>'
    expect(entryScript(html)).toBe('assets/index-rr11AtmT.js')
  })

  test('matches the same bundle from an absolute script URL', () => {
    expect(entryScript('http://192.168.0.250:9091/transmission/web/assets/index-rr11AtmT.js')).toBe(
      'assets/index-rr11AtmT.js',
    )
  })

  test('ignores lazily loaded chunks and the dev entry', () => {
    expect(entryScript('<link rel="modulepreload" href="./assets/settings-Ab12.js">')).toBeNull()
    expect(entryScript('<script type="module" src="/src/main.tsx"></script>')).toBeNull()
  })
})
