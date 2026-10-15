import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { api } from '../../api/endpoints'
import type { Showtime } from '../../api/types'
import { useToast } from '../../components/useToast'
import { errorMessage } from '../../lib/errors'
import { bookingCode } from '../../lib/format'

/** Form huỷ suất diễn: bắt buộc nhập lý do vì lý do được gửi kèm email cho khách đã mua vé. */
export function CancelShowtimeForm({
  showtime,
  onDone,
  onCancel,
}: {
  showtime: Showtime
  onDone: () => void
  onCancel: () => void
}) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const cancel = useMutation({
    mutationFn: () => api.cancelShowtime(showtime.id, reason.trim()),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['showtimes', showtime.eventId] })
      void queryClient.invalidateQueries({ queryKey: ['events'] })
      void queryClient.invalidateQueries({ queryKey: ['event', showtime.eventId] })
      void queryClient.invalidateQueries({ queryKey: ['showtime', showtime.id] })
      void queryClient.invalidateQueries({ queryKey: ['seats', showtime.id] })
      void queryClient.invalidateQueries({ queryKey: ['bookings'] })
      void queryClient.invalidateQueries({ queryKey: ['booking'] })
      void queryClient.invalidateQueries({ queryKey: ['admin'] })
      toast.show('Đã huỷ suất diễn, hệ thống đang hoàn tiền cho khách', 'success')
      onDone()
    },
    onError: (e) => setError(errorMessage(e)),
  })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (reason.trim().length < 3) return setError('Vui lòng nhập lý do huỷ (ít nhất 3 ký tự)')
    cancel.mutate()
  }

  return (
    <form className="stack" onSubmit={submit}>
      <p className="alert alert-warning">
        Suất diễn sẽ ngừng bán ngay. Ghế đang giữ được nhả, khách đã thanh toán được <strong>hoàn tiền tự động</strong>{' '}
        và nhận email kèm lý do bên dưới. Thao tác này không thể hoàn tác.
      </p>
      {error && (
        <p className="alert alert-danger" role="alert">
          {error}
        </p>
      )}
      <div className="field">
        <label htmlFor="cancel-reason">Lý do huỷ (gửi cho khách)</label>
        <textarea
          id="cancel-reason"
          className="textarea"
          required
          minLength={3}
          maxLength={500}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ví dụ: Nghệ sĩ bị ốm đột xuất, ban tổ chức sẽ thông báo lịch diễn bù"
        />
      </div>
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-outline" onClick={onCancel} disabled={cancel.isPending}>
          Quay lại
        </button>
        <button type="submit" className="btn btn-danger" disabled={cancel.isPending}>
          {cancel.isPending && <span className="spinner" />}
          Huỷ suất diễn
        </button>
      </div>
    </form>
  )
}

/** Tiến độ hoàn tiền của suất đã huỷ; tự làm mới khi còn đơn đang hoàn. */
export function CancellationProgress({ showtime }: { showtime: Showtime }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const status = useQuery({
    queryKey: ['admin', 'cancellation', showtime.id],
    queryFn: () => api.cancellationStatus(showtime.id),
    refetchInterval: (query) => {
      const d = query.state.data
      return d && (d.pendingRefunds > 0 || d.paymentsInProgress > 0) ? 4000 : false
    },
  })

  // Gọi lại lệnh huỷ để kích hoạt ngay một lượt hoàn tiền (không đổi lý do đã lưu)
  const retry = useMutation({
    mutationFn: () => api.cancelShowtime(showtime.id, showtime.cancelReason ?? 'Suất diễn bị huỷ'),
    onSuccess: () => toast.show('Đã yêu cầu kiểm tra các đơn đến hạn hoàn tiền', 'success'),
    onError: (e) => toast.show(errorMessage(e), 'error'),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['admin', 'cancellation', showtime.id] }),
  })

  const d = status.data
  return (
    <div className="cancel-progress">
      <span className="badge badge-danger">Đã huỷ</span>
      {showtime.cancelReason && <span className="muted"> {showtime.cancelReason}</span>}
      {status.isPending && <div className="muted">Đang tải tiến độ hoàn tiền...</div>}
      {status.isError && (
        <div className="field-error" role="alert">
          {errorMessage(status.error)}{' '}
          <button type="button" className="btn btn-outline btn-sm" onClick={() => void status.refetch()}>
            Tải lại tiến độ
          </button>
        </div>
      )}
      {d && (
        <ul className="cancel-progress-list" aria-label="Tiến độ hoàn tiền">
          <li>
            Đã hoàn tiền: <strong>{d.refunded}</strong> đơn
          </li>
          {d.pendingRefunds > 0 && (
            <li>
              Đang chờ hoàn: <strong>{d.pendingRefunds}</strong> đơn{' '}
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={retry.isPending}
                onClick={() => retry.mutate()}
              >
                Kiểm tra hoàn tiền
              </button>
            </li>
          )}
          {d.paymentsInProgress > 0 && <li>{d.paymentsInProgress} đơn đang thanh toán dở, sẽ tự hoàn khi xong</li>}
          {d.checkedIn > 0 && (
            <li className="field-error">{d.checkedIn} vé đã soát tại cửa: cần liên hệ khách để xử lý riêng</li>
          )}
          {d.failures.map((f) => (
            <li key={f.bookingId} className="field-error">
              {bookingCode(f.bookingId)}: {f.error} (đã thử {f.attempts} lần, hệ thống tự thử lại)
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
