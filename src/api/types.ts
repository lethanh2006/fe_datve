// Kiểu dữ liệu khớp với response của backend NestJS (BE_nestjs).

export type Role = 'USER' | 'ADMIN'

export type BookingStatus = 'PENDING' | 'PAYMENT_PROCESSING' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED'
export type SeatStatus = 'AVAILABLE' | 'HELD' | 'BOOKED'
export type ReservationStatus = 'HELD' | 'BOOKED' | 'RELEASED'
export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED'

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
