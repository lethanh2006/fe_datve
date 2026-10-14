import { request } from './client'
import type {
  AuthResponse,
  Booking,
  BookingStatus,
  EventInput,
  EventSummary,
  Page,
  Payment,
  Seat,
  SeatSectionInput,
  Showtime,
  ShowtimeInput,
  Stats,
  User,
} from './types'

export const api = {
  // ---- tài khoản ----
  login: (email: string, password: string) =>
    request<AuthResponse>('/api/auth/login', { method: 'POST', body: { email, password } }),
  register: (email: string, password: string, fullName: string) =>
    request<AuthResponse>('/api/auth/register', { method: 'POST', body: { email, password, fullName } }),
  me: () => request<User>('/api/auth/me'),

  // ---- danh mục ----
  events: (query: { q?: string; category?: string; page?: number; size?: number }) =>
    request<Page<EventSummary>>('/api/events', { query }),
  categories: () => request<string[]>('/api/events/categories'),
  event: (id: number) => request<EventSummary>(`/api/events/${id}`),
  showtimes: (eventId: number) => request<Showtime[]>(`/api/events/${eventId}/showtimes`),
  showtime: (id: number) => request<Showtime>(`/api/showtimes/${id}`),
  seats: (showtimeId: number) => request<Seat[]>(`/api/showtimes/${showtimeId}/seats`),

  // ---- đặt vé & thanh toán ----
  createBooking: (showtimeId: number, seatIds: number[]) =>
    request<Booking>(`/api/showtimes/${showtimeId}/bookings`, { method: 'POST', body: { seatIds } }),
  myBookings: (query: { status?: BookingStatus; page?: number; size?: number }) =>
    request<Page<Booking>>('/api/bookings', { query }),
  booking: (id: number) => request<Booking>(`/api/bookings/${id}`),
  cancelBooking: (id: number) => request<Booking>(`/api/bookings/${id}/cancel`, { method: 'POST' }),
  pay: (bookingId: number, idempotencyKey: string, simulate?: 'SUCCESS' | 'FAILED') =>
    request<Payment>(`/api/bookings/${bookingId}/payments`, {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: simulate ? { simulate } : {},
    }),

  // ---- quản trị ----
  stats: () => request<Stats>('/api/admin/stats'),
  adminBookings: (query: { status?: BookingStatus; q?: string; page?: number; size?: number }) =>
    request<Page<Booking>>('/api/admin/bookings', { query }),
  createEvent: (input: EventInput) => request<EventSummary>('/api/admin/events', { method: 'POST', body: input }),
  updateEvent: (id: number, input: EventInput) =>
    request<EventSummary>(`/api/admin/events/${id}`, { method: 'PUT', body: input }),
  deleteEvent: (id: number) => request<void>(`/api/admin/events/${id}`, { method: 'DELETE' }),
  createShowtime: (eventId: number, input: ShowtimeInput) =>
    request<Showtime>(`/api/admin/events/${eventId}/showtimes`, { method: 'POST', body: input }),
  addSeats: (showtimeId: number, sections: SeatSectionInput[]) =>
    request<Showtime>(`/api/admin/showtimes/${showtimeId}/seats`, { method: 'POST', body: { sections } }),
  deleteShowtime: (id: number) => request<void>(`/api/admin/showtimes/${id}`, { method: 'DELETE' }),
}
