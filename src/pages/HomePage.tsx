import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api/endpoints'
import { EventCard, EventCardSkeleton } from '../components/EventCard'
import { Icon } from '../components/Icon'
import { Pagination } from '../components/Pagination'
import { EmptyState, ErrorState } from '../components/States'
import { formatDateTime } from '../lib/format'
import { useDocumentTitle } from '../lib/useDocumentTitle'

const PAGE_SIZE = 12

/** Remount theo từ khoá trên URL để Back/Forward luôn khớp nội dung ô tìm kiếm. */
function EventSearch({ initial, onSearch }: { initial: string; onSearch: (value: string) => void }) {
  const [text, setText] = useState(initial)
  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSearch(text.trim())
  }
  return (
    <form className="discovery-search" onSubmit={submit} role="search">
      <Icon name="search" size={22} />
      <div className="discovery-search-field">
        <label htmlFor="event-search">Bạn muốn đi đâu, xem gì?</label>
        <input
          id="event-search"
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Tên sự kiện, nghệ sĩ hoặc địa điểm..."
          aria-label="Tìm sự kiện"
          maxLength={100}
        />
      </div>
      <button type="submit" className="btn btn-primary">
        Tìm sự kiện <Icon name="arrowRight" />
      </button>
    </form>
  )
}

export function HomePage() {
  useDocumentTitle()
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const category = params.get('category') ?? ''
  const page = Math.max(0, Number.parseInt(params.get('page') ?? '0', 10) || 0)
  const events = useQuery({
    queryKey: ['events', { q, category, page }],
    queryFn: () => api.events({ q, category, page, size: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  })
  const categories = useQuery({ queryKey: ['categories'], queryFn: api.categories, staleTime: 5 * 60_000 })
  const update = (next: Record<string, string | number>) => {
    const merged = new URLSearchParams(params)
    for (const [key, value] of Object.entries(next)) {
      if (value === '' || value === 0) merged.delete(key)
      else merged.set(key, String(value))
    }
    setParams(merged)
  }
  const filtered = q !== '' || category !== ''
  const featured = !filtered && page === 0 ? events.data?.content.find((event) => event.nextShowtime) : undefined

  return (
    <>
      <div className="container home-intro">
        <section className="discovery-hero" aria-labelledby="hero-title">
          <img
            className="discovery-hero-image"
            src="/images/live-stage.webp"
            width="1774"
            height="887"
            alt=""
            fetchPriority="high"
          />
          <div className="discovery-hero-content">
            <span className="eyebrow hero-eyebrow">
              <span className="live-dot" /> HẸN NHAU Ở NHỮNG TRẢI NGHIỆM
            </span>
            <h1 id="hero-title">
              <span>Có những khoảnh khắc</span>
              <em>phải có mặt.</em>
            </h1>
            <p>
              Tiếng nhạc bạn yêu. Sân khấu bạn chờ.
              <br />
              Tìm một sự kiện, dành một chỗ cho chính mình.
            </p>
            <a href="#events" className="btn hero-cta">
              Khám phá sự kiện <Icon name="arrowRight" size={20} />
            </a>
            <div className="hero-details">
              <span>
                <Icon name="ticket" size={16} /> Chọn ghế theo ý bạn
              </span>
              <span>
                <Icon name="check" size={16} /> Vé điện tử trong tài khoản
              </span>
            </div>
          </div>
          {featured && (
            <Link className="hero-featured" to={`/events/${featured.id}`}>
              <span className="eyebrow">SẮP DIỄN RA</span>
              <strong>{featured.name}</strong>
              <span>{formatDateTime(featured.nextShowtime!)}</span>
              <span className="hero-featured-arrow">
                <Icon name="arrowUpRight" size={22} />
              </span>
            </Link>
          )}
        </section>
        <div className="discovery-search-wrap">
          <EventSearch key={q} initial={q} onSearch={(value) => update({ q: value, page: 0 })} />
        </div>
      </div>

      <section id="events" className="container discovery-events" aria-labelledby="events-title">
        <div className="section-head discovery-heading">
          <div>
            <span className="eyebrow">LỊCH HẸN CỦA BẠN</span>
            <h2 id="events-title">{filtered ? 'Tìm điều bạn yêu thích' : 'Một chiếc vé. Vạn cảm xúc.'}</h2>
          </div>
          <span className="result-count" aria-live="polite">
            {events.data ? `${events.data.totalElements} sự kiện` : 'Đang tìm sự kiện...'}
          </span>
        </div>
        <div className="discovery-filters">
          <div className="chips" role="group" aria-label="Lọc theo thể loại">
            <button
              type="button"
              className="chip"
              aria-pressed={!category}
              onClick={() => update({ category: '', page: 0 })}
            >
              <Icon name="grid" size={16} /> Tất cả
            </button>
            {categories.data?.map((c) => (
              <button
                key={c}
                type="button"
                className="chip"
                aria-pressed={category === c}
                onClick={() => update({ category: c, page: 0 })}
              >
                {c}
              </button>
            ))}
          </div>
          {filtered && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setParams({})}>
              <Icon name="x" size={15} /> Xoá bộ lọc
            </button>
          )}
        </div>
        {q && (
          <p className="search-summary">
            Kết quả cho <strong>“{q}”</strong>
            {category ? ` · ${category}` : ''}
          </p>
        )}
        {events.isError ? (
          <ErrorState error={events.error} onRetry={() => events.refetch()} />
        ) : events.isPending ? (
          <div className="event-grid">
            {Array.from({ length: 6 }, (_, i) => (
              <EventCardSkeleton key={i} />
            ))}
          </div>
        ) : events.data.content.length === 0 ? (
          <EmptyState icon="🔍" title="Chưa tìm thấy sự kiện phù hợp">
            <p>Thử một từ khoá khác hoặc khám phá thêm các thể loại.</p>
          </EmptyState>
        ) : (
          <>
            <div className="event-grid" aria-busy={events.isPlaceholderData}>
              {events.data.content.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
            <Pagination
              page={events.data.page}
              totalPages={events.data.totalPages}
              onChange={(p) => update({ page: p })}
            />
          </>
        )}
      </section>

      <section className="container experience-guide" id="how-it-works" aria-labelledby="guide-title">
        <div className="guide-intro">
          <span className="eyebrow">TỪ MÀN HÌNH ĐẾN SÂN KHẤU</span>
          <h2 id="guide-title">
            Lịch hẹn hay,
            <br />
            đặt vé thật dễ.
          </h2>
          <p className="muted">Ba bước để sẵn sàng cho trải nghiệm tiếp theo.</p>
        </div>
        <ol className="guide-steps">
          <li>
            <span className="guide-icon">
              <Icon name="search" size={23} />
            </span>
            <span className="step-number">01</span>
            <h3>Chọn điều bạn thích</h3>
            <p>Khám phá sự kiện và chọn suất diễn phù hợp với lịch của bạn.</p>
          </li>
          <li>
            <span className="guide-icon">
              <Icon name="ticket" size={23} />
            </span>
            <span className="step-number">02</span>
            <h3>Giữ một chỗ thật đẹp</h3>
            <p>Xem sơ đồ, chọn ghế và hoàn tất thanh toán trong 5 phút giữ chỗ.</p>
          </li>
          <li>
            <span className="guide-icon">
              <Icon name="sparkles" size={23} />
            </span>
            <span className="step-number">03</span>
            <h3>Sẵn sàng có mặt</h3>
            <p>Mở vé điện tử trong tài khoản và xuất trình mã QR khi vào cửa.</p>
          </li>
        </ol>
      </section>
    </>
  )
}
