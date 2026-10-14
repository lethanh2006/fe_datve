import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api/endpoints'
import { EventCard, EventCardSkeleton } from '../components/EventCard'
import { Icon } from '../components/Icon'
import { Pagination } from '../components/Pagination'
import { EmptyState, ErrorState } from '../components/States'
import { useDocumentTitle } from '../lib/useDocumentTitle'

const PAGE_SIZE = 12

/** Ô tìm kiếm; được remount (key = từ khoá trên URL) để luôn khớp URL khi bấm Back hay xoá bộ lọc. */
function HeroSearch({ initial, onSearch }: { initial: string; onSearch: (value: string) => void }) {
  const [text, setText] = useState(initial)
  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSearch(text.trim())
  }
  return (
    <form className="hero-search" onSubmit={submit} role="search">
      <Icon name="search" size={20} />
      <input
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Tìm theo tên sự kiện hoặc địa điểm"
        aria-label="Tìm sự kiện"
        maxLength={100}
      />
      <button type="submit" className="btn btn-primary">
        Tìm kiếm
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

  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <h1>Chọn sự kiện, chọn ghế, giữ chỗ trong 5 phút</h1>
          <p className="hero-sub">Âm nhạc, sân khấu, thể thao, hội thảo... đặt vé nhanh và thanh toán an toàn.</p>
          <HeroSearch key={q} initial={q} onSearch={(value) => update({ q: value, page: 0 })} />
        </div>
      </section>

      <div className="container page">
        {categories.data && categories.data.length > 0 && (
          <div className="chips" role="group" aria-label="Lọc theo thể loại">
            <button
              type="button"
              className="chip"
              aria-pressed={category === ''}
              onClick={() => update({ category: '', page: 0 })}
            >
              Tất cả
            </button>
            {categories.data.map((c) => (
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
        )}

        <div className="section-head">
          <h2>{filtered ? 'Kết quả tìm kiếm' : 'Sự kiện sắp diễn ra'}</h2>
          {events.data && <span className="muted">{events.data.totalElements} sự kiện</span>}
        </div>

        {events.isError ? (
          <ErrorState error={events.error} onRetry={() => events.refetch()} />
        ) : events.isPending ? (
          <div className="event-grid">
            {Array.from({ length: 8 }, (_, i) => (
              <EventCardSkeleton key={i} />
            ))}
          </div>
        ) : events.data.content.length === 0 ? (
          <EmptyState icon="🔍" title="Không tìm thấy sự kiện phù hợp">
            {filtered && (
              <button type="button" className="btn btn-outline" onClick={() => setParams({})}>
                Xoá bộ lọc
              </button>
            )}
          </EmptyState>
        ) : (
          <>
            <div className="event-grid" aria-busy={events.isPlaceholderData}>
              {events.data.content.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
            <Pagination page={events.data.page} totalPages={events.data.totalPages} onChange={(p) => update({ page: p })} />
          </>
        )}
      </div>
    </>
  )
}
