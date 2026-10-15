// Kiểu dữ liệu khớp với response của backend NestJS (BE_nestjs).

export type Role = 'USER' | 'ADMIN'

export type BookingStatus = 'PENDING' | 'PAYMENT_PROCESSING' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED'
export type SeatStatus = 'AVAILABLE' | 'HELD' | 'BOOKED'
export type ReservationStatus = 'HELD' | 'BOOKED' | 'RELEASED'
export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'REFUNDED'

export interface User {
  id: number
  email: string
  fullName: string
  role: Role
}

export interface AuthResponse {
  accessToken: string
  tokenType: 'Bearer'
  expiresIn: number
  user: User
}

export interface Page<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface EventSummary {
  id: number
  name: string
  description: string | null
  venue: string
  imageUrl: string | null
  category: string | null
  nextShowtime: string | null
  minPrice: number | null
}

export interface Showtime {
  id: number
  eventId: number
  startTime: string
  endTime: string
  totalSeats: number
  availableSeats: number
  minPrice: number | null
  /** Thời điểm suất diễn bị huỷ, null nếu vẫn diễn ra */
  cancelledAt: string | null
  cancelReason: string | null
}

export interface Seat {
  id: number
  seatCode: string
  category: string
  faceValue: number
  status: SeatStatus
}

export interface BookingSeat {
  seatId: number
  seatCode: string
  category: string
  unitPrice: number
  reservationStatus: ReservationStatus
}

export interface Booking {
  id: number
  showtimeId: number
  eventId: number
  eventName: string
  venue: string
  startTime: string
  endTime: string
  status: BookingStatus
  seats: BookingSeat[]
  totalAmount: number
  expiresAt: string | null
  createdAt: string
  /** Mã vé (nội dung QR), chỉ có khi đơn đã xác nhận */
  ticketCode: string | null
  /** Thời điểm soát vé tại cửa, null nếu chưa vào */
  checkedInAt: string | null
  refundableUntil: string | null
  refundedAt: string | null
  /** Suất diễn bị huỷ thì đơn được hoàn tiền tự động */
  showtimeCancelledAt: string | null
  showtimeCancelReason: string | null
  customer?: { id: number; email: string; fullName: string }
}

export interface Payment {
  id: number
  bookingId: number
  status: PaymentStatus
  amount: number
  provider: string
  providerReference: string | null
  createdAt: string
  updatedAt: string
  bookingStatus: BookingStatus
}

export interface Stats {
  events: number
  upcomingShowtimes: number
  users: number
  bookingsByStatus: Record<BookingStatus, number>
  seatsSold: number
  revenue: number
  daily: { date: string; confirmedBookings: number; revenue: number }[]
  topEvents: { eventId: number; name: string; seatsSold: number; revenue: number }[]
}

// ---- request ----

export interface EventInput {
  name: string
  description?: string
  venue: string
  imageUrl?: string
  category?: string
}

export interface SeatSectionInput {
  category: string
  rows: string[]
  seatsPerRow: number
  faceValue: number
}

export interface ShowtimeInput {
  startTime: string
  endTime: string
  sections?: SeatSectionInput[]
}

export interface CheckInResponse {
  /** CHECKED_IN: vào cửa lần đầu; ALREADY_CHECKED_IN: vé đã được quét trước đó */
  result: 'CHECKED_IN' | 'ALREADY_CHECKED_IN'
  booking: Booking
}

export interface AdminUser {
  id: number
  email: string
  fullName: string
  role: Role
  createdAt: string
  /** Thời điểm bị khoá, null nếu đang hoạt động */
  disabledAt: string | null
  confirmedBookings: number
  totalSpent: number
}

export type EmailStatus = 'PENDING' | 'SENT' | 'FAILED'

export interface AdminEmail {
  id: number
  to: string
  subject: string
  status: EmailStatus
  attempts: number
  nextAttemptAt: string
  lastError: string | null
  createdAt: string
  sentAt: string | null
}

export interface CancellationStatus {
  showtimeId: number
  cancelledAt: string
  reason: string | null
  /** Đơn đã thanh toán, chưa soát vé và chưa được hoàn tiền */
  pendingRefunds: number
  refunded: number
  /** Đơn đã soát vé trước khi huỷ nên không tự hoàn */
  checkedIn: number
  /** Đơn đang thanh toán dở; xong thì sẽ tự được hoàn */
  paymentsInProgress: number
  failures: { bookingId: number; attempts: number; error: string }[]
}
