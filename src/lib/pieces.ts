/** Decoded `pieces` bitfield (MSB first). */
export class PieceBitfield {
  readonly bytes: Uint8Array
  readonly count: number

  constructor(bytes: Uint8Array, count: number) {
    this.bytes = bytes
    this.count = count
  }

  static fromBase64(base64: string | undefined, count: number | undefined): PieceBitfield | null {
    if (!base64 || !count || count <= 0) return null
    try {
      const binary = atob(base64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      return new PieceBitfield(bytes, count)
    } catch {
      return null
    }
  }

  /**
   * Synthetic map filled front-to-back to `progress`, for progress that really is sequential
   * (e.g. fetching a magnet's metadata).
   */
  static placeholder(progress: number, count = 512): PieceBitfield {
    const filled = Math.round(clamp01(progress) * count)
    const bytes = new Uint8Array(Math.ceil(count / 8))
    for (let i = 0; i < filled; i++) bytes[i >> 3]! |= 0x80 >> (i & 7)
    return new PieceBitfield(bytes, count)
  }

  /**
   * Synthetic map with `progress` spread evenly across every piece — used while real piece
   * data loads. Downloads aren't sequential, so this looks like the real map (every cell
   * partly shaded) and the swap is barely visible. The default count is high enough that the
   * grid always buckets it, which shades cells evenly instead of scattering single pieces.
   */
  static spread(progress: number, count = 8192): PieceBitfield {
    const p = clamp01(progress)
    const bytes = new Uint8Array(Math.ceil(count / 8))
    for (let i = 0; i < count; i++) {
      if (Math.floor((i + 1) * p) > Math.floor(i * p)) bytes[i >> 3]! |= 0x80 >> (i & 7)
    }
    return new PieceBitfield(bytes, count)
  }

  has(index: number): boolean {
    const byte = this.bytes[index >> 3]
    return byte !== undefined && (byte & (0x80 >> (index & 7))) !== 0
  }

  get haveCount(): number {
    let total = 0
    for (let i = 0; i < this.count; i++) if (this.has(i)) total++
    return total
  }

  /** Fraction of pieces present in [start, end). */
  fraction(start: number, end: number): number {
    if (end <= start) return 0
    let have = 0
    for (let i = start; i < end; i++) if (this.has(i)) have++
    return have / (end - start)
  }
}

export interface PieceGridLayout {
  columns: number
  rows: number
  cellWidth: number
  cellHeight: number
  /** Pieces per cell: 1 when every piece gets its own cell, otherwise cells are buckets. */
  perCell: number
}

/**
 * Lays out `count` pieces in a `width` × `height` box. When the pieces fit at the minimum
 * cell size, each gets its own cell and the cells grow to fill the box, with the row count
 * picked to keep them as square as possible. Otherwise the box is filled with minimum-size
 * cells that each stand for a range of pieces.
 */
export function pieceGridLayout(
  count: number,
  width: number,
  height: number,
  maxRows: number,
  minCell: number,
  gap: number,
): PieceGridLayout {
  const span = (size: number, n: number) => (size - (n - 1) * gap) / n
  const maxColumns = Math.max(1, Math.floor((width + gap) / (minCell + gap)))
  const capacity = maxColumns * maxRows

  if (count > capacity || count <= 0) {
    return {
      columns: maxColumns,
      rows: maxRows,
      cellWidth: span(width, maxColumns),
      cellHeight: span(height, maxRows),
      perCell: Math.max(1, count / capacity),
    }
  }

  let best: PieceGridLayout | null = null
  let bestScore = Number.POSITIVE_INFINITY
  for (let rows = 1; rows <= Math.min(maxRows, count); rows++) {
    const columns = Math.ceil(count / rows)
    if (columns > maxColumns) continue
    const cellWidth = span(width, columns)
    const cellHeight = span(height, rows)
    const score = Math.abs(Math.log(cellWidth / cellHeight))
    if (score < bestScore) {
      bestScore = score
      best = { columns, rows, cellWidth, cellHeight, perCell: 1 }
    }
  }
  // Unreachable: maxRows rows always fit since count <= capacity.
  return (
    best ?? {
      columns: maxColumns,
      rows: maxRows,
      cellWidth: span(width, maxColumns),
      cellHeight: span(height, maxRows),
      perCell: 1,
    }
  )
}

function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1)
}
