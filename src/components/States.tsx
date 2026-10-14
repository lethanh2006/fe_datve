import type { ReactNode } from 'react'
import { ApiError } from '../api/client'
import { errorMessage } from '../lib/errors'
import { Icon } from './Icon'

export function Spinner({ label = 'Đang tải...' }: { label?: string }) {
  return (
    <div className="state" role="status" aria-live="polite">
      <span className="spinner" style={{ fontSize: 28, color: 'var(--primary)' }} />
      <span>{label}</span>
    </div>
  )
}

export function EmptyState({
  icon = '🎫',
  title,
  children,
}: {
  icon?: string
  title: string
  children?: ReactNode
}) {
  return (
    <div className="state">
      <div className="state-icon" aria-hidden="true">
        {icon}
      </div>
      <h3>{title}</h3>
      {children}
    </div>
  )
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const notFound = error instanceof ApiError && error.status === 404
  return (
    <div className="state" role="alert">
      <div className="state-icon" aria-hidden="true">
        <Icon name="alert" size={28} />
      </div>
      <h3>{notFound ? 'Không tìm thấy nội dung' : 'Không tải được dữ liệu'}</h3>
      <p>{errorMessage(error)}</p>
      {onRetry && !notFound && (
        <button type="button" className="btn btn-outline" onClick={onRetry}>
          Thử lại
        </button>
      )}
    </div>
  )
}
