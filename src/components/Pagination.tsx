import { pageWindow } from '../lib/pagination'
import { Icon } from './Icon'

interface PaginationProps {
  /** Trang hiện tại, bắt đầu từ 0 */
  page: number
  totalPages: number
  onChange: (page: number) => void
}

export function Pagination({ page, totalPages, onChange }: PaginationProps) {
  if (totalPages <= 1) return null
  return (
    <nav className="pagination" aria-label="Phân trang">
      <button
        type="button"
        className="btn btn-outline btn-sm"
        onClick={() => onChange(page - 1)}
        disabled={page <= 0}
        aria-label="Trang trước"
      >
        <Icon name="chevronLeft" size={16} />
      </button>
      {pageWindow(page, totalPages).map((p, i) =>
        p === 'gap' ? (
          <span key={`gap-${i}`} className="pagination-gap" aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => onChange(p)}
            aria-current={p === page ? 'page' : undefined}
            aria-label={`Trang ${p + 1}`}
          >
            {p + 1}
          </button>
        ),
      )}
      <button
        type="button"
        className="btn btn-outline btn-sm"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages - 1}
        aria-label="Trang sau"
      >
        <Icon name="chevronRight" size={16} />
      </button>
    </nav>
  )
}
