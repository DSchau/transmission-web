/// <reference types="bun" />
import { describe, expect, it } from 'bun:test'
import { compileQuery, type QueryField } from './query'

/**
 * The engine is exercised against a tiny fake domain, so these tests cover the grammar —
 * the torrent registry in torrent.ts is declarative data.
 */

interface Item {
  name: string
  size: number
  ratio: number
  progress: number
  added: number // epoch seconds
  status: 'down' | 'seed' | 'paused'
  dir: string
}

const NOW = Date.UTC(2026, 0, 10) // fixed clock: 2026-01-10
const DAY = 86_400
const nowSeconds = Math.floor(NOW / 1000)

const NAME_FIELD: QueryField<Item> = { key: 'name', kind: 'text', describe: '', example: '', value: (t) => t.name }

const FIELDS: QueryField<Item>[] = [
  NAME_FIELD,
  { key: 'size', kind: 'number', units: 'bytes', describe: '', example: '', value: (t) => t.size },
  {
    key: 'ratio',
    kind: 'number',
    describe: '',
    example: '',
    // Mirrors the real registry: -1 is the daemon's "not applicable" sentinel.
    value: (t) => (t.ratio < 0 ? Number.NaN : t.ratio),
  },
  { key: 'progress', kind: 'number', units: 'percent', describe: '', example: '', value: (t) => t.progress },
  { key: 'added', kind: 'date', describe: '', example: '', value: (t) => t.added },
  {
    key: 'status',
    kind: 'enum',
    describe: '',
    example: '',
    value: () => '',
    options: {
      down: (t) => t.status === 'down',
      seed: (t) => t.status === 'seed',
      paused: (t) => t.status === 'paused',
    },
  },
  { key: 'dir', kind: 'text', aliases: ['path'], describe: '', example: '', value: (t) => t.dir },
]

const ENV = {
  fields: new Map(
    FIELDS.flatMap((field) => [
      [field.key, field] as const,
      ...(field.aliases ?? []).map((alias) => [alias, field] as const),
    ]),
  ),
  defaultField: NAME_FIELD,
  now: () => NOW,
}

const ITEMS: Item[] = [
  {
    name: 'Ubuntu 24.04 ISO',
    size: 5 * 1024 ** 3,
    ratio: 0.4,
    progress: 0.25,
    added: nowSeconds - 1 * DAY,
    status: 'down',
    dir: '/iso',
  },
  {
    name: 'Debian netinst',
    size: 700 * 1024 ** 2,
    ratio: 2.5,
    progress: 1,
    added: nowSeconds - 90 * DAY,
    status: 'seed',
    dir: '/iso',
  },
  {
    name: 'Sintel 4K',
    size: 20 * 1024 ** 3,
    ratio: -1,
    progress: 1,
    added: nowSeconds - 300 * DAY,
    status: 'paused',
    dir: '/movies',
  },
]

const names = (query: string) => {
  const { test } = compileQuery(query, ENV)
  return ITEMS.filter(test).map((item) => item.name)
}

const diagnosticsOf = (query: string) => compileQuery(query, ENV).diagnostics

describe('free text', () => {
  it('matches words case-insensitively; all words must match', () => {
    expect(names('ubuntu')).toEqual(['Ubuntu 24.04 ISO'])
    expect(names('ubuntu iso')).toEqual(['Ubuntu 24.04 ISO'])
    expect(names('iso')).toEqual(['Ubuntu 24.04 ISO'])
  })

  it('matches quoted phrases exactly', () => {
    expect(names('"24.04 iso"')).toEqual(['Ubuntu 24.04 ISO'])
    expect(names('"ubuntu iso"')).toEqual([]) // not contiguous
    expect(names('name:"Debian netinst"')).toEqual(['Debian netinst'])
  })

  it('excludes with a leading minus', () => {
    expect(names('-ubuntu')).toEqual(['Debian netinst', 'Sintel 4K'])
    expect(names('iso -ubuntu')).toEqual([])
    // A hyphen inside a word is just a character.
    expect(names('4k')).toEqual(['Sintel 4K'])
  })
})

describe('numbers', () => {
  it('compares bytes with kb/mb/gb/tb suffixes (1024-based)', () => {
    expect(names('size:>1gb')).toEqual(['Ubuntu 24.04 ISO', 'Sintel 4K'])
    expect(names('size:>=700mb')).toEqual(ITEMS.map((item) => item.name))
    expect(names('size:700mb')).toEqual(['Debian netinst'])
  })

  it('compares plain numbers', () => {
    expect(names('ratio:<0.5')).toEqual(['Ubuntu 24.04 ISO'])
    expect(names('ratio:2.5')).toEqual(['Debian netinst'])
  })

  it('never matches sentinel values (ratio -1 = not applicable)', () => {
    // Sintel's ratio is -1 (n/a); it must not sneak under ratio:<0.5.
    expect(names('ratio:<0.5')).not.toContain('Sintel 4K')
  })

  it('accepts percent as %, 0–1, or a bare number', () => {
    expect(names('progress:<50%')).toEqual(['Ubuntu 24.04 ISO'])
    expect(names('progress:1')).toEqual(['Debian netinst', 'Sintel 4K'])
    expect(names('progress:<1')).toEqual(['Ubuntu 24.04 ISO'])
  })

  it('supports every comparison operator', () => {
    expect(names('size:<=700mb')).toEqual(['Debian netinst'])
    expect(names('size:!=700mb')).toEqual(['Ubuntu 24.04 ISO', 'Sintel 4K'])
    expect(names('size:>1gb -sintel')).toEqual(['Ubuntu 24.04 ISO'])
  })
})

describe('dates', () => {
  it('reads relative dates as “ago”, and bare dates as “since”', () => {
    expect(names('added:7d')).toEqual(['Ubuntu 24.04 ISO'])
    expect(names('added:>30d')).toEqual(['Ubuntu 24.04 ISO'])
    expect(names('added:<30d')).toEqual(['Debian netinst', 'Sintel 4K'])
    expect(names('added:2025-12-01')).toEqual(['Ubuntu 24.04 ISO'])
  })

  it('compares ISO dates explicitly', () => {
    expect(names('added:>2025-12-01')).toEqual(['Ubuntu 24.04 ISO'])
    // Debian was added ~90 days before the fixed clock (Oct 12, 2025), Sintel in March 2025.
    expect(names('added:<2025-12-01')).toEqual(['Debian netinst', 'Sintel 4K'])
  })
})

describe('enums and text fields', () => {
  it('matches status words', () => {
    expect(names('status:seed')).toEqual(['Debian netinst'])
    expect(names('status:!=paused')).toEqual(['Ubuntu 24.04 ISO', 'Debian netinst'])
  })

  it('matches text fields, exactly or by substring, honoring aliases', () => {
    expect(names('dir:movies')).toEqual(['Sintel 4K'])
    expect(names('path:movies')).toEqual(['Sintel 4K'])
    expect(names('name:="debian netinst"')).toEqual(['Debian netinst'])
    expect(names('name:!=debian')).toEqual(['Ubuntu 24.04 ISO', 'Sintel 4K'])
  })
})

describe('graceful degradation', () => {
  it('keeps everything visible while a term is half-typed', () => {
    const half = compileQuery('status:', ENV)
    expect(half.hasTerms).toBe(false)
    expect(half.diagnostics).toEqual([])
    expect(names('status:')).toEqual(ITEMS.map((item) => item.name))
  })

  it('ignores invalid values but says so', () => {
    expect(names('ratio:abc')).toEqual(ITEMS.map((item) => item.name))
    expect(diagnosticsOf('ratio:abc').length).toBe(1)
    expect(names('status:xyz')).toEqual(ITEMS.map((item) => item.name))
    expect(diagnosticsOf('status:xyz')[0]?.message).toContain('status expects one of')
  })

  it('falls back to name text for unknown fields, with a suggestion', () => {
    expect(names('rato:0.5')).toEqual([]) // searches the name for "rato" and "0.5"
    const diagnostic = diagnosticsOf('rato:0.5')[0]
    expect(diagnostic?.message).toContain('did you mean “ratio”')
  })

  it('rejects comparison ops on enums', () => {
    expect(diagnosticsOf('status:>down').length).toBe(1)
    expect(names('status:>down')).toEqual(ITEMS.map((item) => item.name))
  })

  it('compiles empty queries to match-everything', () => {
    const compiled = compileQuery('   ', ENV)
    expect(compiled.hasTerms).toBe(false)
    expect(names('')).toEqual(ITEMS.map((item) => item.name))
  })
})

describe('combining terms', () => {
  it('ANDs structured and free-text terms', () => {
    expect(names('status:seed size:<1gb')).toEqual(['Debian netinst'])
    expect(names('debian -netinst')).toEqual([])
    expect(names('iso status:down')).toEqual(['Ubuntu 24.04 ISO'])
  })
})
