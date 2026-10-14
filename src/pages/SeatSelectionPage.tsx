import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import { api } from '../api/endpoints'
import type { Seat } from '../api/types'
import { useAuth } from '../auth/useAuth'
import { Icon } from '../components/Icon'
import { SeatLegend, SeatMap } from '../components/SeatMap'
import { ErrorState, Spinner } from '../components/States'
import { errorMessage } from '../lib/errors'
import { useToast } from '../components/useToast'
import { formatDate, formatTimeRange, formatVnd } from '../lib/format'
import { categoryLabel } from '../lib/seats'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { useNow } from '../lib/useNow'
import { useSeatStream } from '../lib/useSeatStream'

export const MAX_SEATS = 10
// Khi luồng SSE đang nối thì chỉ cần làm mới thưa như một lớp bảo hiểm; mất luồng thì làm mới dày hơn
const LIVE_REFRESH_MS = 30_000
const POLL_REFRESH_MS = 8000

export function SeatSelectionPage() {
  const id = Number(useParams().id)
  const valid = Number.isFinite(id)
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const toast = useToast()
  const now = useNow()

  const showtime = useQuery({ queryKey: ['showtime', id], queryFn: () => api.showtime(id), enabled: valid })
  const eventId = showtime.data?.eventId
  const event = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => api.event(eventId!),
    enabled: eventId !== undefined,
  })
  // Ghế người khác vừa giữ được đẩy về qua SSE; làm mới định kỳ chỉ là lớp bảo hiểm
  const live = useSeatStream(id, valid, () => {
    void queryClient.invalidateQueries({ queryKey: ['seats', id] })
    void queryClient.invalidateQueries({ queryKey: ['showtime', id] })
  })
  const seats = useQuery({
    queryKey: ['seats', id],
    queryFn: () => api.seats(id),
    enabled: valid,
    refetchInterval: live ? LIVE_REFRESH_MS : POLL_REFRESH_MS,
  })
  useDocumentTitle(event.data ? `Chọn ghế · ${event.data.name}` : 'Chọn ghế')

  const [selected, setSelected] = useState<ReadonlySet<number>>(new Set())
  const seatById = useMemo(() => new Map((seats.data ?? []).map((s) => [s.id, s])), [seats.data])

  // Ghế đang chọn mà người khác vừa giữ/mua thì bỏ khỏi lựa chọn và báo cho người dùng
  const lastSeats = useRef(seats.data)
  useEffect(() => {
    if (!seats.data || lastSeats.current === seats.data) return
    lastSeats.current = seats.data
    const lost = [...selected].filter((sid) => seatById.get(sid)?.status !== 'AVAILABLE')
    if (lost.length === 0) return
    // Đồng bộ lựa chọn cục bộ với dữ liệu server vừa về (hệ thống bên ngoài), nên cần setState trong effect
    // oxlint-disable-next-line react/set-state-in-effect
    setSelected((prev) => new Set([...prev].filter((sid) => !lost.includes(sid))))
    const codes = lost.map((sid) => seatById.get(sid)?.seatCode ?? sid).join(', ')
    toast.show(`Ghế ${codes} vừa có người khác giữ, vui lòng chọn ghế khác`, 'error')
  }, [seats.data, seatById, selected, toast])

  const toggle = useCallback(
    (seat: Seat) => {
      setSelected((prev) => {
        const next = new Set(prev)
        if (next.has(seat.id)) {
          next.delete(seat.id)
        } else if (next.size >= MAX_SEATS) {
          toast.show(`Mỗi lần đặt tối đa ${MAX_SEATS} ghế`, 'error')
          return prev
        } else {
          next.add(seat.id)
        }
        return next
      })
    },
    [toast],
  )

  const book = useMutation({
    mutationFn: () => api.createBooking(id, [...selected]),
    onSuccess: (booking) => {
      void queryClient.invalidateQueries({ queryKey: ['seats', id] })
      void queryClient.invalidateQueries({ queryKey: ['bookings'] })
      navigate(`/bookings/${booking.id}`)
    },
    onError: (error) => {
      toast.show(errorMessage(error), 'error')
      if (error instanceof ApiError && (error.code === 'SEAT_UNAVAILABLE' || error.code === 'SHOWTIME_CLOSED')) {
        void seats.refetch()
        void showtime.refetch()
      }
    },
  })

  if (!valid) return <ErrorState error={new ApiError(404, 'NOT_FOUND', 'Suất diễn không hợp lệ')} />
  if (showtime.isError) return <ErrorState error={showtime.error} onRetry={() => showtime.refetch()} />
  if (seats.isError && !seats.data) return <ErrorState error={seats.error} onRetry={() => seats.refetch()} />
  if (showtime.isPending || seats.isPending) return <Spinner label="Đang tải sơ đồ ghế..." />

  const st = showtime.data
  const selectedSeats = [...selected].map((sid) => seatById.get(sid)).filter((s): s is Seat => s !== undefined)
  const total = selectedSeats.reduce((sum, s) => sum + s.faceValue, 0)
  const closed = new Date(st.startTime).getTime() <= now
  const available = seats.data.filter((s) => s.status === 'AVAILABLE').length

  const submit = () => {
    if (!user) {
      navigate('/login', { state: { from: location.pathname } })
      return
    }
    book.mutate()
  }

  return (
    <div className="container page">
      <nav className="breadcrumb" aria-label="Đường dẫn">
        <Link to="/">Sự kiện</Link>
        <span aria-hidden="true">/</span>
        {event.data ? <Link to={`/events/${event.data.id}`}>{event.data.name}</Link> : <span>…</span>}
        <span aria-hidden="true">/</span>
        <span aria-current="page">Chọn ghế</span>
      </nav>

      <h1 className="sr-only">Chọn ghế{event.data ? `: ${event.data.name}` : ''}</h1>

      <div className="seat-layout">
        <section className="card card-pad seat-panel" aria-labelledby="seatmap-title">
          <div className="section-head">
            <h2 id="seatmap-title">Sơ đồ ghế</h2>
            <span className="muted">
              Còn {available}/{seats.data.length} ghế
            </span>
          </div>
          {closed && <p className="alert alert-warning">Suất diễn đã bắt đầu, không thể đặt thêm vé.</p>}
          {seats.data.length === 0 ? (
            <p className="muted" style={{ padding: 24, textAlign: 'center' }}>
              Suất diễn này chưa có ghế.
            </p>
          ) : (
            <>
              <SeatMap seats={seats.data} selectedIds={selected} onToggle={toggle} disabled={closed || book.isPending} />
              <SeatLegend seats={seats.data} />
            </>
          )}
        </section>

        <aside className="card card-pad summary" aria-labelledby="summary-title">
          <h2 id="summary-title">Đơn của bạn</h2>
          <div className="summary-event">
            <strong>{event.data?.name ?? '…'}</strong>
            <span className="muted">{event.data?.venue}</span>
            <span className="muted">
              <Icon name="calendar" size={14} /> {formatDate(st.startTime)} · {formatTimeRange(st.startTime, st.endTime)}
            </span>
          </div>

          {selectedSeats.length === 0 ? (
            <p className="muted summary-empty">Chọn ghế trên sơ đồ để bắt đầu.</p>
          ) : (
            <ul className="summary-seats" aria-label="Ghế đã chọn">
              {selectedSeats.map((s) => (
                <li key={s.id}>
                  <span>
                    <strong>{s.seatCode}</strong> <span className="muted">{categoryLabel(s.category)}</span>
                  </span>
                  <span>{formatVnd(s.faceValue)}</span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => toggle(s)}
                    aria-label={`Bỏ chọn ghế ${s.seatCode}`}
                  >
                    <Icon name="x" size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="summary-total">
            <span>
              Tạm tính ({selectedSeats.length}/{MAX_SEATS} ghế)
            </span>
            <strong>{formatVnd(total)}</strong>
          </div>

          <button
            type="button"
            className="btn btn-primary btn-lg btn-block"
            onClick={submit}
            disabled={closed || book.isPending || (user !== null && selectedSeats.length === 0)}
          >
            {book.isPending && <span className="spinner" />}
            {user ? 'Giữ ghế trong 5 phút' : 'Đăng nhập để giữ ghế'}
          </button>
          <p className="field-hint">Ghế được giữ cho bạn 5 phút, cần thanh toán trước khi hết thời gian.</p>
        </aside>
      </div>
    </div>
  )
}
