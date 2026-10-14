const TIME_ZONE = import.meta.env.VITE_TIME_ZONE || 'Asia/Ho_Chi_Minh'

const currency = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 })

/** 1050000 -> "1.050.000 ₫" */
export function formatVnd(amount: number): string {
  return currency.format(amount)
}

const dateFormat = new Intl.DateTimeFormat('vi-VN', {
  timeZone: TIME_ZONE,
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})
const timeFormat = new Intl.DateTimeFormat('vi-VN', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

/** "T6, 17/10/2026" theo múi giờ của sự kiện */
export const formatDate = (iso: string) => dateFormat.format(new Date(iso))

/** "19:30" */
export const formatTime = (iso: string) => timeFormat.format(new Date(iso))

/** Ngày dạng "2026-10-17" (đã là ngày địa phương từ API) -> "17/10", không qua đổi múi giờ. */
export function formatDayMonth(ymd: string): string {
  const [, month, day] = ymd.split('-')
  return month && day ? `${day}/${month}` : ymd
}

const compactNumber = new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 })

/** 1_400_000 -> "1,4 Tr" (dùng cho nhãn trục biểu đồ). */
export const formatCompact = (n: number) => compactNumber.format(n)

/** "T6, 17/10/2026 · 19:30" */
export const formatDateTime = (iso: string) => `${formatDate(iso)} · ${formatTime(iso)}`

/** "19:30 - 21:30" */
export const formatTimeRange = (startIso: string, endIso: string) => `${formatTime(startIso)} - ${formatTime(endIso)}`

/** Mã đơn hiển thị cho người dùng: DV-000123 */
export const bookingCode = (id: number) => `DV-${String(id).padStart(6, '0')}`

/** Độ lệch (ms) của múi giờ `timeZone` so với UTC tại thời điểm `timestamp`. */
function zoneOffsetMs(timeZone: string, timestamp: number): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(timestamp))
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return asUtc - Math.floor(timestamp / 1000) * 1000
}

/**
 * Giá trị <input type="datetime-local"> ("2026-10-20T19:30") là giờ ở múi giờ của sự kiện,
 * không phụ thuộc múi giờ máy admin. Trả về ISO UTC, hoặc null nếu không hợp lệ.
 */
export function zonedInputToIso(value: string, timeZone: string = TIME_ZONE): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value)
  if (!m) return null
  const [, y, mo, d, h, mi, s] = m
  const wallAsUtc = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s ?? 0))
  // Date.UTC tự cuộn ngày giờ vượt giới hạn (tháng 13, 45/2...), nên đối chiếu lại để từ chối giá trị vô lý
  const check = new Date(wallAsUtc)
  if (
    check.getUTCFullYear() !== Number(y) ||
    check.getUTCMonth() !== Number(mo) - 1 ||
    check.getUTCDate() !== Number(d) ||
    check.getUTCHours() !== Number(h) ||
    check.getUTCMinutes() !== Number(mi) ||
    check.getUTCSeconds() !== Number(s ?? 0)
  ) {
    return null
  }
  // Lặp hai lần để xử lý đúng khi múi giờ có DST
  let ts = wallAsUtc - zoneOffsetMs(timeZone, wallAsUtc)
  ts = wallAsUtc - zoneOffsetMs(timeZone, ts)
  const date = new Date(ts)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

/** "mm:ss" từ số giây còn lại (không âm). */
export function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const mm = String(Math.floor(s / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return `${mm}:${ss}`
}
