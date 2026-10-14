import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../../api/endpoints'
import type { BookingStatus } from '../../api/types'
import { Icon } from '../../components/Icon'
import { Pagination } from '../../components/Pagination'
import { StatusBadge } from '../../components/StatusBadge'
import { EmptyState, ErrorState, Spinner } from '../../components/States'
import { bookingCode, formatDateTime, formatVnd } from '../../lib/format'
import { BOOKING_STATUSES, BOOKING_STATUS_LABEL } from '../../lib/status'

const PAGE_SIZE = 15

export default function AdminBookingsPage() {
  const [params, setParams] = useSearchParams()
  const status = (BOOKING_STATUSES as string[]).includes(params.get('status') ?? '')
    ? (params.get('status') as BookingStatus)
    : undefined
  const q = params.get('q') ?? ''
  const page = Math.max(0, Number.parseInt(params.get('page') ?? '0', 10) || 0)
  const [text, setText] = useState(q)

  const bookings = useQuery({
    queryKey: ['admin', 'bookings', { status, q, page }],
    queryFn: () => api.adminBookings({ status, q, page, size: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  })

  const update = (next: { status?: string; q?: string; page?: number }) => {
    const merged = new URLSearchParams(params)
    for (const [key, value] of Object.entries(next)) {
      if (value === undefined || value === '' || value === 0) merged.delete(key)
      else merged.set(key, String(value))
    }
    setParams(merged)
  }

  const search = (e: FormEvent) => {
    e.preventDefault()
    update({ q: text.trim(), page: 0 })
  }

  return (
    <div className="stack">
      <div className="row row-wrap">
        <form className="row" onSubmit={search} role="search" style={{ flex: 1, minWidth: 260 }}>
          <input
            className="input"
            type="search"
            placeholder="Tìm theo email hoặc tên khách..."
            aria-label="Tìm đơn theo khách hàng"
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{ maxWidth: 360 }}
          />
          <button type="submit" className="btn btn-outline">
            <Icon name="search" /> Tìm
          </button>
        </form>
      </div>
      <div className="chips" role="group" aria-label="Lọc theo trạng thái">
        <button type="button" className="chip" aria-pressed={!status} onClick={() => update({ status: '', page: 0 })}>
          Tất cả
        </button>
        {BOOKING_STATUSES.map((s) => (
          <button key={s} type="button" className="chip" aria-pressed={status === s} onClick={() => update({ status: s, page: 0 })}>
            {BOOKING_STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {bookings.isPending ? (
        <Spinner />
      ) : bookings.isError ? (
        <ErrorState error={bookings.error} onRetry={() => bookings.refetch()} />
      ) : bookings.data.content.length === 0 ? (
        <EmptyState icon="🧾" title="Không có đơn nào" />
      ) : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  <th>Khách hàng</th>
                  <th>Sự kiện</th>
                  <th>Ghế</th>
                  <th className="num">Tổng tiền</th>
                  <th>Trạng thái</th>
                  <th>Tạo lúc</th>
                </tr>
              </thead>
              <tbody>
                {bookings.data.content.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <Link to={`/bookings/${b.id}`}>{bookingCode(b.id)}</Link>
                    </td>
                    <td>
                      <strong>{b.customer?.fullName}</strong>
                      <div className="muted">{b.customer?.email}</div>
                    </td>
                    <td>
                      {b.eventName}
                      <div className="muted">{formatDateTime(b.startTime)}</div>
                    </td>
                    <td>{b.seats.map((s) => s.seatCode).join(', ')}</td>
                    <td className="num">{formatVnd(b.totalAmount)}</td>
                    <td>
                      <StatusBadge status={b.status} />
                    </td>
                    <td className="muted">{formatDateTime(b.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={bookings.data.page} totalPages={bookings.data.totalPages} onChange={(p) => update({ page: p })} />
        </>
      )}
    </div>
  )
}
