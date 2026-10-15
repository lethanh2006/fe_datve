import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Booking } from '../../api/types'
import { mockFetch, renderApp, resetApiState } from '../../test/utils'
import CheckInPage from './CheckInPage'

const booking = (over: Partial<Booking> = {}): Booking => ({
  id: 5,
  showtimeId: 1,
  eventId: 1,
  eventName: 'Đêm nhạc Trịnh',
  venue: 'Nhà hát Hòa Bình',
  startTime: '2026-10-17T12:30:00.000Z',
  endTime: '2026-10-17T14:30:00.000Z',
  status: 'CONFIRMED',
  seats: [
    { seatId: 1, seatCode: 'A1', category: 'VIP', unitPrice: 100, reservationStatus: 'BOOKED' },
    { seatId: 2, seatCode: 'A2', category: 'VIP', unitPrice: 100, reservationStatus: 'BOOKED' },
  ],
  totalAmount: 200,
  expiresAt: null,
  createdAt: '2026-10-14T00:00:00.000Z',
  ticketCode: '0123456789abcdef',
  checkedInAt: null,
  refundableUntil: null,
  refundedAt: null,
  showtimeCancelledAt: null,
  showtimeCancelReason: null,
  customer: { id: 2, email: 'khach@test.com', fullName: 'Nguyễn Văn Khách' },
  ...over,
})

// Camera thật không có trong jsdom: thay bằng nút giả lập việc đọc được mã
vi.mock('../../components/QrScanner', () => ({
  QrScanner: ({ onScan, paused }: { onScan: (text: string) => void; paused?: boolean }) => (
    <div>
      <span>camera-{paused ? 'tạm dừng' : 'chạy'}</span>
      <button type="button" onClick={() => onScan('  0123456789ABCDEF ')}>
        giả lập đọc mã
      </button>
    </div>
  ),
}))

const renderPage = () => renderApp(<CheckInPage />)

describe('CheckInPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    resetApiState()
  })

  it('quét vé hợp lệ: báo cho vào, hiện thông tin khách và đưa con trỏ về ô nhập', async () => {
    const calls = mockFetch({
      'POST /api/admin/bookings/check-in': () => ({ body: { result: 'CHECKED_IN', booking: booking() } }),
    })
    renderPage()
    const input = screen.getByLabelText('Mã vé')
    await userEvent.type(input, '  0123456789abcdef{Enter}')

    expect(await screen.findByText('Hợp lệ - cho vào')).toBeInTheDocument()
    expect(screen.getAllByText(/Nguyễn Văn Khách/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/A1, A2/).length).toBeGreaterThan(0)
    expect(calls[0]!.body).toEqual({ ticketCode: '0123456789abcdef' })
    await waitFor(() => expect(input).toHaveValue(''))
    expect(input).toHaveFocus()
  })

  it('vé đã quét trước đó: cảnh báo kèm giờ đã vào', async () => {
    mockFetch({
      'POST /api/admin/bookings/check-in': () => ({
        body: { result: 'ALREADY_CHECKED_IN', booking: booking({ checkedInAt: '2026-10-17T12:10:00.000Z' }) },
      }),
    })
    renderPage()
    await userEvent.type(screen.getByLabelText('Mã vé'), '0123456789abcdef{Enter}')
    expect(await screen.findByText('Vé đã được quét lúc 19:10')).toBeInTheDocument()
  })

  it('mã sai: báo lỗi và ghi vào lịch sử quét', async () => {
    mockFetch({
      'POST /api/admin/bookings/check-in': () => ({
        status: 404,
        body: { code: 'TICKET_NOT_FOUND', message: 'Mã vé không hợp lệ' },
      }),
    })
    renderPage()
    await userEvent.type(screen.getByLabelText('Mã vé'), 'saima{Enter}')

    expect(await screen.findByRole('heading', { name: 'Mã vé không hợp lệ' })).toBeInTheDocument()
    const history = screen.getByRole('list')
    expect(history).toHaveTextContent('saima')
    expect(history).toHaveTextContent('Lỗi')
  })

  it('không gửi yêu cầu khi ô nhập trống', async () => {
    const calls = mockFetch({})
    renderPage()
    expect(screen.getByRole('button', { name: 'Soát vé' })).toBeDisabled()
    await userEvent.type(screen.getByLabelText('Mã vé'), '   {Enter}')
    expect(calls).toHaveLength(0)
  })

  it('quét bằng camera: bật/tắt camera và gửi mã đã chuẩn hoá', async () => {
    const calls = mockFetch({
      'POST /api/admin/bookings/check-in': () => ({ body: { result: 'CHECKED_IN', booking: booking() } }),
    })
    renderPage()
    expect(screen.queryByText(/^camera-/)).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Quét bằng camera' }))
    expect(screen.getByText('camera-chạy')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'giả lập đọc mã' }))

    expect(await screen.findByText('Hợp lệ - cho vào')).toBeInTheDocument()
    expect(calls[0]!.body).toEqual({ ticketCode: '0123456789abcdef' })
    // camera vẫn bật để quét vé kế tiếp
    expect(screen.getByText('camera-chạy')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Tắt camera' }))
    expect(screen.queryByText(/^camera-/)).not.toBeInTheDocument()
  })

  it('phát âm báo theo kết quả và cho tắt âm báo', async () => {
    const beepSpy = vi.spyOn(await import('../../lib/beep'), 'beep').mockImplementation(() => {})
    let result: 'CHECKED_IN' | 'ALREADY_CHECKED_IN' = 'CHECKED_IN'
    mockFetch({
      'POST /api/admin/bookings/check-in': () => ({
        body: {
          result,
          booking: booking({ checkedInAt: result === 'ALREADY_CHECKED_IN' ? '2026-10-17T12:10:00.000Z' : null }),
        },
      }),
    })
    renderPage()
    await userEvent.type(screen.getByLabelText('Mã vé'), 'abc{Enter}')
    await screen.findByText('Hợp lệ - cho vào')
    expect(beepSpy).toHaveBeenLastCalledWith('ok')

    result = 'ALREADY_CHECKED_IN'
    await userEvent.type(screen.getByLabelText('Mã vé'), 'abc{Enter}')
    await screen.findByText(/Vé đã được quét lúc/)
    expect(beepSpy).toHaveBeenLastCalledWith('warn')

    beepSpy.mockClear()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Âm báo' }))
    await userEvent.type(screen.getByLabelText('Mã vé'), 'abc{Enter}')
    await screen.findByText(/Vé đã được quét lúc/)
    expect(beepSpy).not.toHaveBeenCalled()
  })
})
