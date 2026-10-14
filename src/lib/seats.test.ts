import { describe, expect, it } from 'vitest'
import type { Seat } from '../api/types'
import { aisleAfter, CATEGORY_COLOR_COUNT, categoryColorIndex, categoryLabel, compareRows, groupSeatsByRow, parseSeatCode } from './seats'

const seat = (id: number, seatCode: string, category = 'STANDARD'): Seat => ({
  id,
  seatCode,
  category,
  faceValue: 100000,
  status: 'AVAILABLE',
})

describe('parseSeatCode', () => {
  it('tách hàng và số ghế', () => {
    expect(parseSeatCode('A12')).toEqual({ row: 'A', number: 12 })
    expect(parseSeatCode('aa3')).toEqual({ row: 'AA', number: 3 })
  })
  it('mã lạ được coi là một hàng riêng', () => {
    expect(parseSeatCode('VIP')).toEqual({ row: 'VIP', number: 0 })
  })
})

describe('compareRows', () => {
  it('hàng một chữ cái đứng trước hàng hai chữ cái', () => {
    expect(['AA', 'B', 'A', 'AB', 'Z'].sort(compareRows)).toEqual(['A', 'B', 'Z', 'AA', 'AB'])
  })
})

describe('groupSeatsByRow', () => {
  it('gom theo hàng và sắp số ghế theo giá trị số (A2 trước A10)', () => {
    const rows = groupSeatsByRow([seat(1, 'B1'), seat(2, 'A10'), seat(3, 'A2'), seat(4, 'A1'), seat(5, 'AA1')])
    expect(rows.map((r) => r.row)).toEqual(['A', 'B', 'AA'])
    expect(rows[0]!.seats.map((s) => s.seatCode)).toEqual(['A1', 'A2', 'A10'])
  })
  it('danh sách rỗng cho kết quả rỗng', () => {
    expect(groupSeatsByRow([])).toEqual([])
  })
})

describe('categoryColorIndex', () => {
  it('hạng đã biết có màu cố định, không phân biệt hoa thường', () => {
    expect(categoryColorIndex('VIP')).toBe(0)
    expect(categoryColorIndex('standard')).toBe(1)
    expect(categoryColorIndex('ECONOMY')).toBe(2)
  })
  it('hạng lạ có màu ổn định nằm trong dải màu và không đè lên màu đã biết', () => {
    const idx = categoryColorIndex('Khán đài A')
    expect(idx).toBe(categoryColorIndex('Khán đài A'))
    expect(idx).toBeGreaterThanOrEqual(3)
    expect(idx).toBeLessThan(CATEGORY_COLOR_COUNT)
  })
})

describe('categoryLabel', () => {
  it('Việt hoá hạng quen thuộc, giữ nguyên hạng khác', () => {
    expect(categoryLabel('STANDARD')).toBe('Tiêu chuẩn')
    expect(categoryLabel('Balcony')).toBe('Balcony')
  })
})

describe('aisleAfter', () => {
  it('chỉ có lối đi giữa khi hàng từ 8 ghế trở lên', () => {
    expect(Array.from({ length: 7 }, (_, i) => aisleAfter(i, 7)).some(Boolean)).toBe(false)
    const flags = Array.from({ length: 10 }, (_, i) => aisleAfter(i, 10))
    expect(flags.indexOf(true)).toBe(4)
    expect(flags.filter(Boolean)).toHaveLength(1)
  })
})
