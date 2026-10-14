import type { BookingStatus } from '../api/types'

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  PENDING: 'Chờ thanh toán',
  PAYMENT_PROCESSING: 'Đang thanh toán',
  CONFIRMED: 'Đã xác nhận',
  CANCELLED: 'Đã huỷ',
  EXPIRED: 'Hết hạn',
}

export type Tone = 'warning' | 'info' | 'success' | 'neutral' | 'danger'

export const BOOKING_STATUS_TONE: Record<BookingStatus, Tone> = {
  PENDING: 'warning',
  PAYMENT_PROCESSING: 'info',
  CONFIRMED: 'success',
  CANCELLED: 'neutral',
  EXPIRED: 'danger',
}

export const BOOKING_STATUSES: BookingStatus[] = ['PENDING', 'PAYMENT_PROCESSING', 'CONFIRMED', 'CANCELLED', 'EXPIRED']
