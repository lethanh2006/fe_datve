import type { SeatSectionInput } from '../../api/types'
import { parseRows } from '../../lib/rows'

/** Một khu ghế ở dạng đang soạn (giá trị chuỗi từ ô nhập). */
export interface SectionDraft {
  key: number
  category: string
  rows: string
  seatsPerRow: string
  faceValue: string
}

export const newSection = (key: number, overrides: Partial<SectionDraft> = {}): SectionDraft => ({
  key,
  category: 'STANDARD',
  rows: 'A-D',
  seatsPerRow: '10',
  faceValue: '200000',
  ...overrides,
})

export const MAX_SEATS = 2000

export interface ParsedSections {
  sections: SeatSectionInput[]
  totalSeats: number
  /** Thông báo lỗi đầu tiên, null nếu hợp lệ */
  error: string | null
}

/** Kiểm tra và chuyển các khu đang soạn thành dữ liệu gửi API. */
export function parseSections(drafts: SectionDraft[]): ParsedSections {
  const sections: SeatSectionInput[] = []
  const seen = new Set<string>()
  let totalSeats = 0

  for (const [i, d] of drafts.entries()) {
    const label = `Khu ${i + 1}`
    const category = d.category.trim()
    if (!category) return { sections: [], totalSeats: 0, error: `${label}: hạng ghế không được để trống` }
    const rows = parseRows(d.rows)
    if (!rows) return { sections: [], totalSeats: 0, error: `${label}: hàng ghế không hợp lệ, ví dụ "A-D" hoặc "A, B, C"` }
    const seatsPerRow = Number(d.seatsPerRow)
    if (!Number.isInteger(seatsPerRow) || seatsPerRow < 1 || seatsPerRow > 100) {
      return { sections: [], totalSeats: 0, error: `${label}: số ghế mỗi hàng phải từ 1 đến 100` }
    }
    const faceValue = Number(d.faceValue)
    if (!Number.isFinite(faceValue) || faceValue < 0) {
      return { sections: [], totalSeats: 0, error: `${label}: giá vé không hợp lệ` }
    }
    for (const row of rows) {
      if (seen.has(row)) return { sections: [], totalSeats: 0, error: `Hàng ${row} bị trùng giữa các khu` }
      seen.add(row)
    }
    totalSeats += rows.length * seatsPerRow
    sections.push({ category, rows, seatsPerRow, faceValue })
  }
  if (totalSeats > MAX_SEATS) {
    return { sections: [], totalSeats, error: `Tối đa ${MAX_SEATS} ghế mỗi suất diễn (đang là ${totalSeats})` }
  }
  return { sections, totalSeats, error: null }
}
