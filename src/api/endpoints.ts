import { request } from './client'
import type {
  AdminEmail,
  AdminUser,
  AuthResponse,
  Booking,
  CheckInResponse,
  EmailStatus,
  BookingStatus,
  EventInput,
  EventSummary,
  Page,
  Payment,
  Role,
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
  updateProfile: (fullName: string) => request<User>('/api/auth/me', { method: 'PUT', body: { fullName } }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<AuthResponse>('/api/auth/password', { method: 'PUT', body: { currentPassword, newPassword } }),
  forgotPassword: (email: string) =>
    request<{ message: string }>('/api/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (token: string, password: string) =>
    request<void>('/api/auth/reset-password', { method: 'POST', body: { token, password } }),

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
  refundBooking: (id: number) => request<Booking>(`/api/bookings/${id}/refund`, { method: 'POST', body: {} }),
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
  checkIn: (ticketCode: string) =>
    request<CheckInResponse>('/api/admin/bookings/check-in', { method: 'POST', body: { ticketCode } }),
  adminUsers: (query: { q?: string; role?: Role; status?: 'ACTIVE' | 'DISABLED'; page?: number; size?: number }) =>
    request<Page<AdminUser>>('/api/admin/users', { query }),
  setUserRole: (id: number, role: Role) =>
    request<AdminUser>(`/api/admin/users/${id}/role`, { method: 'PUT', body: { role } }),
  setUserDisabled: (id: number, disabled: boolean) =>
    request<AdminUser>(`/api/admin/users/${id}/status`, { method: 'PUT', body: { disabled } }),
  adminEmails: (query: { status?: EmailStatus; page?: number; size?: number }) =>
    request<Page<AdminEmail>>('/api/admin/emails', { query }),
  retryEmail: (id: number) => request<{ message: string }>(`/api/admin/emails/${id}/retry`, { method: 'POST' }),
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
