import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import { api } from '../api/endpoints'
import type { Booking } from '../api/types'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Countdown } from '../components/Countdown'
import { Icon } from '../components/Icon'
import { StatusBadge } from '../components/StatusBadge'
import { ErrorState, Spinner } from '../components/States'
import { errorMessage } from '../lib/errors'
import { useToast } from '../components/useToast'
import { bookingCode, formatDate, formatDateTime, formatTimeRange, formatVnd } from '../lib/format'
import { categoryLabel } from '../lib/seats'
import { uuid } from '../lib/uuid'
import { useDocumentTitle } from '../lib/useDocumentTitle'

const POLL_MS = 5000
const isLive = (status: Booking['status'] | undefined) => status === 'PENDING' || status === 'PAYMENT_PROCESSING'

function SeatTable({ booking }: { booking: Booking }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Ghế</th>
            <th>Hạng</th>
            <th className="num">Giá vé</th>
          </tr>
        </thead>
        <tbody>
          {booking.seats.map((s) => (
            <tr key={s.seatId}>
              <td>
                <strong>{s.seatCode}</strong>
              </td>
              <td>{categoryLabel(s.category)}</td>
              <td className="num">{formatVnd(s.unitPrice)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={2}>
              <strong>Tổng cộng</strong>
            </td>
            <td className="num">
              <strong>{formatVnd(booking.totalAmount)}</strong>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

function Ticket({ booking }: { booking: Booking }) {
  return (
    <article className="ticket" aria-label={`Vé điện tử ${bookingCode(booking.id)}`}>
      <div className="ticket-main">
        <span className="ticket-label">Vé điện tử</span>
        <h2>{booking.eventName}</h2>
        <dl className="ticket-info">
          <div>
            <dt>Thời gian</dt>
            <dd>
              {formatDate(booking.startTime)}
              <br />
              {formatTimeRange(booking.startTime, booking.endTime)}
            </dd>
          </div>
          <div>
            <dt>Địa điểm</dt>
            <dd>{booking.venue}</dd>
          </div>
          <div>
            <dt>Ghế</dt>
            <dd>{booking.seats.map((s) => s.seatCode).join(', ')}</dd>
          </div>
        </dl>
      </div>
      <div className="ticket-stub">
        <span className="ticket-label">Mã đặt vé</span>
        <strong className="ticket-code">{bookingCode(booking.id)}</strong>
        <span className="ticket-total">{formatVnd(booking.totalAmount)}</span>
        <span className="badge badge-success">Đã thanh toán</span>
      </div>
    </article>
  )
}

export function BookingPage() {
  const id = Number(useParams().id)
  const valid = Number.isFinite(id)
  const queryClient = useQueryClient()
  const toast = useToast()
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [simulateFail, setSimulateFail] = useState(false)
  // Một lần thử thanh toán dùng một Idempotency-Key; chỉ đổi key khi lần thử đã có kết quả dứt khoát
  const idempotencyKey = useRef<string | null>(null)

  const booking = useQuery({
    queryKey: ['booking', id],
    queryFn: () => api.booking(id),
    enabled: valid,
    refetchInterval: (query) => (isLive(query.state.data?.status) ? POLL_MS : false),
  })
  useDocumentTitle(valid ? `Đơn ${bookingCode(id)}` : undefined)

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['booking', id] })
    void queryClient.invalidateQueries({ queryKey: ['bookings'] })
  }

  const pay = useMutation({
    mutationFn: () => {
      idempotencyKey.current ??= uuid()
      return api.pay(id, idempotencyKey.current, simulateFail ? 'FAILED' : undefined)
    },
    onSuccess: (payment) => {
      idempotencyKey.current = null
      if (payment.status === 'SUCCESS') toast.show('Thanh toán thành công, vé của bạn đã được xác nhận', 'success')
      else if (payment.status === 'FAILED')
        toast.show('Thanh toán không thành công. Ghế vẫn được giữ, bạn có thể thử lại.', 'error')
      refresh()
    },
    onError: (error) => {
      // Lỗi mạng: giữ nguyên key để lần thử lại không bị trừ tiền hai lần
      if (!(error instanceof ApiError) || error.status !== 0) idempotencyKey.current = null
      toast.show(errorMessage(error), 'error')
      refresh()
    },
  })

  const cancel = useMutation({
    mutationFn: () => api.cancelBooking(id),
    onSuccess: () => {
      setConfirmCancel(false)
      toast.show('Đã huỷ đơn, ghế đã được trả lại', 'success')
      refresh()
    },
    onError: (error) => {
      setConfirmCancel(false)
      toast.show(errorMessage(error), 'error')
      refresh()
    },
  })

  if (!valid) return <ErrorState error={new ApiError(404, 'NOT_FOUND', 'Đơn không hợp lệ')} />
  if (booking.isPending) return <Spinner />
  if (booking.isError) {
    return (
      <div className="container page">
        <ErrorState error={booking.error} onRetry={() => booking.refetch()} />
        <p style={{ textAlign: 'center' }}>
          <Link to="/bookings">← Vé của tôi</Link>
        </p>
      </div>
    )
  }

  const b = booking.data
  const processing = b.status === 'PAYMENT_PROCESSING' || pay.isPending

  return (
    <div className="container page">
      <nav className="breadcrumb" aria-label="Đường dẫn">
        <Link to="/bookings">Vé của tôi</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{bookingCode(b.id)}</span>
      </nav>

      <header className="booking-head">
        <h1>Đơn {bookingCode(b.id)}</h1>
        <StatusBadge status={b.status} />
      </header>

      {b.status === 'CONFIRMED' && (
        <div className="stack">
          <p className="alert alert-success" role="status">
            Đặt vé thành công! Hãy xuất trình mã đặt vé khi vào cửa.
          </p>
          <Ticket booking={b} />
          <div className="row row-wrap no-print">
            <button type="button" className="btn btn-outline" onClick={() => window.print()}>
              <Icon name="printer" /> In vé
            </button>
            <Link to="/bookings" className="btn btn-ghost">
              Xem tất cả vé
            </Link>
          </div>
        </div>
      )}

      {b.status !== 'CONFIRMED' && (
        <div className="booking-layout">
          <section className="card card-pad stack" aria-label="Chi tiết đơn">
            <div className="summary-event">
              <h2>{b.eventName}</h2>
              <span className="muted">{b.venue}</span>
              <span className="muted">
                <Icon name="calendar" size={14} /> {formatDateTime(b.startTime)}
              </span>
            </div>
            <SeatTable booking={b} />
          </section>

          <aside className="card card-pad stack checkout" aria-label="Thanh toán">
            {b.status === 'PENDING' && b.expiresAt && (
              <>
                <div className="checkout-timer">
                  <span className="muted">Ghế được giữ cho bạn trong</span>
                  <Countdown expiresAt={b.expiresAt} size="lg" onExpire={refresh} />
                </div>
                <div className="summary-total">
                  <span>Cần thanh toán</span>
                  <strong>{formatVnd(b.totalAmount)}</strong>
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-lg btn-block"
                  onClick={() => pay.mutate()}
                  disabled={processing || cancel.isPending}
                >
                  {processing ? <span className="spinner" /> : <Icon name="card" />}
                  {processing ? 'Đang xử lý...' : `Thanh toán ${formatVnd(b.totalAmount)}`}
                </button>
                {import.meta.env.DEV && (
                  <label className="dev-toggle">
                    <input type="checkbox" checked={simulateFail} onChange={(e) => setSimulateFail(e.target.checked)} />
                    Giả lập thanh toán thất bại (chỉ khi dev)
                  </label>
                )}
                <button
                  type="button"
                  className="btn btn-ghost btn-block"
                  onClick={() => setConfirmCancel(true)}
                  disabled={processing || cancel.isPending}
                >
                  Huỷ đơn
                </button>
                <p className="field-hint">Cổng thanh toán đang ở chế độ giả lập, không trừ tiền thật.</p>
              </>
            )}

            {b.status === 'PAYMENT_PROCESSING' && (
              <div className="state" role="status">
                <span className="spinner" style={{ fontSize: 30, color: 'var(--primary)' }} />
                <h3>Đang xử lý thanh toán</h3>
                <p>Vui lòng không đóng trang, kết quả sẽ tự cập nhật.</p>
              </div>
            )}

            {(b.status === 'EXPIRED' || b.status === 'CANCELLED') && (
              <div className="stack">
                <p className={`alert ${b.status === 'EXPIRED' ? 'alert-danger' : 'alert-warning'}`}>
                  {b.status === 'EXPIRED'
                    ? 'Đơn đã hết thời gian giữ ghế. Ghế đã được trả lại cho người khác.'
                    : 'Đơn đã được huỷ, ghế đã được trả lại.'}
                </p>
                <Link to={`/showtimes/${b.showtimeId}`} className="btn btn-primary btn-block">
                  Chọn ghế lại
                </Link>
              </div>
            )}
          </aside>
        </div>
      )}

      <ConfirmDialog
        open={confirmCancel}
        title="Huỷ đơn đặt vé?"
        confirmLabel="Huỷ đơn"
        danger
        busy={cancel.isPending}
        onConfirm={() => cancel.mutate()}
        onCancel={() => setConfirmCancel(false)}
      >
        <p>Các ghế bạn đang giữ sẽ được trả lại và người khác có thể đặt ngay. Bạn không thể hoàn tác thao tác này.</p>
      </ConfirmDialog>
    </div>
  )
}
