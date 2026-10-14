import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../../api/endpoints'
import type { AdminUser, Role } from '../../api/types'
import { useAuth } from '../../auth/useAuth'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Icon } from '../../components/Icon'
import { Pagination } from '../../components/Pagination'
import { EmptyState, ErrorState, Spinner } from '../../components/States'
import { useToast } from '../../components/useToast'
import { errorMessage } from '../../lib/errors'
import { formatDate, formatVnd } from '../../lib/format'

const PAGE_SIZE = 15
type StatusFilter = 'ACTIVE' | 'DISABLED'

type Pending = { kind: 'role'; user: AdminUser; role: Role } | { kind: 'status'; user: AdminUser; disabled: boolean }

export default function UsersPage() {
  const { user: me } = useAuth()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const role = (['USER', 'ADMIN'] as const).find((r) => r === params.get('role'))
  const status = (['ACTIVE', 'DISABLED'] as const).find((s) => s === params.get('status')) as StatusFilter | undefined
  const page = Math.max(0, Number.parseInt(params.get('page') ?? '0', 10) || 0)
  const [text, setText] = useState(q)
  const [pending, setPending] = useState<Pending | null>(null)

  const users = useQuery({
    queryKey: ['admin', 'users', { q, role, status, page }],
    queryFn: () => api.adminUsers({ q, role, status, page, size: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  })

  const update = (next: { q?: string; role?: string; status?: string; page?: number }) => {
    const merged = new URLSearchParams(params)
    for (const [key, value] of Object.entries(next)) {
      if (value === undefined || value === '' || value === 0) merged.delete(key)
      else merged.set(key, String(value))
    }
    setParams(merged)
  }

  const apply = useMutation({
    mutationFn: (action: Pending) =>
      action.kind === 'role'
        ? api.setUserRole(action.user.id, action.role)
        : api.setUserDisabled(action.user.id, action.disabled),
    onSuccess: () => {
      toast.show('Đã cập nhật người dùng', 'success')
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
    onError: (error) => {
      toast.show(errorMessage(error), 'error')
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
    onSettled: () => setPending(null),
  })

  const search = (e: FormEvent) => {
    e.preventDefault()
    update({ q: text.trim(), page: 0 })
  }

  return (
    <div className="stack">
      <form className="row" onSubmit={search} role="search" style={{ minWidth: 260 }}>
        <input
          className="input"
          type="search"
          placeholder="Tìm theo email hoặc họ tên..."
          aria-label="Tìm người dùng"
          value={text}
          onChange={(e) => setText(e.target.value)}
          style={{ maxWidth: 360 }}
        />
        <button type="submit" className="btn btn-outline">
          <Icon name="search" /> Tìm
        </button>
      </form>

      <div className="row row-wrap">
        <div className="chips" role="group" aria-label="Lọc theo vai trò" style={{ marginBottom: 0 }}>
          <button type="button" className="chip" aria-pressed={!role} onClick={() => update({ role: '', page: 0 })}>
            Mọi vai trò
          </button>
          <button type="button" className="chip" aria-pressed={role === 'ADMIN'} onClick={() => update({ role: 'ADMIN', page: 0 })}>
            Quản trị viên
          </button>
          <button type="button" className="chip" aria-pressed={role === 'USER'} onClick={() => update({ role: 'USER', page: 0 })}>
            Khách hàng
          </button>
        </div>
        <div className="chips" role="group" aria-label="Lọc theo trạng thái" style={{ marginBottom: 0 }}>
          <button type="button" className="chip" aria-pressed={!status} onClick={() => update({ status: '', page: 0 })}>
            Mọi trạng thái
          </button>
          <button type="button" className="chip" aria-pressed={status === 'ACTIVE'} onClick={() => update({ status: 'ACTIVE', page: 0 })}>
            Đang hoạt động
          </button>
          <button type="button" className="chip" aria-pressed={status === 'DISABLED'} onClick={() => update({ status: 'DISABLED', page: 0 })}>
            Đã khoá
          </button>
        </div>
      </div>

      {users.isPending ? (
        <Spinner />
      ) : users.isError ? (
        <ErrorState error={users.error} onRetry={() => users.refetch()} />
      ) : users.data.content.length === 0 ? (
        <EmptyState icon="👤" title="Không có người dùng phù hợp" />
      ) : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Người dùng</th>
                  <th>Vai trò</th>
                  <th>Trạng thái</th>
                  <th className="num">Đã mua</th>
                  <th>Tham gia</th>
                  <th>
                    <span className="sr-only">Thao tác</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.data.content.map((u) => {
                  const isMe = u.id === me?.id
                  const locked = u.disabledAt !== null
                  return (
                    <tr key={u.id}>
                      <td>
                        <strong>{u.fullName}</strong>
                        {isMe && <span className="badge badge-info" style={{ marginLeft: 8 }}>Bạn</span>}
                        <div className="muted">{u.email}</div>
                      </td>
                      <td>
                        <span className={`badge ${u.role === 'ADMIN' ? 'badge-info' : 'badge-neutral'}`}>
                          {u.role === 'ADMIN' ? 'Quản trị viên' : 'Khách hàng'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${locked ? 'badge-danger' : 'badge-success'}`}>
                          {locked ? 'Đã khoá' : 'Hoạt động'}
                        </span>
                      </td>
                      <td className="num">
                        {u.confirmedBookings} đơn
                        <div className="muted">{formatVnd(u.totalSpent)}</div>
                      </td>
                      <td className="muted">{formatDate(u.createdAt)}</td>
                      <td className="actions">
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          disabled={isMe || apply.isPending}
                          title={isMe ? 'Bạn không thể tự đổi quyền của mình' : undefined}
                          onClick={() =>
                            setPending({ kind: 'role', user: u, role: u.role === 'ADMIN' ? 'USER' : 'ADMIN' })
                          }
                        >
                          {u.role === 'ADMIN' ? 'Hạ xuống khách' : 'Nâng làm admin'}
                        </button>{' '}
                        <button
                          type="button"
                          className={`btn btn-sm ${locked ? 'btn-outline' : 'btn-danger'}`}
                          disabled={isMe || apply.isPending}
                          title={isMe ? 'Bạn không thể tự khoá tài khoản của mình' : undefined}
                          onClick={() => setPending({ kind: 'status', user: u, disabled: !locked })}
                        >
                          {locked ? 'Mở khoá' : 'Khoá'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={users.data.page} totalPages={users.data.totalPages} onChange={(p) => update({ page: p })} />
        </>
      )}

      <ConfirmDialog
        open={pending !== null}
        title={
          pending?.kind === 'role'
            ? pending.role === 'ADMIN'
              ? 'Nâng làm quản trị viên?'
              : 'Hạ xuống khách hàng?'
            : pending?.kind === 'status' && pending.disabled
              ? 'Khoá tài khoản?'
              : 'Mở khoá tài khoản?'
        }
        confirmLabel="Xác nhận"
        danger={pending?.kind === 'status' ? pending.disabled : pending?.kind === 'role' && pending.role === 'USER'}
        busy={apply.isPending}
        onConfirm={() => pending && apply.mutate(pending)}
        onCancel={() => setPending(null)}
      >
        {pending?.kind === 'role' && (
          <p>
            {pending.role === 'ADMIN'
              ? `${pending.user.fullName} sẽ có toàn quyền quản trị: sự kiện, đơn, người dùng và soát vé.`
              : `${pending.user.fullName} sẽ mất quyền quản trị ngay lập tức.`}
          </p>
        )}
        {pending?.kind === 'status' && (
          <p>
            {pending.disabled
              ? `${pending.user.fullName} sẽ bị đăng xuất khỏi mọi thiết bị và không đăng nhập được cho tới khi mở khoá.`
              : `${pending.user.fullName} sẽ đăng nhập lại được bình thường.`}
          </p>
        )}
      </ConfirmDialog>
    </div>
  )
}
