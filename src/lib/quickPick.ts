import type { Seat } from '../api/types'
import { aisleAfter, groupSeatsByRow } from './seats'

export interface QuickPickResult {
  seats: Seat[]
  /** true nếu tất cả ghế nằm liền nhau trên cùng một hàng */
  contiguous: boolean
}

// Điểm càng thấp càng tốt. Hàng gần sân khấu hơn được ưu tiên, trong hàng thì ưu tiên giữa hàng.
const ROW_PENALTY = 3
const CROSS_AISLE_PENALTY = 5

interface Slot {
  seat: Seat
  /** Có thể chọn được (còn trống và đúng hạng) */
  free: boolean
}

/**
 * Chọn nhanh `count` ghế đẹp nhất: ưu tiên các ghế LIỀN NHAU trong cùng một hàng (không bị chia cắt bởi lối đi),
 * gần sân khấu và gần giữa hàng. Không có thì chấp nhận dãy liền nhau nhưng vắt qua lối đi; vẫn không có thì chọn
 * rời rạc các ghế tốt nhất (`contiguous: false`). Trả về null nếu không đủ ghế trống.
 */
export function quickPick(seats: Seat[], count: number, category?: string): QuickPickResult | null {
  const rows = groupSeatsByRow(seats).map(({ seats: rowSeats }) => {
    const slots: Slot[] = rowSeats.map((seat) => ({
      seat,
      free: seat.status === 'AVAILABLE' && (!category || seat.category === category),
    }))
    return slots
  })
  const freeCount = rows.reduce((sum, row) => sum + row.filter((s) => s.free).length, 0)
  if (count < 1 || freeCount < count) return null

  for (const allowCrossAisle of [false, true]) {
    let best: { score: number; seats: Seat[] } | null = null
    for (const [rowIndex, row] of rows.entries()) {
      const center = (row.length - 1) / 2
      for (let start = 0; start + count <= row.length; start++) {
        const window = row.slice(start, start + count)
        if (!window.every((s) => s.free)) continue
        const crossesAisle = Array.from({ length: count - 1 }, (_, k) => aisleAfter(start + k, row.length)).some(Boolean)
        if (crossesAisle !== allowCrossAisle) continue
        const score =
          rowIndex * ROW_PENALTY + Math.abs(start + (count - 1) / 2 - center) + (crossesAisle ? CROSS_AISLE_PENALTY : 0)
        if (!best || score < best.score) best = { score, seats: window.map((s) => s.seat) }
      }
    }
    if (best) return { seats: best.seats, contiguous: true }
  }

  // Không có dãy liền nhau: lấy từng ghế tốt nhất
  const scattered = rows
    .flatMap((row, rowIndex) =>
      row
        .map((slot, i) => ({ slot, score: rowIndex * ROW_PENALTY + Math.abs(i - (row.length - 1) / 2) }))
        .filter(({ slot }) => slot.free),
    )
    .sort((a, b) => a.score - b.score)
    .slice(0, count)
  return { seats: scattered.map(({ slot }) => slot.seat), contiguous: count === 1 }
}
