import { describe, expect, test } from 'bun:test'
import { formatBytes, formatSpeed } from './format'

describe('formatBytes', () => {
  test.each([
    [0, '0 bytes'],
    [512, '512 bytes'],
    [1000, '1 kB'],
    [4_200_000_000, '4.2 GB'],
    [123_456_789, '123 MB'],
  ])('%p → %p', (bytes, expected) => {
    expect(formatBytes(bytes)).toBe(expected)
  })

  test.each([
    [999_500, '1 MB'],
    [999_700_000, '1 GB'],
    [999_999_999_999, '1 TB'],
  ])('rolls %p over to the next unit instead of "1000 …"', (bytes, expected) => {
    expect(formatBytes(bytes)).toBe(expected)
  })

  test('stays in the largest unit past its range', () => {
    expect(formatBytes(2_000 * 1000 ** 5)).toBe('2000 PB')
  })
})

describe('formatSpeed', () => {
  test('rolls over near unit boundaries', () => {
    expect(formatSpeed(999_600)).toBe('1 MB/s')
  })
})
