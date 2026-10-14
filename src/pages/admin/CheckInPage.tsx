import { useMutation } from '@tanstack/react-query'
import { useRef, useState, type FormEvent } from 'react'
import { ApiError } from '../../api/client'
import { api } from '../../api/endpoints'
import type { Booking, CheckInResponse } from '../../api/types'
import { Icon } from '../../components/Icon'
import { bookingCode, formatDateTime, formatTime } from '../../lib/format'
import { errorMessage } from '../../lib/errors'

interface ScanEntry {
  key: number
  at: number
  code: string
  outcome: 'ok' | 'again' | 'error'
  label: string
}

function TicketSummary({ booking }: { booking: Booking }) {
  return (
    <dl className="scan-details">
      <div>
        <dt>Sự kiện</dt>
        <dd>
          {booking.eventName}
          <br />
          <span className="muted">{formatDateTime(booking.startTime)}</span>
        </dd>
      </div>
      <div>
        <dt>Ghế</dt>
        <dd>{booking.seats.map((s) => s.seatCode).join(', ')}</dd>
      </div>
      <div>
        <dt>Khách hàng</dt>
        <dd>
          {booking.customer?.fullName}
          <br />
          <span className="muted">{booking.customer?.email}</span>
        </dd>
      </div>
      <div>
        <dt>Mã đơn</dt>
        <dd>{bookingCode(booking.id)}</dd>
      </div>
    </dl>
  )
}

export default function CheckInPage() {
  const [code, setCode] = useState('')
  const [history, setHistory] = useState<ScanEntry[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const nextKey = useRef(1)

  const scan = useMutation<CheckInResponse, unknown, string>({
    mutationFn: (ticketCode) => api.checkIn(ticketCode),
    onSettled: (data, error, ticketCode) => {
      const entry: ScanEntry = data
        ? {
            key: nextKey.current++,
            at: Date.now(),
            code: ticketCode,
            outcome: data.result === 'CHECKED_IN' ? 'ok' : 'again',
            label: `${data.booking.customer?.fullName ?? ''} · ${data.booking.seats.map((s) => s.seatCode).join(', ')}`,
          }
        : { key: nextKey.current++, at: Date.now(), code: ticketCode, outcome: 'error', label: errorMessage(error) }
      setHistory((h) => [entry, ...h].slice(0, 10))
      // Xoá ô nhập và đặt con trỏ lại để quét vé tiếp theo ngay
      setCode('')
      inputRef.current?.focus()
    },
  })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const value = code.trim()
    if (value) scan.mutate(value)
  }

  const result = scan.data
  const failure = scan.error
  const failureTitle = failure instanceof ApiError && failure.code === 'TICKET_NOT_FOUND' ? 'Mã vé không hợp lệ' : 'Không thể soát vé'

  return (
    <div className="stack" style={{ gap: 24, maxWidth: 760 }}>
      <form className="card card-pad stack" onSubmit={submit}>
        <div>
          <h2>Soát vé</h2>
          <p className="muted">Quét mã QR trên vé điện tử bằng máy quét, hoặc nhập mã vé rồi nhấn Enter.</p>
        </div>
        <div className="field">
          <label htmlFor="ticket-code">Mã vé</label>
          <div className="row">
            <input
              id="ticket-code"
              ref={inputRef}
              className="input scan-input"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoFocus
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              maxLength={64}
              placeholder="vd: 3f9a1c0b7d2e4a58"
            />
            <button type="submit" className="btn btn-primary" disabled={scan.isPending || code.trim() === ''}>
              {scan.isPending ? <span className="spinner" /> : <Icon name="check" />}
              Soát vé
            </button>
          </div>
        </div>
      </form>

      <div aria-live="assertive" role="status">
        {scan.isPending ? null : result ? (
          <section className={`card card-pad scan-result ${result.result === 'CHECKED_IN' ? 'is-ok' : 'is-warn'}`}>
            <h2>
              {result.result === 'CHECKED_IN'
                ? 'Hợp lệ - cho vào'
                : `Vé đã được quét lúc ${result.booking.checkedInAt ? formatTime(result.booking.checkedInAt) : ''}`}
            </h2>
            <TicketSummary booking={result.booking} />
          </section>
        ) : failure ? (
          <section className="card card-pad scan-result is-bad">
            <h2>{failureTitle}</h2>
            {errorMessage(failure) !== failureTitle && <p>{errorMessage(failure)}</p>}
          </section>
        ) : null}
      </div>

      {history.length > 0 && (
        <section aria-labelledby="scan-history">
          <h3 id="scan-history" style={{ marginBottom: 10 }}>
            Lượt quét gần đây
          </h3>
          <ul className="scan-history">
            {history.map((h) => (
              <li key={h.key} className={`is-${h.outcome}`}>
                <span className="muted">{formatTime(new Date(h.at).toISOString())}</span>
                <code>{h.code}</code>
                <span>{h.label}</span>
                <span className={`badge badge-${h.outcome === 'ok' ? 'success' : h.outcome === 'again' ? 'warning' : 'danger'}`}>
                  {h.outcome === 'ok' ? 'Cho vào' : h.outcome === 'again' ? 'Đã quét' : 'Lỗi'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
