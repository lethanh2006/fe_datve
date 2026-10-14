import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../../api/endpoints'
import type { Stats } from '../../api/types'
import { ErrorState, Spinner } from '../../components/States'
import { formatCompact, formatDayMonth, formatVnd } from '../../lib/format'
import { BOOKING_STATUSES, BOOKING_STATUS_LABEL, BOOKING_STATUS_TONE } from '../../lib/status'

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card stat-card">
      <span className="muted">{label}</span>
      <strong>{value}</strong>
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  )
}

/** Biểu đồ cột doanh thu theo ngày, vẽ bằng SVG, có bảng ẩn cho trình đọc màn hình. */
function RevenueChart({ daily }: { daily: Stats['daily'] }) {
  const W = 640
  const H = 220
  const pad = { top: 16, right: 8, bottom: 28, left: 8 }
  const max = Math.max(...daily.map((d) => d.revenue), 1)
  const slot = (W - pad.left - pad.right) / daily.length
  const barW = slot * 0.62
  const total = daily.reduce((sum, d) => sum + d.revenue, 0)

  return (
    <figure className="chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Doanh thu ${daily.length} ngày gần nhất, tổng ${formatVnd(total)}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {[0.25, 0.5, 0.75, 1].map((t) => {
          const y = pad.top + (H - pad.top - pad.bottom) * (1 - t)
          return (
            <g key={t}>
              <line x1={pad.left} x2={W - pad.right} y1={y} y2={y} className="chart-grid" />
              <text x={pad.left + 2} y={y - 4} className="chart-label">
                {formatCompact(max * t)}
              </text>
            </g>
          )
        })}
        {daily.map((d, i) => {
          const h = ((H - pad.top - pad.bottom) * d.revenue) / max
          const x = pad.left + slot * i + (slot - barW) / 2
          const y = H - pad.bottom - h
          return (
            <g key={d.date}>
              <rect x={x} y={d.revenue > 0 ? y : H - pad.bottom - 2} width={barW} height={d.revenue > 0 ? h : 2} rx={4} className="chart-bar">
                <title>{`${formatDayMonth(d.date)}: ${formatVnd(d.revenue)} (${d.confirmedBookings} đơn)`}</title>
              </rect>
              {i % 2 === 0 && (
                <text x={x + barW / 2} y={H - 8} textAnchor="middle" className="chart-label">
                  {formatDayMonth(d.date)}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      <figcaption className="sr-only">
        <table>
          <thead>
            <tr>
              <th>Ngày</th>
              <th>Số đơn</th>
              <th>Doanh thu</th>
            </tr>
          </thead>
          <tbody>
            {daily.map((d) => (
              <tr key={d.date}>
                <td>{d.date}</td>
                <td>{d.confirmedBookings}</td>
                <td>{formatVnd(d.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </figcaption>
    </figure>
  )
}

export default function DashboardPage() {
  const stats = useQuery({ queryKey: ['admin', 'stats'], queryFn: api.stats, refetchInterval: 30_000 })

  if (stats.isPending) return <Spinner />
  if (stats.isError) return <ErrorState error={stats.error} onRetry={() => stats.refetch()} />
  const s = stats.data

  return (
    <div className="stack" style={{ gap: 24 }}>
      <div className="stat-grid">
        <StatCard label="Doanh thu" value={formatVnd(s.revenue)} hint="Từ các đơn đã xác nhận" />
        <StatCard label="Vé đã bán" value={s.seatsSold.toLocaleString('vi-VN')} />
        <StatCard label="Sự kiện" value={String(s.events)} hint={`${s.upcomingShowtimes} suất sắp diễn ra`} />
        <StatCard label="Người dùng" value={String(s.users)} />
      </div>

      <section className="card card-pad" aria-labelledby="chart-title">
        <div className="section-head">
          <h2 id="chart-title">Doanh thu 14 ngày gần nhất</h2>
        </div>
        <RevenueChart daily={s.daily} />
      </section>

      <div className="two-col">
        <section className="card card-pad" aria-labelledby="status-title">
          <h2 id="status-title" style={{ marginBottom: 14 }}>
            Đơn theo trạng thái
          </h2>
          <ul className="status-list">
            {BOOKING_STATUSES.map((st) => (
              <li key={st}>
                <span className={`badge badge-${BOOKING_STATUS_TONE[st]}`}>{BOOKING_STATUS_LABEL[st]}</span>
                <strong>{s.bookingsByStatus[st]}</strong>
              </li>
            ))}
          </ul>
        </section>

        <section className="card card-pad" aria-labelledby="top-title">
          <h2 id="top-title" style={{ marginBottom: 14 }}>
            Sự kiện bán chạy
          </h2>
          {s.topEvents.length === 0 ? (
            <p className="muted">Chưa có vé nào được bán.</p>
          ) : (
            <ol className="top-list">
              {s.topEvents.map((e) => (
                <li key={e.eventId}>
                  <Link to={`/admin/events/${e.eventId}`}>{e.name}</Link>
                  <span className="muted">{e.seatsSold} vé</span>
                  <strong>{formatVnd(e.revenue)}</strong>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  )
}
