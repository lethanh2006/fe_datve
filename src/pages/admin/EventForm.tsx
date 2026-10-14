import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { api } from '../../api/endpoints'
import type { EventInput, EventSummary } from '../../api/types'
import { errorMessage } from '../../lib/errors'
import { useToast } from '../../components/useToast'

interface EventFormProps {
  /** Có giá trị thì là sửa, không có là tạo mới */
  event?: EventSummary
  onDone: (saved: EventSummary) => void
  onCancel: () => void
  formId: string
}

export function EventForm({ event, onDone, onCancel, formId }: EventFormProps) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const categories = useQuery({ queryKey: ['categories'], queryFn: api.categories, staleTime: 60_000 })
  const [values, setValues] = useState({
    name: event?.name ?? '',
    category: event?.category ?? '',
    venue: event?.venue ?? '',
    imageUrl: event?.imageUrl ?? '',
    description: event?.description ?? '',
  })
  const [error, setError] = useState<string | null>(null)

  const save = useMutation({
    mutationFn: (input: EventInput) => (event ? api.updateEvent(event.id, input) : api.createEvent(input)),
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ['events'] })
      void queryClient.invalidateQueries({ queryKey: ['event', saved.id] })
      void queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast.show(event ? 'Đã lưu sự kiện' : 'Đã tạo sự kiện', 'success')
      onDone(saved)
    },
    onError: (e) => setError(errorMessage(e)),
  })

  const set = (key: keyof typeof values) => (e: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [key]: e.target.value }))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    save.mutate({
      name: values.name,
      venue: values.venue,
      category: values.category,
      imageUrl: values.imageUrl,
      description: values.description,
    })
  }

  return (
    <form id={formId} className="form-grid" onSubmit={submit}>
      {error && (
        <p className="alert alert-danger full" role="alert">
          {error}
        </p>
      )}
      <div className="field full">
        <label htmlFor={`${formId}-name`}>Tên sự kiện</label>
        <input id={`${formId}-name`} className="input" required maxLength={255} value={values.name} onChange={set('name')} />
      </div>
      <div className="field">
        <label htmlFor={`${formId}-category`}>Thể loại</label>
        <input
          id={`${formId}-category`}
          className="input"
          list={`${formId}-categories`}
          maxLength={50}
          value={values.category}
          onChange={set('category')}
        />
        <datalist id={`${formId}-categories`}>
          {(categories.data ?? []).map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>
      <div className="field">
        <label htmlFor={`${formId}-venue`}>Địa điểm</label>
        <input id={`${formId}-venue`} className="input" required maxLength={255} value={values.venue} onChange={set('venue')} />
      </div>
      <div className="field full">
        <label htmlFor={`${formId}-image`}>Ảnh bìa (đường dẫn)</label>
        <input
          id={`${formId}-image`}
          className="input"
          type="url"
          placeholder="https://..."
          maxLength={2048}
          value={values.imageUrl}
          onChange={set('imageUrl')}
        />
      </div>
      <div className="field full">
        <label htmlFor={`${formId}-desc`}>Mô tả</label>
        <textarea
          id={`${formId}-desc`}
          className="textarea"
          maxLength={5000}
          value={values.description}
          onChange={set('description')}
        />
      </div>
      <div className="full row" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-outline" onClick={onCancel} disabled={save.isPending}>
          Huỷ
        </button>
        <button type="submit" className="btn btn-primary" disabled={save.isPending}>
          {save.isPending && <span className="spinner" />}
          {event ? 'Lưu thay đổi' : 'Tạo sự kiện'}
        </button>
      </div>
    </form>
  )
}
