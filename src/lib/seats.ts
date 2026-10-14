import type { Seat } from '../api/types'

export interface ParsedSeatCode {
  row: string
  number: number
}

/** "A12" -> { row: "A", number: 12 }; mã không đúng dạng chữ + số được coi là hàng riêng. */
export function parseSeatCode(code: string): ParsedSeatCode {
  const match = /^([A-Za-z]+)(\d+)$/.exec(code)
  if (!match) return { row: code, number: 0 }
  return { row: match[1]!.toUpperCase(), number: Number(match[2]) }
}

/** Hàng ngắn đứng trước (A, B, ..., Z, AA, AB, ...) rồi mới theo thứ tự chữ cái. */
export function compareRows(a: string, b: string): number {
  return a.length - b.length || a.localeCompare(b)
}

export interface SeatRow {
  row: string
  seats: Seat[]
}

/** Gom ghế theo hàng, hàng và ghế đều sắp theo thứ tự tự nhiên. */
export function groupSeatsByRow(seats: Seat[]): SeatRow[] {
  const rows = new Map<string, Seat[]>()
  for (const seat of seats) {
    const { row } = parseSeatCode(seat.seatCode)
    const list = rows.get(row)
    if (list) list.push(seat)
    else rows.set(row, [seat])
  }
  return [...rows.entries()]
    .sort(([a], [b]) => compareRows(a, b))
    .map(([row, list]) => ({
      row,
      seats: [...list].sort((x, y) => parseSeatCode(x.seatCode).number - parseSeatCode(y.seatCode).number),
    }))
}

const KNOWN_CATEGORIES: Record<string, number> = { VIP: 0, STANDARD: 1, ECONOMY: 2 }
export const CATEGORY_COLOR_COUNT = 8

/** Chỉ số màu (0..7) cho hạng ghế; hạng đã biết có màu cố định, hạng lạ được băm ổn định. */
export function categoryColorIndex(category: string): number {
  const known = KNOWN_CATEGORIES[category.toUpperCase()]
  if (known !== undefined) return known
  let hash = 0
  for (const ch of category) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return 3 + (hash % (CATEGORY_COLOR_COUNT - 3))
}

const CATEGORY_LABELS: Record<string, string> = { VIP: 'VIP', STANDARD: 'Tiêu chuẩn', ECONOMY: 'Tiết kiệm' }

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category.toUpperCase()] ?? category
}

/** Chèn lối đi ở giữa hàng khi hàng đủ dài (>= 8 ghế). */
export const aisleAfter = (index: number, total: number) => total >= 8 && index === Math.ceil(total / 2) - 1
