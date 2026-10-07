/**
 * A tiny structured-query engine for the search box: lex → parse → compile.
 *
 * Deliberately no regex soup or per-field patterns — the lexer is an explicit character
 * scanner, the parser is a straight walk over a token stream, and each field's meaning lives
 * in a declarative registry (see torrent.ts). Adding a field is a data change, never a
 * parser change. Malformed or half-typed terms degrade gracefully: they are skipped with a
 * diagnostic, so typing never empties the list.
 *
 * Grammar:
 *
 *   query  := term*                          (all terms must match — implicit AND)
 *   term   := ["-"] word | ["-"] phrase | ["-"] field ":" [op] value
 *   op     := "<" | "<=" | ">" | ">=" | "=" | "!="
 *
 * A leading "-" negates a term; bare words and "quoted phrases" search the default field.
 */

/** Comparison ops. `has` is the text/substring default. */
export type QueryOp = 'eq' | 'ne' | 'lt' | 'le' | 'gt' | 'ge' | 'has'

/** One searchable field. Its behavior is pure data. */
export interface QueryField<T> {
  key: string
  /** Alternate spellings; `download-dir` style hyphens can be typed instead of spaces. */
  aliases?: readonly string[]
  /** Cheat-sheet line: what this field matches. */
  describe: string
  /** Cheat-sheet demo — also a term that can be typed. */
  example: string
  kind: 'text' | 'number' | 'date' | 'enum'
  value: (t: T) => string | number
  /** `number`: `bytes` accepts kb/mb/gb/tb (1024-based, like Transmission); `percent` accepts %. */
  units?: 'bytes' | 'percent'
  /** `enum`: the words this field accepts, as predicates. */
  options?: Record<string, (t: T) => boolean>
}

export interface QueryDiagnostic {
  message: string
}

export interface CompiledQuery<T> {
  test: (t: T) => boolean
  /** False when every term was ignored (empty or half-typed query) — callers skip filtering. */
  hasTerms: boolean
  diagnostics: readonly QueryDiagnostic[]
}

export interface QueryEnv<T> {
  fields: ReadonlyMap<string, QueryField<T>>
  /** What bare words and "quoted phrases" search. */
  defaultField: QueryField<T>
  /** Clock for relative dates; injectable for tests. */
  now?: () => number
}

// MARK: Lexer

type OpText = '<' | '<=' | '>' | '>=' | '=' | '!='

type Token =
  | { type: 'word'; text: string }
  | { type: 'phrase'; text: string }
  | { type: 'colon' }
  | { type: 'op'; op: OpText }
  | { type: 'minus' }

const isSpace = (ch: string) => ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === '\f'

function lex(input: string): Token[] {
  const tokens: Token[] = []
  let word = ''
  const pushWord = () => {
    if (word) tokens.push({ type: 'word', text: word })
    word = ''
  }

  let i = 0
  while (i < input.length) {
    const ch = input[i] ?? ''
    if (isSpace(ch)) {
      pushWord()
      i++
    } else if (ch === '"') {
      pushWord()
      const end = input.indexOf('"', i + 1)
      tokens.push({ type: 'phrase', text: end < 0 ? input.slice(i + 1) : input.slice(i + 1, end) })
      i = end < 0 ? input.length : end + 1
    } else if (ch === ':') {
      pushWord()
      tokens.push({ type: 'colon' })
      i++
    } else if (ch === '=' || ((ch === '<' || ch === '>' || ch === '!') && input[i + 1] === '=')) {
      pushWord()
      const op = ch === '=' ? '=' : `${ch}=`
      tokens.push({ type: 'op', op: op as OpText })
      i += ch === '=' ? 1 : 2
    } else if (ch === '<' || ch === '>') {
      pushWord()
      tokens.push({ type: 'op', op: ch })
      i++
    } else if (ch === '-' && !word) {
      // A leading "-" negates; inside a word it is just a character ("ubuntu-24").
      tokens.push({ type: 'minus' })
      i++
    } else {
      word += ch
      i++
    }
  }
  pushWord()
  return tokens
}

// MARK: Parser

type Term<T> =
  | { kind: 'text'; negate: boolean; text: string }
  | { kind: 'field'; negate: boolean; field: QueryField<T>; op: OpText | null; value: string; raw: string }

/** Suggests the nearest known field for a typo ("rato" → "ratio"). */
function suggestField<T>(typed: string, fields: ReadonlyMap<string, QueryField<T>>): string | null {
  let best: string | null = null
  let bestDistance = 3 // only near-misses
  for (const [key] of fields) {
    const distance = editDistance(typed, key)
    if (distance < bestDistance) {
      best = key
      bestDistance = distance
    }
  }
  return best
}

function editDistance(a: string, b: string): number {
  // Short strings; a simple two-row DP is plenty.
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const current: number[] = [i]
    for (let j = 1; j <= b.length; j++) {
      const substitution = (previous[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1)
      current[j] = Math.min((previous[j] ?? 0) + 1, (current[j - 1] ?? 0) + 1, substitution)
    }
    previous = current
  }
  return previous[b.length] ?? a.length
}

/** Query ops keyed by their surface syntax. */
const OP_MAP: Record<OpText, 'eq' | 'ne' | 'lt' | 'le' | 'gt' | 'ge'> = {
  '=': 'eq',
  '!=': 'ne',
  '<': 'lt',
  '<=': 'le',
  '>': 'gt',
  '>=': 'ge',
}

function parseTerms<T>(tokens: Token[], env: QueryEnv<T>, diagnostics: QueryDiagnostic[]): Term<T>[] {
  const terms: Term<T>[] = []
  let i = 0
  const token = (index: number): Token | undefined => tokens[index]

  while (i < tokens.length) {
    // A leading "-" (or several) negates the term that follows.
    let negate = false
    while (token(i)?.type === 'minus') {
      negate = !negate
      i++
    }
    const head = token(i)
    if (!head) break
    // Stray punctuation between terms (e.g. the ":" left behind by an unknown field).
    if (head.type === 'colon' || head.type === 'op' || head.type === 'minus') {
      i++
      continue
    }

    if (head.type === 'phrase') {
      if (head.text) terms.push({ kind: 'text', negate, text: head.text })
      i++
      continue
    }

    if (token(i + 1)?.type === 'colon') {
      const field = env.fields.get(head.text.toLocaleLowerCase())
      if (!field) {
        // Unknown field: fall back to name text (and say so — the user probably has a typo).
        const hint = suggestField(head.text, env.fields)
        diagnostics.push({
          message: hint ? `Unknown field “${head.text}” — did you mean “${hint}”?` : `Unknown field “${head.text}”.`,
        })
        terms.push({ kind: 'text', negate, text: head.text })
        i++ // the stray colon is skipped on the next pass
        continue
      }

      let j = i + 2 // past the field word and the colon
      let op: OpText | null = null
      if (token(j)?.type === 'op') {
        op = (token(j) as { op: OpText }).op
        j++
      }
      const value = token(j)
      if (!value || (value.type !== 'word' && value.type !== 'phrase')) {
        // Half-typed ("ratio:") — ignore the term, no diagnostic noise.
        i = j
        continue
      }
      terms.push({
        kind: 'field',
        negate,
        field,
        op,
        value: value.text,
        raw: `${field.key}:${op ?? ''}${value.text}`,
      })
      i = j + 1
      continue
    }

    // A bare word searches the default field.
    if (head.text) terms.push({ kind: 'text', negate, text: head.text })
    i++
  }
  return terms
}

// MARK: Value parsing

const BYTE_UNITS: Record<string, number> = {
  b: 1,
  k: 1024,
  kb: 1024,
  m: 1024 ** 2,
  mb: 1024 ** 2,
  g: 1024 ** 3,
  gb: 1024 ** 3,
  t: 1024 ** 4,
  tb: 1024 ** 4,
}

/** "1.5", "1gb", "50%" → a plain number, or null when unparsable. */
function parseNumberValue(raw: string, units: 'bytes' | 'percent' | undefined): number | null {
  const end = Array.from(raw).findIndex((ch) => !(ch >= '0' && ch <= '9') && ch !== '.')
  const digits = end < 0 ? raw : raw.slice(0, end)
  const suffix = (end < 0 ? '' : raw.slice(end)).trim().toLocaleLowerCase()
  const value = digits ? Number(digits) : Number.NaN
  if (!Number.isFinite(value)) return null

  if (units === 'bytes') {
    const multiplier = BYTE_UNITS[suffix] ?? Number.NaN
    return Number.isFinite(multiplier) ? value * multiplier : null
  }
  if (units === 'percent') {
    if (suffix === '%') return value / 100
    if (suffix === '') return value > 1 ? value / 100 : value // "80" means 80%
    return null
  }
  return suffix === '' ? value : null
}

const RELATIVE_UNITS: Record<string, number> = {
  s: 1,
  h: 3600,
  d: 86_400,
  w: 7 * 86_400,
  m: 30 * 86_400,
  y: 365 * 86_400,
}

/** "7d", "2w" (ago) or "2024-01-01" → epoch seconds, or null when unparsable. */
function parseDateValue(raw: string, nowMs: number): number | null {
  const relative = /^(\d+)([shdwmy])$/i.exec(raw)
  if (relative?.[1] && relative?.[2]) {
    const seconds = RELATIVE_UNITS[relative[2].toLocaleLowerCase()]
    if (seconds === undefined) return null
    return Math.floor(nowMs / 1000) - Number(relative[1]) * seconds
  }
  if (/^\d{4}-\d{2}-\d{2}([T\s].+)?$/i.test(raw)) {
    const parsed = Date.parse(raw.replace(' ', 'T')) // treat a space as ISO separator
    return Number.isFinite(parsed) ? Math.floor(parsed / 1000) : null
  }
  return null
}

// MARK: Compilation

const compare: Record<'lt' | 'le' | 'gt' | 'ge' | 'eq' | 'ne', (a: number, b: number) => boolean> = {
  eq: (a, b) => a === b,
  ne: (a, b) => a !== b,
  lt: (a, b) => a < b,
  le: (a, b) => a <= b,
  gt: (a, b) => a > b,
  ge: (a, b) => a >= b,
}

function compileTerm<T>(
  term: Term<T>,
  env: QueryEnv<T>,
  nowMs: number,
  diagnostics: QueryDiagnostic[],
): ((t: T) => boolean) | null {
  if (term.kind === 'text') {
    const needle = term.text.toLocaleLowerCase()
    const matches = (t: T) => String(env.defaultField.value(t)).toLocaleLowerCase().includes(needle)
    return term.negate ? (t: T) => !matches(t) : matches
  }

  const { field } = term
  const invalid = (message: string) => {
    diagnostics.push({ message })
    return null
  }

  if (field.kind === 'enum') {
    const options = field.options ?? {}
    const predicate = options[term.value.toLocaleLowerCase()]
    if (!predicate) return invalid(`“${term.raw}” — ${field.key} expects one of: ${Object.keys(options).join(', ')}`)
    if (term.op && term.op !== '=' && term.op !== '!=') {
      return invalid(`“${term.raw}” — ${field.key} only supports = or !=`)
    }
    const matches = term.op === '!=' ? (t: T) => !predicate(t) : predicate
    return term.negate ? (t: T) => !matches(t) : matches
  }

  if (field.kind === 'text') {
    const needle = term.value.toLocaleLowerCase()
    const hay = (t: T) => String(field.value(t)).toLocaleLowerCase()
    const exact = term.op === '='
    const not = term.op === '!=' || term.negate
    const contains = exact ? (t: T) => hay(t) === needle : (t: T) => hay(t).includes(needle)
    return not ? (t: T) => !contains(t) : contains
  }

  if (field.kind === 'number') {
    const target = parseNumberValue(term.value, field.units)
    if (target == null)
      return invalid(`“${term.raw}” — expected a number${field.units === 'bytes' ? ' like 1.5gb' : ''}`)
    const op = OP_MAP[term.op ?? '=']
    const matches = (t: T) => compare[op](Number(field.value(t)), target)
    return term.negate ? (t: T) => !matches(t) : matches
  }

  // Dates: bare "added:7d" means "within the last 7 days"; explicit comparisons otherwise.
  const target = parseDateValue(term.value, nowMs)
  if (target == null) return invalid(`“${term.raw}” — expected a date like 2024-01-01 or 7d`)
  const op = term.op ? OP_MAP[term.op] : 'ge'
  const matches = (t: T) => compare[op](Number(field.value(t)), target)
  return term.negate ? (t: T) => !matches(t) : matches
}

// MARK: Entry point

export function compileQuery<T>(input: string, env: QueryEnv<T>): CompiledQuery<T> {
  const diagnostics: QueryDiagnostic[] = []
  const nowMs = env.now?.() ?? Date.now()
  const predicates = parseTerms(lex(input), env, diagnostics)
    .map((term) => compileTerm(term, env, nowMs, diagnostics))
    .filter((p): p is (t: T) => boolean => p != null)

  return {
    test: predicates.length ? (t) => predicates.every((p) => p(t)) : () => true,
    hasTerms: predicates.length > 0,
    diagnostics,
  }
}
