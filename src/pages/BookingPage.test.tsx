import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Booking, Payment } from '../api/types'
import { mockFetch, renderApp, resetApiState } from '../test/utils'
import { BookingPage } from './BookingPage'

const makeBooking = (over: Partial<Booking> = {}): Booking => ({
  id: 7,
  showtimeId: 3,
  eventId: 1,
  eventName: 'Đêm nhạc Trịnh',
  venue: 'Nhà hát Hòa Bình',
  startTime: '2026-10-17T12:30:00.000Z',
  endTime: '2026-10-17T14:30:00.000Z',
  status: 'PENDING',
  seats: [
    { seatId: 1, seatCode: 'A1', category: 'VIP', unitPrice: 500000, reservationStatus: 'HELD' },
    { seatId: 2, seatCode: 'A2', category: 'VIP', unitPrice: 500000, reservationStatus: 'HELD' },
  ],
  totalAmount: 1000000,
  expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
  createdAt: new Date().toISOString(),
  ticketCode: null,
  checkedInAt: null,
  ...over,
})

const payment = (status: Payment['status'], bookingStatus: Booking['status']): Payment => ({
  id: 1,
  bookingId: 7,
  status,
  amount: 1000000,
  provider: 'MOCK',
  providerReference: status === 'SUCCESS' ? 'MOCK-1' : null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  bookingStatus,
})

const renderBooking = () => renderApp(<BookingPage />, { route: '/bookings/7', path: '/bookings/:id' })
const payButton = () => screen.findByRole('button', { name: /^Thanh toán/ })

describe('BookingPage', () => {
  let booking: Booking

  beforeEach(() => {
    booking = makeBooking()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    resetApiState()
  })

  it('đơn chờ thanh toán: hiện ghế, tổng tiền và đồng hồ đếm ngược', async () => {
    mockFetch({ 'GET /api/bookings/7': () => ({ body: booking }) })
    renderBooking()

    expect(await screen.findByRole('heading', { name: 'Đơn DV-000007' })).toBeInTheDocument()
    expect(screen.getByText('Chờ thanh toán')).toBeInTheDocument()
    expect(screen.getByRole('timer')).toHaveTextContent(/0[45]:\d\d/)
    expect(await payButton()).toHaveTextContent(/1\.000\.000/)
    expect(screen.getByText('A1')).toBeInTheDocument()
  })

  it('thanh toán thành công: gửi Idempotency-Key và chuyển sang hiển thị vé', async () => {
    const calls = mockFetch({
      'GET /api/bookings/7': () => ({ body: booking }),
      'POST /api/bookings/7/payments': () => {
        booking = makeBooking({ status: 'CONFIRMED' })
        return { status: 201, body: payment('SUCCESS', 'CONFIRMED') }
      },
    })
    renderBooking()
    await userEvent.click(await payButton())

    expect(await screen.findByRole('article', { name: /Vé điện tử DV-000007/ })).toBeInTheDocument()
    const post = calls.find((c) => c.method === 'POST')!
    expect(post.headers.get('Idempotency-Key')).toMatch(/^[A-Za-z0-9_\-:.]{8,100}$/)
    expect(post.body).toEqual({})
  })

  it('đơn đã xác nhận hiện vé điện tử kèm mã QR và trạng thái soát vé', async () => {
    booking = makeBooking({ status: 'CONFIRMED', ticketCode: '0123456789abcdef' })
    mockFetch({ 'GET /api/bookings/7': () => ({ body: booking }) })
    renderBooking()

    expect(await screen.findByRole('img', { name: 'Mã QR của vé DV-000007' })).toBeInTheDocument()
    expect(screen.getByText('Đã thanh toán')).toBeInTheDocument()
  })

  it('vé đã được soát thì hiện giờ vào cửa', async () => {
    booking = makeBooking({ status: 'CONFIRMED', ticketCode: '0123456789abcdef', checkedInAt: '2026-10-17T12:10:00.000Z' })
    mockFetch({ 'GET /api/bookings/7': () => ({ body: booking }) })
    renderBooking()
    expect(await screen.findByText('Đã soát vé · 19:10')).toBeInTheDocument()
  })

  it('lần thanh toán thất bại xong thì thử lại bằng Idempotency-Key mới', async () => {
    const outcomes = [payment('FAILED', 'PENDING'), payment('SUCCESS', 'CONFIRMED')]
    const calls = mockFetch({
      'GET /api/bookings/7': () => ({ body: booking }),
      'POST /api/bookings/7/payments': () => ({ status: 201, body: outcomes.shift() }),
    })
    renderBooking()

    await userEvent.click(await payButton())
    await waitFor(() => expect(calls.filter((c) => c.method === 'POST')).toHaveLength(1))
    expect(await screen.findByText(/Thanh toán không thành công/)).toBeInTheDocument()

    await userEvent.click(await payButton())
    await waitFor(() => expect(calls.filter((c) => c.method === 'POST')).toHaveLength(2))
    const [first, second] = calls.filter((c) => c.method === 'POST').map((c) => c.headers.get('Idempotency-Key'))
    expect(first).toBeTruthy()
    expect(second).toBeTruthy()
    expect(second).not.toBe(first)
  })

  it('mất mạng giữa chừng thì thử lại với CÙNG Idempotency-Key để không bị trừ tiền hai lần', async () => {
    let attempt = 0
    const calls = mockFetch({
      'GET /api/bookings/7': () => ({ body: booking }),
      'POST /api/bookings/7/payments': () => (++attempt === 1 ? 'network-error' : { status: 200, body: payment('SUCCESS', 'CONFIRMED') }),
    })
    renderBooking()

    await userEvent.click(await payButton())
    expect(await screen.findByText(/Không kết nối được máy chủ/)).toBeInTheDocument()
    await userEvent.click(await payButton())

    await waitFor(() => expect(calls.filter((c) => c.method === 'POST')).toHaveLength(2))
    const keys = calls.filter((c) => c.method === 'POST').map((c) => c.headers.get('Idempotency-Key'))
    expect(keys[0]).toBe(keys[1])
  })

  it('đơn hết hạn: báo hết hạn và cho chọn ghế lại', async () => {
    booking = makeBooking({ status: 'EXPIRED' })
    mockFetch({ 'GET /api/bookings/7': () => ({ body: booking }) })
    renderBooking()

    expect(await screen.findByText(/Đơn đã hết thời gian giữ ghế/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Chọn ghế lại' })).toHaveAttribute('href', '/showtimes/3')
    expect(screen.queryByRole('button', { name: /^Thanh toán/ })).not.toBeInTheDocument()
  })

  it('đơn không tồn tại: hiện thông báo không tìm thấy', async () => {
    mockFetch({
      'GET /api/bookings/7': () => ({ status: 404, body: { code: 'BOOKING_NOT_FOUND', message: 'Không tìm thấy đơn đặt vé có id 7' } }),
    })
    renderBooking()
    expect(await screen.findByText('Không tìm thấy nội dung')).toBeInTheDocument()
  })

  it('huỷ đơn cần xác nhận và gọi API huỷ', async () => {
    const calls = mockFetch({
      'GET /api/bookings/7': () => ({ body: booking }),
      'POST /api/bookings/7/cancel': () => {
        booking = makeBooking({ status: 'CANCELLED' })
        return { body: booking }
      },
    })
    HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
      this.setAttribute('open', '')
    }
    renderBooking()

    await userEvent.click(await screen.findByRole('button', { name: 'Huỷ đơn' }))
    expect(calls.some((c) => c.path.endsWith('/cancel'))).toBe(false)
    const dialog = await screen.findByRole('dialog', { name: 'Huỷ đơn đặt vé?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Huỷ đơn' }))

    expect(await screen.findByText('Đã huỷ')).toBeInTheDocument()
    expect(calls.filter((c) => c.path.endsWith('/cancel'))).toHaveLength(1)
  })
})

