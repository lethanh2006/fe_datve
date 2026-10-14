import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Booking, Seat } from '../api/types'
import { FakeEventSource } from '../test/fake-event-source'
import { mockFetch, renderApp, resetApiState } from '../test/utils'
import { SeatSelectionPage } from './SeatSelectionPage'

const showtime = {
  id: 3,
  eventId: 1,
  startTime: new Date(Date.now() + 86_400_000).toISOString(),
  endTime: new Date(Date.now() + 93_600_000).toISOString(),
  totalSeats: 12,
  availableSeats: 12,
  minPrice: 100000,
}
const event = {
  id: 1,
  name: 'Đêm nhạc Trịnh',
  description: null,
  venue: 'Nhà hát Hòa Bình',
  imageUrl: null,
  category: 'Âm nhạc',
  nextShowtime: showtime.startTime,
  minPrice: 100000,
}
const makeSeats = (n: number): Seat[] =>
  Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    seatCode: `A${i + 1}`,
    category: 'STANDARD',
    faceValue: 100000,
    status: 'AVAILABLE',
  }))

const baseRoutes = (seats: () => Seat[]) => ({
  'GET /api/showtimes/3': () => ({ body: showtime }),
  'GET /api/events/1': () => ({ body: event }),
  'GET /api/showtimes/3/seats': () => ({ body: seats() }),
})

const render = () => renderApp(<SeatSelectionPage />, { route: '/showtimes/3', path: '/showtimes/:id' })
const seatButton = (code: string) => screen.findByRole('button', { name: new RegExp(`^Ghế ${code},`) })

describe('SeatSelectionPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    resetApiState()
  })

  it('chọn ghế cập nhật danh sách và tạm tính', async () => {
    mockFetch(baseRoutes(() => makeSeats(12)))
    render()

    await userEvent.click(await seatButton('A1'))
    await userEvent.click(await seatButton('A2'))

    const list = screen.getByRole('list', { name: 'Ghế đã chọn' })
    expect(list).toHaveTextContent('A1')
    expect(list).toHaveTextContent('A2')
    expect(screen.getByText(/Tạm tính \(2\/10 ghế\)/)).toBeInTheDocument()
    expect(screen.getAllByText(/200\.000/).length).toBeGreaterThan(0)

    await userEvent.click(screen.getByRole('button', { name: 'Bỏ chọn ghế A1' }))
    expect(screen.getByText(/Tạm tính \(1\/10 ghế\)/)).toBeInTheDocument()
  })

  it('nhận sự kiện SSE thì tải lại sơ đồ ghế ngay, không chờ chu kỳ làm mới', async () => {
    FakeEventSource.instances = []
    vi.stubGlobal('EventSource', FakeEventSource)
    let seats = makeSeats(3)
    const calls = mockFetch(baseRoutes(() => seats))
    render()
    await seatButton('A1')
    expect(FakeEventSource.last().url).toBe('/api/showtimes/3/seats/events')
    const before = calls.filter((c) => c.path === '/api/showtimes/3/seats').length

    // người khác vừa giữ A1: server báo qua luồng SSE
    seats = seats.map((s) => (s.id === 1 ? { ...s, status: 'HELD' as const } : s))
    act(() => FakeEventSource.last().emit('seats'))

    await waitFor(() => expect(screen.getByRole('button', { name: /^Ghế A1,.*đang được giữ/ })).toBeDisabled())
    expect(calls.filter((c) => c.path === '/api/showtimes/3/seats').length).toBeGreaterThan(before)
  })

  it('chọn nhanh: chọn dãy ghế liền nhau đẹp nhất và thay thế lựa chọn cũ', async () => {
    mockFetch(baseRoutes(() => makeSeats(12)))
    render()
    await userEvent.click(await seatButton('A12'))
    await userEvent.selectOptions(screen.getByLabelText('Số ghế'), '3')
    await userEvent.click(screen.getByRole('button', { name: 'Chọn nhanh' }))

    const list = screen.getByRole('list', { name: 'Ghế đã chọn' })
    expect(list).not.toHaveTextContent('A12')
    // hàng 12 ghế có lối đi sau ghế 6; dãy 3 ghế đẹp nhất nằm trọn một bên, gần giữa
    expect(list).toHaveTextContent('A4')
    expect(list).toHaveTextContent('A5')
    expect(list).toHaveTextContent('A6')
    expect(screen.getByText(/Tạm tính \(3\/10 ghế\)/)).toBeInTheDocument()
  })

  it('chọn nhanh: báo khi không còn đủ ghế', async () => {
    const seats = makeSeats(3).map((s, i) => (i === 0 ? s : { ...s, status: 'BOOKED' as const }))
    mockFetch(baseRoutes(() => seats))
    render()
    await seatButton('A1')
    await userEvent.selectOptions(screen.getByLabelText('Số ghế'), '2')
    await userEvent.click(screen.getByRole('button', { name: 'Chọn nhanh' }))
    expect(await screen.findByText('Không còn đủ 2 ghế trống')).toBeInTheDocument()
  })

  it('không cho chọn quá 10 ghế', async () => {
    mockFetch(baseRoutes(() => makeSeats(12)))
    render()
    for (let i = 1; i <= 10; i++) await userEvent.click(await seatButton(`A${i}`))
    await userEvent.click(await seatButton('A11'))

    expect(await screen.findByText('Mỗi lần đặt tối đa 10 ghế')).toBeInTheDocument()
    expect(screen.getByText(/Tạm tính \(10\/10 ghế\)/)).toBeInTheDocument()
  })

  it('chưa đăng nhập: nút giữ ghế dẫn tới trang đăng nhập', async () => {
    mockFetch(baseRoutes(() => makeSeats(3)))
    render()
    await userEvent.click(await seatButton('A1'))
    await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập để giữ ghế' }))
    expect(await screen.findByTestId('elsewhere')).toBeInTheDocument()
  })

  describe('đã đăng nhập', () => {
    const loggedIn = { 'GET /api/auth/me': () => ({ body: { id: 1, email: 'a@test.com', fullName: 'A', role: 'USER' } }) }

    it('giữ ghế gửi đúng danh sách ghế rồi chuyển tới trang đơn', async () => {
      localStorage.setItem('datve.token', 'tok')
      const created = { id: 9 } as Booking
      const calls = mockFetch({
        ...loggedIn,
        ...baseRoutes(() => makeSeats(12)),
        'POST /api/showtimes/3/bookings': () => ({ status: 201, body: created }),
      })
      render()

      await userEvent.click(await seatButton('A3'))
      await userEvent.click(await seatButton('A1'))
      const submit = await screen.findByRole('button', { name: 'Giữ ghế trong 5 phút' })
      await waitFor(() => expect(submit).toBeEnabled())
      await userEvent.click(submit)

      expect(await screen.findByTestId('elsewhere')).toBeInTheDocument()
      const post = calls.find((c) => c.method === 'POST')!
      expect([...(post.body as { seatIds: number[] }).seatIds].sort()).toEqual([1, 3])
      expect(post.headers.get('Authorization')).toBe('Bearer tok')
    })

    it('đã đăng nhập mà chưa chọn ghế thì nút giữ ghế bị khoá', async () => {
      localStorage.setItem('datve.token', 'tok')
      mockFetch({ ...loggedIn, ...baseRoutes(() => makeSeats(3)) })
      render()
      expect(await screen.findByRole('button', { name: 'Giữ ghế trong 5 phút' })).toBeDisabled()
    })

    it('ghế vừa bị người khác giữ: báo lỗi và bỏ khỏi lựa chọn', async () => {
      localStorage.setItem('datve.token', 'tok')
      let seats = makeSeats(3)
      mockFetch({
        ...loggedIn,
        ...baseRoutes(() => seats),
        'POST /api/showtimes/3/bookings': () => {
          seats = seats.map((s) => (s.id === 1 ? { ...s, status: 'HELD' as const } : s))
          return { status: 409, body: { code: 'SEAT_UNAVAILABLE', message: 'Một hoặc nhiều ghế không còn trống' } }
        },
      })
      render()

      await userEvent.click(await seatButton('A1'))
      await userEvent.click(await seatButton('A2'))
      const submit = await screen.findByRole('button', { name: 'Giữ ghế trong 5 phút' })
      await waitFor(() => expect(submit).toBeEnabled())
      await userEvent.click(submit)

      expect(await screen.findByText('Một hoặc nhiều ghế không còn trống')).toBeInTheDocument()
      // sau khi tải lại sơ đồ, A1 bị khoá và rơi khỏi lựa chọn, A2 vẫn còn
      await waitFor(() => expect(screen.getByRole('button', { name: /^Ghế A1,.*đang được giữ/ })).toBeDisabled())
      expect(screen.getByRole('list', { name: 'Ghế đã chọn' })).not.toHaveTextContent('A1')
      expect(screen.getByRole('list', { name: 'Ghế đã chọn' })).toHaveTextContent('A2')
    })
  })
})
