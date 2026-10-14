import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { api } from '../../api/endpoints'
import type { EmailStatus } from '../../api/types'
import { Pagination } from '../../components/Pagination'
import { EmptyState, ErrorState, Spinner } from '../../components/States'
import { useToast } from '../../components/useToast'
import { errorMessage } from '../../lib/errors'
import { formatDateTime } from '../../lib/format'

const PAGE_SIZE = 15
const STATUSES: EmailStatus[] = ['PENDING', 'SENT', 'FAILED']
const LABEL: Record<EmailStatus, string> = { PENDING: 'Đang chờ / thử lại', SENT: 'Đã gửi', FAILED: 'Thất bại' }
const TONE: Record<EmailStatus, string> = { PENDING: 'warning', SENT: 'success', FAILED: 'danger' }

/** Theo dõi hàng đợi email: thư nào đã gửi, đang thử lại hay đã bỏ cuộc (kèm lỗi), và gửi lại thư thất bại. */
export default function EmailsPage() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const status = STATUSES.find((s) => s === params.get('status'))
  const page = Math.max(0, Number.parseInt(params.get('page') ?? '0', 10) || 0)

  const emails = useQuery({
    queryKey: ['admin', 'emails', { status, page }],
    queryFn: () => api.adminEmails({ status, page, size: PAGE_SIZE }),
    placeholderData: keepPreviousData,
    refetchInterval: 15_000,
  })

  const retry = useMutation({
    mutationFn: (id: number) => api.retryEmail(id),
    onSuccess: () => toast.show('Đã đưa thư vào hàng đợi gửi lại', 'success'),
    onError: (error) => toast.show(errorMessage(error), 'error'),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['admin', 'emails'] }),
  })

  const update = (next: { status?: string; page?: number }) => {
    const merged = new URLSearchParams(params)
    for (const [key, value] of Object.entries(next)) {
      if (value === undefined || value === '' || value === 0) merged.delete(key)
      else merged.set(key, String(value))
    }
    setParams(merged)
  }

  return (
    <div className="stack">
      <p className="muted">
        Email đi qua hàng đợi: khi SMTP lỗi, hệ thống tự thử lại sau 1 phút, 5 phút, 15 phút, 1 giờ rồi mới đánh dấu thất bại.
        Trang không hiện nội dung thư.
      </p>
      <div className="chips" role="group" aria-label="Lọc theo trạng thái" style={{ marginBottom: 0 }}>
        <button type="button" className="chip" aria-pressed={!status} onClick={() => update({ status: '', page: 0 })}>
          Tất cả
        </button>
        {STATUSES.map((s) => (
          <button key={s} type="button" className="chip" aria-pressed={status === s} onClick={() => update({ status: s, page: 0 })}>
            {LABEL[s]}
          </button>
        ))}
      </div>

      {emails.isPending ? (
        <Spinner />
      ) : emails.isError ? (
        <ErrorState error={emails.error} onRetry={() => emails.refetch()} />
      ) : emails.data.content.length === 0 ? (
        <EmptyState icon="✉️" title="Chưa có email nào" />
      ) : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Người nhận</th>
                  <th>Tiêu đề</th>
                  <th>Trạng thái</th>
                  <th className="num">Lần thử</th>
                  <th>Thời điểm</th>
                  <th>
                    <span className="sr-only">Thao tác</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {emails.data.content.map((m) => (
                  <tr key={m.id}>
                    <td>{m.to}</td>
                    <td>
                      {m.subject}
                      {m.lastError && m.status !== 'SENT' && (
                        <div className="field-error" title={m.lastError} style={{ maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.lastError}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`badge badge-${TONE[m.status]}`}>{LABEL[m.status]}</span>
                    </td>
                    <td className="num">{m.attempts}</td>
                    <td className="muted">
                      {m.status === 'SENT' && m.sentAt
                        ? `Gửi ${formatDateTime(m.sentAt)}`
                        : m.status === 'PENDING'
                          ? `Thử lại ${formatDateTime(m.nextAttemptAt)}`
                          : `Tạo ${formatDateTime(m.createdAt)}`}
                    </td>
                    <td className="actions">
                      {m.status === 'FAILED' && (
                        <button type="button" className="btn btn-outline btn-sm" disabled={retry.isPending} onClick={() => retry.mutate(m.id)}>
                          Gửi lại
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={emails.data.page} totalPages={emails.data.totalPages} onChange={(p) => update({ page: p })} />
        </>
      )}
    </div>
  )
}
