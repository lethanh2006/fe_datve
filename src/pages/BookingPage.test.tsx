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
  refundableUntil: null,
  refundedAt: null,
  showtimeCancelledAt: null,
  showtimeCancelReason: null,
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
    booking = makeBooking({
      status: 'CONFIRMED',
      ticketCode: '0123456789abcdef',
      checkedInAt: '2026-10-17T12:10:00.000Z',
    })
    mockFetch({ 'GET /api/bookings/7': () => ({ body: booking }) })
    renderBooking()
    expect(await screen.findByText('Đã soát vé · 19:10')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Huỷ vé và hoàn tiền' })).not.toBeInTheDocument()
  })

  it('suất đã huỷ ẩn QR và thông báo đang hoàn tiền', async () => {
    booking = makeBooking({
      status: 'CONFIRMED',
      ticketCode: '0123456789abcdef',
      showtimeCancelledAt: new Date().toISOString(),
      showtimeCancelReason: 'Nghệ sĩ bị ốm',
    })
    mockFetch({ 'GET /api/bookings/7': () => ({ body: booking }) })
    renderBooking()
    expect(await screen.findByText(/Tiền vé sẽ được hoàn tự động/)).toHaveTextContent('Nghệ sĩ bị ốm')
    expect(screen.queryByRole('img', { name: /Mã QR/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'In vé' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Xem các suất khác của sự kiện' })).toHaveAttribute('href', '/events/1')
  })

  it('vé đã soát của suất bị huỷ hướng dẫn liên hệ, không hứa hoàn tự động', async () => {
    booking = makeBooking({
      status: 'CONFIRMED',
      checkedInAt: new Date().toISOString(),
      showtimeCancelledAt: new Date().toISOString(),
    })
    mockFetch({ 'GET /api/bookings/7': () => ({ body: booking }) })
    renderBooking()
    expect(await screen.findByText(/Vé đã được soát trước khi huỷ suất/)).toBeInTheDocument()
    expect(screen.queryByText(/Tiền vé sẽ được hoàn tự động/)).not.toBeInTheDocument()
  })

  it('hoàn vé cần xác nhận; thành công xoá QR và hiện số tiền đã hoàn', async () => {
    booking = makeBooking({
      status: 'CONFIRMED',
      ticketCode: '0123456789abcdef',
      refundableUntil: new Date(Date.now() + 86400000).toISOString(),
    })
    const calls = mockFetch({
      'GET /api/bookings/7': () => ({ body: booking }),
      'POST /api/bookings/7/refund': () => {
        booking = { ...booking, status: 'CANCELLED', refundableUntil: null, refundedAt: new Date().toISOString() }
        return { body: booking }
      },
    })
    renderBooking()
    await userEvent.click(await screen.findByRole('button', { name: 'Huỷ vé và hoàn tiền' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText(/Số tiền hoàn/)).toHaveTextContent('1.000.000')
    expect(calls.filter((c) => c.method === 'POST')).toHaveLength(0)
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận hoàn tiền' }))
    expect(await screen.findByText('Đã hoàn tiền')).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /Mã QR/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(calls.find((c) => c.method === 'POST')).toMatchObject({ path: '/api/bookings/7/refund', body: {} })
  })

  it('hoàn tiền lỗi vẫn giữ vé và cho phép thử lại', async () => {
    booking = makeBooking({
      status: 'CONFIRMED',
      ticketCode: '0123456789abcdef',
      refundableUntil: new Date(Date.now() + 86400000).toISOString(),
    })
    mockFetch({
      'GET /api/bookings/7': () => ({ body: booking }),
      'POST /api/bookings/7/refund': () => ({
        status: 409,
        body: { code: 'REFUND_FAILED', message: 'Cổng thanh toán chưa hoàn tiền được' },
      }),
    })
    renderBooking()
    await userEvent.click(await screen.findByRole('button', { name: 'Huỷ vé và hoàn tiền' }))
    await userEvent.click(screen.getByRole('button', { name: 'Xác nhận hoàn tiền' }))
    expect(await screen.findByText('Cổng thanh toán chưa hoàn tiền được')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Mã QR/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Huỷ vé và hoàn tiền' })).toBeEnabled()
  })

  it('ẩn nút hoàn khi quá hạn, nhưng quản trị được hoàn ngoài hạn', async () => {
    booking = makeBooking({ status: 'CONFIRMED', refundableUntil: new Date(Date.now() - 3600000).toISOString() })
    localStorage.setItem('datve.token', 'admin-token')
    mockFetch({
      'GET /api/auth/me': () => ({ body: { id: 1, email: 'admin@test.com', fullName: 'Admin', role: 'ADMIN' } }),
      'GET /api/bookings/7': () => ({ body: booking }),
    })
    renderBooking()
    expect(await screen.findByText(/quyền quản trị để hoàn vé/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Huỷ vé và hoàn tiền' })).toBeEnabled()
  })

  it('khách không có nút hoàn vé khi đã quá hạn', async () => {
    booking = makeBooking({ status: 'CONFIRMED', refundableUntil: new Date(Date.now() - 3600000).toISOString() })
    mockFetch({ 'GET /api/bookings/7': () => ({ body: booking }) })
    renderBooking()
    expect(await screen.findByText(/Đã quá thời hạn tự hoàn vé/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Huỷ vé và hoàn tiền' })).not.toBeInTheDocument()
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
      'POST /api/bookings/7/payments': () =>
        ++attempt === 1 ? 'network-error' : { status: 200, body: payment('SUCCESS', 'CONFIRMED') },
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
      'GET /api/bookings/7': () => ({
        status: 404,
        body: { code: 'BOOKING_NOT_FOUND', message: 'Không tìm thấy đơn đặt vé có id 7' },
      }),
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
