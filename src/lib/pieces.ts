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
   * Synthetic map filled front-to-back to `progress` — used while real piece data loads,
   * so the header doesn't jump when it arrives.
   */
  static placeholder(progress: number, count = 512): PieceBitfield {
    const filled = Math.round(Math.min(Math.max(progress, 0), 1) * count)
    const bytes = new Uint8Array(Math.ceil(count / 8))
    for (let i = 0; i < filled; i++) bytes[i >> 3]! |= 0x80 >> (i & 7)
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
