import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/endpoints'
import type { Showtime } from '../api/types'
import { Icon } from '../components/Icon'
import { Poster } from '../components/Poster'
import { EmptyState, ErrorState, Spinner } from '../components/States'
import { formatDate, formatTimeRange, formatVnd } from '../lib/format'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { useNow } from '../lib/useNow'

function ShowtimeRow({ showtime, now }: { showtime: Showtime; now: number }) {
  const started = new Date(showtime.startTime).getTime() <= now
  const noSeats = showtime.totalSeats === 0
  const soldOut = !noSeats && showtime.availableSeats === 0
  const percent = showtime.totalSeats > 0 ? Math.round((showtime.availableSeats / showtime.totalSeats) * 100) : 0

  let action: { label: string; disabled: boolean }
  if (showtime.cancelledAt) action = { label: 'Đã huỷ', disabled: true }
  else if (started) action = { label: 'Đã bắt đầu', disabled: true }
  else if (noSeats) action = { label: 'Chưa mở bán', disabled: true }
  else if (soldOut) action = { label: 'Hết vé', disabled: true }
  else action = { label: 'Chọn ghế', disabled: false }

  return (
    <li className={`showtime ${action.disabled ? 'is-disabled' : ''}`}>
      <div className="showtime-date">
        <Icon name="calendar" size={18} />
        <div>
          <strong>{formatDate(showtime.startTime)}</strong>
          <span className="muted">{formatTimeRange(showtime.startTime, showtime.endTime)}</span>
        </div>
      </div>
      <div className="showtime-seats">
        {showtime.cancelledAt ? (
          <>
            <span className="badge badge-danger">Suất diễn đã huỷ</span>
            {showtime.cancelReason && <span className="muted">{showtime.cancelReason}</span>}
          </>
        ) : noSeats ? (
          <span className="muted">Chưa có ghế</span>
        ) : (
          <>
            <div
              className="meter"
              role="img"
              aria-label={`Còn ${showtime.availableSeats} trên ${showtime.totalSeats} ghế`}
            >
              <span style={{ width: `${percent}%` }} className={percent <= 15 ? 'is-low' : ''} />
            </div>
            <span className="muted">
              Còn {showtime.availableSeats}/{showtime.totalSeats} ghế
            </span>
          </>
        )}
      </div>
      <div className="showtime-price">
        {showtime.minPrice !== null && !showtime.cancelledAt && (
          <>
            <span className="muted">Từ</span>
            <strong>{formatVnd(showtime.minPrice)}</strong>
          </>
        )}
      </div>
      {action.disabled ? (
        <button type="button" className="btn btn-outline" disabled>
          {action.label}
        </button>
      ) : (
        <Link to={`/showtimes/${showtime.id}`} className="btn btn-primary">
          {action.label}
        </Link>
      )}
    </li>
  )
}

export function EventPage() {
  const id = Number(useParams().id)
  const now = useNow()
  const event = useQuery({ queryKey: ['event', id], queryFn: () => api.event(id), enabled: Number.isFinite(id) })
  const showtimes = useQuery({
    queryKey: ['showtimes', id],
    queryFn: () => api.showtimes(id),
    enabled: Number.isFinite(id),
  })
  useDocumentTitle(event.data?.name)

  if (event.isPending) return <Spinner />
  if (event.isError) {
    return (
      <div className="container page">
        <ErrorState error={event.error} onRetry={() => event.refetch()} />
        <p style={{ textAlign: 'center' }}>
          <Link to="/">← Về trang chủ</Link>
        </p>
      </div>
    )
  }
  const e = event.data

  return (
    <div className="container page">
      <nav className="breadcrumb" aria-label="Đường dẫn">
        <Link to="/">Sự kiện</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{e.name}</span>
      </nav>

      <section className="event-hero card">
        <div className="event-hero-media">
          <Poster id={e.id} name={e.name} src={e.imageUrl} />
        </div>
        <div className="event-hero-info">
          {e.category && <span className="badge badge-info">{e.category}</span>}
          <h1>{e.name}</h1>
          <p className="event-card-meta">
            <Icon name="pin" size={16} />
            <span>{e.venue}</span>
          </p>
          {e.minPrice !== null && (
            <p className="event-hero-price">
              Giá từ <strong>{formatVnd(e.minPrice)}</strong>
            </p>
          )}
          {e.description && <p className="event-hero-desc">{e.description}</p>}
          <a className="btn btn-primary event-hero-cta" href="#showtimes-title">
            Xem lịch & chọn ghế <Icon name="arrowRight" />
          </a>
        </div>
      </section>

      <section aria-labelledby="showtimes-title" style={{ marginTop: 32 }}>
        <div className="section-head">
          <div>
            <span className="eyebrow">CHỌN MỘT LỊCH HẸN</span>
            <h2 id="showtimes-title">Chọn suất diễn</h2>
          </div>
        </div>
        {showtimes.isPending ? (
          <Spinner />
        ) : showtimes.isError ? (
          <ErrorState error={showtimes.error} onRetry={() => showtimes.refetch()} />
        ) : showtimes.data.length === 0 ? (
          <EmptyState icon="📅" title="Sự kiện chưa có suất diễn">
            <p>Vui lòng quay lại sau.</p>
          </EmptyState>
        ) : (
          <ul className="showtime-list">
            {showtimes.data.map((s) => (
              <ShowtimeRow key={s.id} showtime={s} now={now} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
