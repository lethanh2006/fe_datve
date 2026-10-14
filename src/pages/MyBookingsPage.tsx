import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api/endpoints'
import type { Booking, BookingStatus } from '../api/types'
import { Countdown } from '../components/Countdown'
import { Icon } from '../components/Icon'
import { Pagination } from '../components/Pagination'
import { StatusBadge } from '../components/StatusBadge'
import { EmptyState, ErrorState, Spinner } from '../components/States'
import { bookingCode, formatDateTime, formatVnd } from '../lib/format'
import { BOOKING_STATUSES, BOOKING_STATUS_LABEL } from '../lib/status'
import { useDocumentTitle } from '../lib/useDocumentTitle'

const PAGE_SIZE = 10

function BookingItem({ booking }: { booking: Booking }) {
  return (
    <li>
      <Link to={`/bookings/${booking.id}`} className="booking-item card">
        <div className="booking-item-main">
          <div className="row row-wrap">
            <strong className="booking-item-code">{bookingCode(booking.id)}</strong>
            <StatusBadge status={booking.status} />
            {booking.status === 'PENDING' && booking.expiresAt && <Countdown expiresAt={booking.expiresAt} />}
          </div>
          <h2 className="booking-item-title">{booking.eventName}</h2>
          <p className="muted">
            <Icon name="calendar" size={14} /> {formatDateTime(booking.startTime)} · {booking.venue}
          </p>
          <p className="booking-item-seats">
            {booking.seats.map((s) => (
              <span key={s.seatId} className="seat-chip">
                {s.seatCode}
              </span>
            ))}
          </p>
        </div>
        <div className="booking-item-side">
          <strong>{formatVnd(booking.totalAmount)}</strong>
          <span className="muted">{booking.status === 'PENDING' ? 'Thanh toán ngay →' : 'Xem chi tiết →'}</span>
        </div>
      </Link>
    </li>
  )
}

export function MyBookingsPage() {
  useDocumentTitle('Vé của tôi')
  const [params, setParams] = useSearchParams()
  const status = (BOOKING_STATUSES as string[]).includes(params.get('status') ?? '')
    ? (params.get('status') as BookingStatus)
    : undefined
  const page = Math.max(0, Number.parseInt(params.get('page') ?? '0', 10) || 0)

  const bookings = useQuery({
    queryKey: ['bookings', { status, page }],
    queryFn: () => api.myBookings({ status, page, size: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  })

  const select = (next: BookingStatus | undefined) => setParams(next ? { status: next } : {})

  return (
    <div className="container page">
      <h1 className="page-title">Vé của tôi</h1>

      <div className="chips" role="group" aria-label="Lọc theo trạng thái">
        <button type="button" className="chip" aria-pressed={!status} onClick={() => select(undefined)}>
          Tất cả
        </button>
        {BOOKING_STATUSES.filter((s) => s !== 'PAYMENT_PROCESSING').map((s) => (
          <button key={s} type="button" className="chip" aria-pressed={status === s} onClick={() => select(s)}>
            {BOOKING_STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {bookings.isPending ? (
        <Spinner />
      ) : bookings.isError ? (
        <ErrorState error={bookings.error} onRetry={() => bookings.refetch()} />
      ) : bookings.data.content.length === 0 ? (
        <EmptyState icon="🎟️" title={status ? 'Không có đơn nào ở trạng thái này' : 'Bạn chưa đặt vé nào'}>
          <Link to="/" className="btn btn-primary">
            Khám phá sự kiện
          </Link>
        </EmptyState>
      ) : (
        <>
          <ul className="booking-list" aria-busy={bookings.isPlaceholderData}>
            {bookings.data.content.map((b) => (
              <BookingItem key={b.id} booking={b} />
            ))}
          </ul>
          <Pagination
            page={bookings.data.page}
            totalPages={bookings.data.totalPages}
            onChange={(p) => {
              const next = new URLSearchParams(params)
              if (p === 0) next.delete('page')
              else next.set('page', String(p))
              setParams(next)
            }}
          />
        </>
      )}
    </div>
  )
}
