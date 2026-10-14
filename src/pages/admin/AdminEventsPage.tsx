import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../../api/endpoints'
import type { EventSummary } from '../../api/types'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Icon } from '../../components/Icon'
import { Modal } from '../../components/Modal'
import { Pagination } from '../../components/Pagination'
import { EmptyState, ErrorState, Spinner } from '../../components/States'
import { errorMessage } from '../../lib/errors'
import { useToast } from '../../components/useToast'
import { formatDateTime, formatVnd } from '../../lib/format'
import { EventForm } from './EventForm'

const PAGE_SIZE = 10

export default function AdminEventsPage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const page = Math.max(0, Number.parseInt(params.get('page') ?? '0', 10) || 0)
  const [text, setText] = useState(q)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<EventSummary | null>(null)
  const [deleting, setDeleting] = useState<EventSummary | null>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()

  const events = useQuery({
    queryKey: ['events', { q, page, admin: true }],
    queryFn: () => api.events({ q, page, size: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  })

  const remove = useMutation({
    mutationFn: (event: EventSummary) => api.deleteEvent(event.id),
    onSuccess: () => {
      toast.show('Đã xoá sự kiện', 'success')
      void queryClient.invalidateQueries({ queryKey: ['events'] })
      setDeleting(null)
    },
    onError: (e) => {
      toast.show(errorMessage(e), 'error')
      setDeleting(null)
    },
  })

  const search = (e: FormEvent) => {
    e.preventDefault()
    setParams(text.trim() ? { q: text.trim() } : {})
  }

  return (
    <div className="stack">
      <div className="row row-wrap">
        <form className="row" onSubmit={search} role="search" style={{ flex: 1, minWidth: 260 }}>
          <input
            className="input"
            type="search"
            placeholder="Tìm sự kiện..."
            aria-label="Tìm sự kiện"
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{ maxWidth: 360 }}
          />
          <button type="submit" className="btn btn-outline">
            <Icon name="search" /> Tìm
          </button>
        </form>
        <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
          <Icon name="plus" /> Thêm sự kiện
        </button>
      </div>

      {events.isPending ? (
        <Spinner />
      ) : events.isError ? (
        <ErrorState error={events.error} onRetry={() => events.refetch()} />
      ) : events.data.content.length === 0 ? (
        <EmptyState icon="🎭" title="Chưa có sự kiện nào" />
      ) : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Sự kiện</th>
                  <th>Thể loại</th>
                  <th>Suất sắp tới</th>
                  <th className="num">Giá từ</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {events.data.content.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <Link to={`/admin/events/${e.id}`}>
                        <strong>{e.name}</strong>
                      </Link>
                      <div className="muted">{e.venue}</div>
                    </td>
                    <td>{e.category ?? <span className="muted">—</span>}</td>
                    <td>{e.nextShowtime ? formatDateTime(e.nextShowtime) : <span className="muted">Chưa có</span>}</td>
                    <td className="num">{e.minPrice !== null ? formatVnd(e.minPrice) : '—'}</td>
                    <td className="actions">
                      <Link to={`/admin/events/${e.id}`} className="btn btn-outline btn-sm">
                        Suất diễn
                      </Link>{' '}
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => setEditing(e)}
                        aria-label={`Sửa ${e.name}`}
                      >
                        <Icon name="edit" size={16} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => setDeleting(e)}
                        aria-label={`Xoá ${e.name}`}
                      >
                        <Icon name="trash" size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={events.data.page}
            totalPages={events.data.totalPages}
            onChange={(p) => {
              const next = new URLSearchParams(params)
              if (p === 0) next.delete('page')
              else next.set('page', String(p))
              setParams(next)
            }}
          />
        </>
      )}

      <Modal open={creating} title="Thêm sự kiện" onClose={() => setCreating(false)}>
        <EventForm
          formId="create-event"
          onCancel={() => setCreating(false)}
          onDone={(saved) => {
            setCreating(false)
            navigate(`/admin/events/${saved.id}`)
          }}
        />
      </Modal>
      <Modal open={editing !== null} title="Sửa sự kiện" onClose={() => setEditing(null)}>
        {editing && (
          <EventForm formId="edit-event" event={editing} onCancel={() => setEditing(null)} onDone={() => setEditing(null)} />
        )}
      </Modal>
      <ConfirmDialog
        open={deleting !== null}
        title="Xoá sự kiện?"
        confirmLabel="Xoá"
        danger
        busy={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
        onCancel={() => setDeleting(null)}
      >
        <p>
          Xoá sự kiện <strong>{deleting?.name}</strong>? Chỉ xoá được khi sự kiện chưa có suất diễn nào.
        </p>
      </ConfirmDialog>
    </div>
  )
}
