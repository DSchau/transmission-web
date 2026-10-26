import { describe, expect, it } from 'bun:test'
import { pieceGridLayout } from './pieces'

// The detail header: 6 rows of 6px cells with 2px gaps → 46px tall.
const layout = (count: number, width = 700) => pieceGridLayout(count, width, 46, 6, 6, 2)

describe('pieceGridLayout', () => {
  it('gives each piece its own cell when they fit', () => {
    const two = layout(2)
    expect(two.perCell).toBe(1)
    expect(two.columns * two.rows).toBeGreaterThanOrEqual(2)
    expect(two.rows).toBe(1)

    const many = layout(36)
    expect(many.perCell).toBe(1)
    expect(many.columns * many.rows).toBeGreaterThanOrEqual(36)
    expect(many.columns * many.rows - 36).toBeLessThan(many.rows)
  })

  it('never shrinks cells below the minimum size', () => {
    for (const count of [1, 7, 100, 400, 522]) {
      const grid = layout(count)
      expect(grid.cellWidth).toBeGreaterThanOrEqual(6)
      expect(grid.cellHeight).toBeGreaterThanOrEqual(6)
    }
  })

  it('buckets pieces when there are more than cells', () => {
    const grid = layout(1506)
    expect(grid.rows).toBe(6)
    expect(grid.columns).toBe(87)
    expect(grid.perCell).toBeGreaterThan(1)
  })
})
