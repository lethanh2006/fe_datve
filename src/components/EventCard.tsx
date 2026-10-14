import { Link } from 'react-router-dom'
import type { EventSummary } from '../api/types'
import { formatDateTime, formatVnd } from '../lib/format'
import { Icon } from './Icon'
import { Poster } from './Poster'

export function EventCard({ event }: { event: EventSummary }) {
  return (
    <Link to={`/events/${event.id}`} className="event-card">
      <div className="event-card-media">
        <Poster id={event.id} name={event.name} src={event.imageUrl} />
        {event.category && <span className="event-card-tag">{event.category}</span>}
      </div>
      <div className="event-card-body">
        <h3 className="event-card-title">{event.name}</h3>
        <p className="event-card-meta">
          <Icon name="pin" size={15} />
          <span>{event.venue}</span>
        </p>
        <p className="event-card-meta">
          <Icon name="calendar" size={15} />
          <span>{event.nextShowtime ? formatDateTime(event.nextShowtime) : 'Chưa có suất diễn'}</span>
        </p>
        <p className="event-card-price">
          {event.minPrice !== null ? (
            <>
              Từ <strong>{formatVnd(event.minPrice)}</strong>
            </>
          ) : (
            <span className="muted">Sắp mở bán</span>
          )}
        </p>
      </div>
    </Link>
  )
}

export function EventCardSkeleton() {
  return (
    <div className="event-card" aria-hidden="true">
      <div className="skeleton" style={{ aspectRatio: '16 / 9', borderRadius: 0 }} />
      <div className="event-card-body">
        <div className="skeleton" style={{ height: 22, width: '80%' }} />
        <div className="skeleton" style={{ height: 14, width: '60%' }} />
        <div className="skeleton" style={{ height: 14, width: '70%' }} />
      </div>
    </div>
  )
}
