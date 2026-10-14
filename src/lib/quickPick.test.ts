import { describe, expect, it } from 'vitest'
import type { Seat, SeatStatus } from '../api/types'
import { quickPick } from './quickPick'

let nextId = 1
/** Dựng hàng ghế từ chuỗi: "." trống, "x" đã bán, "h" đang giữ; ví dụ "..x.." */
function layout(rows: Record<string, string>, category = 'STANDARD'): Seat[] {
  return Object.entries(rows).flatMap(([row, pattern]) =>
    [...pattern].map((ch, i) => ({
      id: nextId++,
      seatCode: `${row}${i + 1}`,
      category,
      faceValue: 100000,
      status: (ch === 'x' ? 'BOOKED' : ch === 'h' ? 'HELD' : 'AVAILABLE') as SeatStatus,
    })),
  )
}
const codes = (r: ReturnType<typeof quickPick>) => r?.seats.map((s) => s.seatCode)

describe('quickPick', () => {
  it('chọn dãy liền nhau ở giữa hàng đầu', () => {
    const r = quickPick(layout({ A: '......', B: '......' }), 2)
    expect(codes(r)).toEqual(['A3', 'A4'])
    expect(r?.contiguous).toBe(true)
  })

  it('ưu tiên hàng gần sân khấu hơn là chính giữa hàng xa', () => {
    // hàng A chỉ còn ghế sát rìa; vẫn đẹp hơn hàng C đủ giữa nếu chênh lệch hàng nhỏ
    const r = quickPick(layout({ A: '.......x', B: 'xxxxxxxx' }), 1)
    expect(codes(r)).toEqual(['A4']) // trong hàng A, ghế gần giữa nhất (hàng 8 ghế: giữa là 4,5)
  })

  it('bỏ qua ghế đã bán hoặc đang giữ và tìm dãy liền nhau kế tiếp', () => {
    const r = quickPick(layout({ A: 'xhx...' }), 3)
    expect(codes(r)).toEqual(['A4', 'A5', 'A6'])
  })

  it('không chọn dãy bị chia cắt bởi lối đi khi còn dãy khác liền nhau', () => {
    // hàng 10 ghế có lối đi sau ghế 5; hàng A chỉ còn 4,5 | 6,7 trống ở hai bên lối đi, hàng B có 2 ghế liền ở rìa
    const r = quickPick(layout({ A: 'xxx..' + '..xxx', B: '..xxxxxxxx' }), 2)
    expect(codes(r)).toEqual(['A4', 'A5']) // dãy nằm trọn một bên lối đi, tốt hơn dãy A5-A6 vắt qua lối đi
    expect(r?.contiguous).toBe(true)
  })

  it('chỉ còn dãy vắt qua lối đi thì vẫn chọn dãy đó', () => {
    const r = quickPick(layout({ A: 'xxxx..' + 'xxxx' }), 2)
    expect(codes(r)).toEqual(['A5', 'A6'])
    expect(r?.contiguous).toBe(true)
    const across = quickPick(layout({ A: 'xxxx.' + '.xxxx' }), 2)
    expect(codes(across)).toEqual(['A5', 'A6'])
    expect(across?.contiguous).toBe(true)
  })

  it('không có dãy liền nhau thì chọn rời rạc các ghế tốt nhất và báo contiguous=false', () => {
    const r = quickPick(layout({ A: '.x.x.x.x' }), 3)
    expect(r?.contiguous).toBe(false)
    expect(r?.seats).toHaveLength(3)
    expect(new Set(r?.seats.map((s) => s.id)).size).toBe(3)
  })

  it('lọc theo hạng ghế', () => {
    const seats = [...layout({ A: '....' }, 'VIP'), ...layout({ B: '....' }, 'STANDARD')]
    expect(codes(quickPick(seats, 2, 'STANDARD'))).toEqual(['B2', 'B3'])
    expect(codes(quickPick(seats, 2, 'VIP'))).toEqual(['A2', 'A3'])
    expect(quickPick(seats, 2, 'ECONOMY')).toBeNull()
  })

  it('trả null khi không đủ ghế trống hoặc số lượng không hợp lệ', () => {
    expect(quickPick(layout({ A: '.x.x' }), 3)).toBeNull()
    expect(quickPick(layout({ A: '....' }), 0)).toBeNull()
    expect(quickPick([], 1)).toBeNull()
  })

  it('một ghế lẻ luôn là liền nhau', () => {
    expect(quickPick(layout({ A: 'xxx.' }), 1)?.contiguous).toBe(true)
  })

  it('đặt đủ 10 ghế liền nhau trong hàng dài', () => {
    const r = quickPick(layout({ A: '.'.repeat(14) }), 10)
    expect(r?.seats).toHaveLength(10)
    expect(r?.contiguous).toBe(true)
  })
})
