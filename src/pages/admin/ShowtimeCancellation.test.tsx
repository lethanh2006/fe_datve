import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CancellationStatus, Showtime } from '../../api/types'
import { mockFetch, renderApp, resetApiState } from '../../test/utils'
import { CancellationProgress, CancelShowtimeForm } from './ShowtimeCancellation'

const showtime: Showtime = {
  id: 3,
  eventId: 1,
  startTime: '2030-01-01T12:00:00Z',
  endTime: '2030-01-01T14:00:00Z',
  totalSeats: 10,
  availableSeats: 5,
  minPrice: 100000,
  cancelledAt: null,
  cancelReason: null,
}
const progress: CancellationStatus = {
  showtimeId: 3,
  cancelledAt: '2026-10-15T10:00:00Z',
  reason: 'Nghệ sĩ bị ốm',
  pendingRefunds: 0,
  refunded: 3,
  checkedIn: 0,
  paymentsInProgress: 0,
  failures: [],
}
afterEach(() => {
  vi.unstubAllGlobals()
  resetApiState()
})

describe('huỷ suất diễn', () => {
  it('chỉ gửi khi khách xác nhận lý do hợp lệ; thành công đóng form', async () => {
    const calls = mockFetch({ 'POST /api/admin/showtimes/3/cancel': () => ({ status: 202, body: progress }) })
    const onDone = vi.fn()
    renderApp(<CancelShowtimeForm showtime={showtime} onDone={onDone} onCancel={vi.fn()} />)
    expect(calls).toHaveLength(0)
    await userEvent.type(screen.getByLabelText('Lý do huỷ (gửi cho khách)'), '  Nghệ sĩ bị ốm  ')
    await userEvent.click(screen.getByRole('button', { name: 'Huỷ suất diễn' }))
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1))
    expect(calls[0]?.body).toEqual({ reason: 'Nghệ sĩ bị ốm' })
  })
  it('API từ chối thì giữ lý do và không đóng form', async () => {
    mockFetch({
      'POST /api/admin/showtimes/3/cancel': () => ({
        status: 409,
        body: { code: 'SHOWTIME_ENDED', message: 'Suất diễn đã kết thúc' },
      }),
    })
    const onDone = vi.fn()
    renderApp(<CancelShowtimeForm showtime={showtime} onDone={onDone} onCancel={vi.fn()} />)
    await userEvent.type(screen.getByLabelText('Lý do huỷ (gửi cho khách)'), 'Nghệ sĩ bị ốm')
    await userEvent.click(screen.getByRole('button', { name: 'Huỷ suất diễn' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Suất diễn đã kết thúc')
    expect(onDone).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Lý do huỷ (gửi cho khách)')).toHaveValue('Nghệ sĩ bị ốm')
  })
  it('hiện đơn hoàn lỗi, đơn đang thanh toán và vé cần xử lý riêng', async () => {
    mockFetch({
      'GET /api/admin/showtimes/3/cancellation': () => ({
        body: {
          ...progress,
          pendingRefunds: 1,
          checkedIn: 2,
          paymentsInProgress: 1,
          failures: [{ bookingId: 7, attempts: 2, error: 'Cổng tạm thời lỗi' }],
        },
      }),
    })
    renderApp(<CancellationProgress showtime={{ ...showtime, cancelledAt: progress.cancelledAt }} />)
    const list = await screen.findByRole('list', { name: 'Tiến độ hoàn tiền' })
    expect(list).toHaveTextContent('Đã hoàn tiền: 3 đơn')
    expect(list).toHaveTextContent('2 vé đã soát tại cửa')
    expect(list).toHaveTextContent('1 đơn đang thanh toán dở')
    expect(list).toHaveTextContent('DV-000007: Cổng tạm thời lỗi')
  })
  it('lỗi tải tiến độ có thể bấm tải lại', async () => {
    let retry = false
    mockFetch({ 'GET /api/admin/showtimes/3/cancellation': () => (retry ? { body: progress } : 'network-error') })
    renderApp(<CancellationProgress showtime={{ ...showtime, cancelledAt: progress.cancelledAt }} />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Không kết nối được máy chủ')
    retry = true
    await userEvent.click(screen.getByRole('button', { name: 'Tải lại tiến độ' }))
    expect(await screen.findByRole('list', { name: 'Tiến độ hoàn tiền' })).toHaveTextContent('Đã hoàn tiền: 3 đơn')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
