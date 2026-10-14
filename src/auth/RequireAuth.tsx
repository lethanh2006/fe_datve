import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import type { Role } from '../api/types'
import { EmptyState, Spinner } from '../components/States'
import { useAuth } from './useAuth'

/** Chặn trang cần đăng nhập (và tuỳ chọn cần đúng vai trò). */
export function RequireAuth({ role, children }: { role?: Role; children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <Spinner label="Đang kiểm tra đăng nhập..." />
  if (!user) return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />
  if (role && user.role !== role) {
    return (
      <div className="container">
        <EmptyState icon="🔒" title="Bạn không có quyền truy cập trang này" />
      </div>
    )
  }
  return children
}
