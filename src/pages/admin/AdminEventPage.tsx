import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../api/endpoints'
import type { Showtime } from '../../api/types'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Icon } from '../../components/Icon'
import { Modal } from '../../components/Modal'
import { EmptyState, ErrorState, Spinner } from '../../components/States'
import { errorMessage } from '../../lib/errors'
import { useToast } from '../../components/useToast'
import { formatDateTime, formatVnd, zonedInputToIso } from '../../lib/format'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { EventForm } from './EventForm'
import { SectionsEditor } from './SectionsEditor'
import { newSection, parseSections, type SectionDraft } from './sections'

/** Form thêm suất diễn: giờ nhập theo múi giờ của sự kiện, kèm khu ghế để sinh ghế luôn. */
function ShowtimeForm({ eventId, onDone, onCancel }: { eventId: number; onDone: () => void; onCancel: () => void }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [withSeats, setWithSeats] = useState(true)
  const [sections, setSections] = useState<SectionDraft[]>([
    newSection(1, { category: 'VIP', rows: 'A-B', faceValue: '600000' }),
    newSection(2, { category: 'STANDARD', rows: 'C-F', faceValue: '300000' }),
  ])
  const [error, setError] = useState<string | null>(null)
  const parsed = parseSections(sections)

  const create = useMutation({
    mutationFn: (input: Parameters<typeof api.createShowtime>[1]) => api.createShowtime(eventId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['showtimes', eventId] })
      void queryClient.invalidateQueries({ queryKey: ['events'] })
      void queryClient.invalidateQueries({ queryKey: ['event', eventId] })
      toast.show('Đã thêm suất diễn', 'success')
      onDone()
    },
    onError: (e) => setError(errorMessage(e)),
  })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    const startTime = zonedInputToIso(start)
    const endTime = zonedInputToIso(end)
    if (!startTime || !endTime) return setError('Vui lòng nhập giờ bắt đầu và kết thúc')
    if (new Date(endTime) <= new Date(startTime)) return setError('Giờ kết thúc phải sau giờ bắt đầu')
    if (withSeats && parsed.error) return setError(parsed.error)
    create.mutate({ startTime, endTime, sections: withSeats ? parsed.sections : undefined })
  }

  return (
    <form className="stack" onSubmit={submit}>
      {error && (
        <p className="alert alert-danger" role="alert">
          {error}
        </p>
      )}
      <div className="form-grid">
        <div className="field">
          <label htmlFor="st-start">Bắt đầu</label>
          <input id="st-start" className="input" type="datetime-local" required value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="st-end">Kết thúc</label>
          <input id="st-end" className="input" type="datetime-local" required value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
      </div>
      <label className="check">
        <input type="checkbox" checked={withSeats} onChange={(e) => setWithSeats(e.target.checked)} />
        Tạo ghế cùng lúc
      </label>
      {withSeats && (
        <>
          <SectionsEditor value={sections} onChange={setSections} idPrefix="st" />
          <p className={parsed.error ? 'field-error' : 'muted'} role="status">
            {parsed.error ?? `Sẽ tạo ${parsed.totalSeats} ghế`}
          </p>
        </>
      )}
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-outline" onClick={onCancel} disabled={create.isPending}>
          Huỷ
        </button>
        <button type="submit" className="btn btn-primary" disabled={create.isPending}>
          {create.isPending && <span className="spinner" />}
          Thêm suất diễn
        </button>
      </div>
    </form>
  )
}

function AddSeatsForm({ showtime, onDone, onCancel }: { showtime: Showtime; onDone: () => void; onCancel: () => void }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [sections, setSections] = useState<SectionDraft[]>([newSection(1, { rows: '', faceValue: '300000' })])
  const [error, setError] = useState<string | null>(null)
  const parsed = parseSections(sections)

  const add = useMutation({
    mutationFn: () => api.addSeats(showtime.id, parsed.sections),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['showtimes', showtime.eventId] })
      void queryClient.invalidateQueries({ queryKey: ['seats', showtime.id] })
      toast.show(`Đã thêm ${parsed.totalSeats} ghế`, 'success')
      onDone()
    },
    onError: (e) => setError(errorMessage(e)),
  })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (parsed.error) return setError(parsed.error)
    add.mutate()
  }

  return (
    <form className="stack" onSubmit={submit}>
      {error && (
        <p className="alert alert-danger" role="alert">
          {error}
        </p>
      )}
      <p className="muted">
        Suất hiện có {showtime.totalSeats} ghế. Mã ghế mới không được trùng mã đã có (ví dụ hàng A đã tồn tại thì dùng hàng khác).
      </p>
      <SectionsEditor value={sections} onChange={setSections} idPrefix="add" />
      <p className={parsed.error ? 'field-error' : 'muted'} role="status">
        {parsed.error ?? `Sẽ thêm ${parsed.totalSeats} ghế`}
      </p>
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-outline" onClick={onCancel} disabled={add.isPending}>
          Huỷ
        </button>
        <button type="submit" className="btn btn-primary" disabled={add.isPending}>
          {add.isPending && <span className="spinner" />}
          Thêm ghế
        </button>
      </div>
    </form>
  )
}

export default function AdminEventPage() {
  const id = Number(useParams().id)
  const queryClient = useQueryClient()
  const toast = useToast()
  const event = useQuery({ queryKey: ['event', id], queryFn: () => api.event(id), enabled: Number.isFinite(id) })
  const showtimes = useQuery({ queryKey: ['showtimes', id], queryFn: () => api.showtimes(id), enabled: Number.isFinite(id) })
  useDocumentTitle(event.data ? `Quản trị · ${event.data.name}` : 'Quản trị')

  const [editing, setEditing] = useState(false)
  const [addingShowtime, setAddingShowtime] = useState(false)
  const [addSeatsFor, setAddSeatsFor] = useState<Showtime | null>(null)
  const [deleting, setDeleting] = useState<Showtime | null>(null)

  const removeShowtime = useMutation({
    mutationFn: (s: Showtime) => api.deleteShowtime(s.id),
    onSuccess: () => {
      toast.show('Đã xoá suất diễn', 'success')
      void queryClient.invalidateQueries({ queryKey: ['showtimes', id] })
      void queryClient.invalidateQueries({ queryKey: ['events'] })
      setDeleting(null)
    },
    onError: (e) => {
      toast.show(errorMessage(e), 'error')
      setDeleting(null)
    },
  })

  if (event.isPending) return <Spinner />
  if (event.isError) return <ErrorState error={event.error} onRetry={() => event.refetch()} />
  const e = event.data

  return (
    <div className="stack" style={{ gap: 24 }}>
      <nav className="breadcrumb" aria-label="Đường dẫn">
        <Link to="/admin/events">Sự kiện</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{e.name}</span>
      </nav>

      <section className="card card-pad row row-wrap" aria-label="Thông tin sự kiện">
        <div style={{ flex: 1, minWidth: 240 }}>
          <h2>{e.name}</h2>
          <p className="muted">
            {e.category ? `${e.category} · ` : ''}
            {e.venue}
          </p>
          {e.description && <p style={{ marginTop: 8 }}>{e.description}</p>}
        </div>
        <Link to={`/events/${e.id}`} className="btn btn-outline">
          Xem trang công khai
        </Link>
        <button type="button" className="btn btn-outline" onClick={() => setEditing(true)}>
          <Icon name="edit" /> Sửa
        </button>
      </section>

      <section aria-labelledby="st-title" className="stack">
        <div className="row">
          <h2 id="st-title" style={{ flex: 1 }}>
            Suất diễn
          </h2>
          <button type="button" className="btn btn-primary" onClick={() => setAddingShowtime(true)}>
            <Icon name="plus" /> Thêm suất diễn
          </button>
        </div>

        {showtimes.isPending ? (
          <Spinner />
        ) : showtimes.isError ? (
          <ErrorState error={showtimes.error} onRetry={() => showtimes.refetch()} />
        ) : showtimes.data.length === 0 ? (
          <EmptyState icon="📅" title="Chưa có suất diễn" />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th className="num">Ghế còn / tổng</th>
                  <th className="num">Giá từ</th>
                  <th>
                    <span className="sr-only">Thao tác</span>
                  </th>                </tr>
              </thead>
              <tbody>
                {showtimes.data.map((s) => (
                  <tr key={s.id}>
                    <td>{formatDateTime(s.startTime)}</td>
                    <td className="num">
                      {s.availableSeats} / {s.totalSeats}
                    </td>
                    <td className="num">{s.minPrice !== null ? formatVnd(s.minPrice) : '—'}</td>
                    <td className="actions">
                      <Link to={`/showtimes/${s.id}`} className="btn btn-ghost btn-sm">
                        Sơ đồ ghế
                      </Link>
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => setAddSeatsFor(s)}>
                        Thêm ghế
                      </button>{' '}
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => setDeleting(s)}
                        aria-label={`Xoá suất ${formatDateTime(s.startTime)}`}
                      >
                        <Icon name="trash" size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal open={editing} title="Sửa sự kiện" onClose={() => setEditing(false)}>
        <EventForm formId="edit-event" event={e} onCancel={() => setEditing(false)} onDone={() => setEditing(false)} />
      </Modal>
      <Modal open={addingShowtime} title="Thêm suất diễn" onClose={() => setAddingShowtime(false)} width={760}>
        <ShowtimeForm eventId={e.id} onCancel={() => setAddingShowtime(false)} onDone={() => setAddingShowtime(false)} />
      </Modal>
      <Modal open={addSeatsFor !== null} title="Thêm ghế cho suất diễn" onClose={() => setAddSeatsFor(null)} width={760}>
        {addSeatsFor && <AddSeatsForm showtime={addSeatsFor} onCancel={() => setAddSeatsFor(null)} onDone={() => setAddSeatsFor(null)} />}
      </Modal>
      <ConfirmDialog
        open={deleting !== null}
        title="Xoá suất diễn?"
        confirmLabel="Xoá"
        danger
        busy={removeShowtime.isPending}
        onConfirm={() => deleting && removeShowtime.mutate(deleting)}
        onCancel={() => setDeleting(null)}
      >
        <p>
          Xoá suất diễn lúc <strong>{deleting && formatDateTime(deleting.startTime)}</strong> cùng toàn bộ ghế? Chỉ xoá được khi chưa có
          ai đặt vé.
        </p>
      </ConfirmDialog>
    </div>
  )
}
