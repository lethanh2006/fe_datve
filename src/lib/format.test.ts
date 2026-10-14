import { describe, expect, it } from 'vitest'
import { bookingCode, formatCompact, formatCountdown, formatDayMonth, formatDate, formatDateTime, formatTime, formatTimeRange, formatVnd, zonedInputToIso } from './format'

describe('formatVnd', () => {
  it('dùng dấu chấm ngăn cách hàng nghìn và ký hiệu đồng', () => {
    expect(formatVnd(1050000)).toMatch(/^1\.050\.000\s?₫$/)
    expect(formatVnd(0)).toMatch(/^0\s?₫$/)
  })
})

describe('định dạng ngày giờ theo múi giờ của sự kiện', () => {
  // 12:30 UTC = 19:30 giờ Việt Nam, bất kể máy chạy test ở múi giờ nào
  const iso = '2026-10-17T12:30:00.000Z'

  it('hiển thị giờ Việt Nam', () => {
    expect(formatTime(iso)).toBe('19:30')
    expect(formatDate(iso)).toContain('17/10/2026')
    expect(formatDateTime(iso)).toMatch(/17\/10\/2026 · 19:30$/)
    expect(formatTimeRange(iso, '2026-10-17T14:30:00.000Z')).toBe('19:30 - 21:30')
  })

  it('qua nửa đêm giờ Việt Nam thì sang ngày kế tiếp', () => {
    expect(formatDate('2026-10-17T17:30:00.000Z')).toContain('18/10/2026')
  })
})

describe('bookingCode', () => {
  it('đệm số 0 đến 6 chữ số', () => {
    expect(bookingCode(12)).toBe('DV-000012')
    expect(bookingCode(1234567)).toBe('DV-1234567')
  })
})

describe('formatCountdown', () => {
  it('định dạng mm:ss và không bao giờ âm', () => {
    expect(formatCountdown(65)).toBe('01:05')
    expect(formatCountdown(300)).toBe('05:00')
    expect(formatCountdown(0)).toBe('00:00')
    expect(formatCountdown(-5)).toBe('00:00')
    expect(formatCountdown(59.9)).toBe('00:59')
  })
})

describe('zonedInputToIso', () => {
  it('đọc giờ nhập theo múi giờ chỉ định', () => {
    expect(zonedInputToIso('2026-10-20T19:30', 'Asia/Ho_Chi_Minh')).toBe('2026-10-20T12:30:00.000Z')
    expect(zonedInputToIso('2026-10-20T19:30:15', 'Asia/Ho_Chi_Minh')).toBe('2026-10-20T12:30:15.000Z')
  })

  it('xử lý đúng múi giờ có giờ mùa hè', () => {
    expect(zonedInputToIso('2026-07-01T09:00', 'America/New_York')).toBe('2026-07-01T13:00:00.000Z')
    expect(zonedInputToIso('2026-01-15T09:00', 'America/New_York')).toBe('2026-01-15T14:00:00.000Z')
  })

  it('trả null khi chuỗi không hợp lệ', () => {
    expect(zonedInputToIso('')).toBeNull()
    expect(zonedInputToIso('20/10/2026 19:30')).toBeNull()
    expect(zonedInputToIso('2026-13-45T99:99')).toBeNull()
    expect(zonedInputToIso('2026-02-30T10:00')).toBeNull()
    expect(zonedInputToIso('2026-02-28T24:00')).toBeNull()
  })
})

describe('formatDayMonth', () => {
  it('đổi YYYY-MM-DD sang DD/MM mà không bị lệch múi giờ', () => {
    expect(formatDayMonth('2026-10-01')).toBe('01/10')
    expect(formatDayMonth('2026-12-31')).toBe('31/12')
  })
})

describe('formatCompact', () => {
  it('rút gọn số lớn cho nhãn biểu đồ', () => {
    expect(formatCompact(0)).toBe('0')
    expect(formatCompact(1_400_000)).toMatch(/^1,4\s?Tr$/)
  })
})
