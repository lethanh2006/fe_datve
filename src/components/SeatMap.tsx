import { useMemo } from 'react'
import type { Seat } from '../api/types'
import { formatVnd } from '../lib/format'
import { aisleAfter, categoryColorIndex, categoryLabel, groupSeatsByRow } from '../lib/seats'

interface SeatMapProps {
  seats: Seat[]
  selectedIds: ReadonlySet<number>
  onToggle: (seat: Seat) => void
  /** Khoá toàn bộ sơ đồ (ví dụ đang gửi yêu cầu giữ ghế) */
  disabled?: boolean
}

const STATUS_TEXT = { AVAILABLE: 'còn trống', HELD: 'đang được giữ', BOOKED: 'đã bán' } as const

export function SeatMap({ seats, selectedIds, onToggle, disabled }: SeatMapProps) {
  const rows = useMemo(() => groupSeatsByRow(seats), [seats])

  return (
    <div className="seatmap" role="group" aria-label="Sơ đồ chọn ghế">
      <div className="seatmap-stage" aria-hidden="true">
        SÂN KHẤU
      </div>
      <p className="seatmap-hint">Vuốt ngang để xem toàn bộ sơ đồ ghế</p>
      <div className="seatmap-scroll">
        <div className="seatmap-rows">
          {rows.map(({ row, seats: rowSeats }) => (
            <div className="seatmap-row" key={row} role="group" aria-label={`Hàng ${row}`}>
              <span className="seatmap-row-label" aria-hidden="true">
                {row}
              </span>
              <div className="seatmap-seats">
                {rowSeats.map((seat, index) => {
                  const selected = selectedIds.has(seat.id)
                  const unavailable = seat.status !== 'AVAILABLE'
                  return (
                    <button
                      key={seat.id}
                      type="button"
                      className={[
                        'seat',
                        selected ? 'is-selected' : '',
                        seat.status === 'HELD' ? 'is-held' : '',
                        seat.status === 'BOOKED' ? 'is-booked' : '',
                        aisleAfter(index, rowSeats.length) ? 'has-aisle' : '',
                      ].join(' ')}
                      style={{ '--cat': `var(--cat-${categoryColorIndex(seat.category)})` } as React.CSSProperties}
                      aria-pressed={selected}
                      aria-label={`Ghế ${seat.seatCode}, ${categoryLabel(seat.category)}, ${formatVnd(seat.faceValue)}, ${
                        selected ? 'đang chọn' : STATUS_TEXT[seat.status]
                      }`}
                      disabled={disabled || (unavailable && !selected)}
                      onClick={() => onToggle(seat)}
                    >
                      {seat.status === 'BOOKED' ? '×' : seat.seatCode.replace(/^[A-Za-z]+/, '')}
                    </button>
                  )
                })}
              </div>
              <span className="seatmap-row-label" aria-hidden="true">
                {row}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function SeatLegend({ seats }: { seats: Seat[] }) {
  const tiers = useMemo(() => {
    const byCategory = new Map<string, number>()
    for (const seat of seats) {
      const min = byCategory.get(seat.category)
      if (min === undefined || seat.faceValue < min) byCategory.set(seat.category, seat.faceValue)
    }
    return [...byCategory.entries()].sort((a, b) => b[1] - a[1])
  }, [seats])

  return (
    <ul className="seat-legend" aria-label="Chú thích">
      {tiers.map(([category, price]) => (
        <li key={category}>
          <span
            className="seat-swatch"
            style={{ '--cat': `var(--cat-${categoryColorIndex(category)})` } as React.CSSProperties}
          />
          {categoryLabel(category)} · {formatVnd(price)}
        </li>
      ))}
      <li>
        <span className="seat-swatch is-selected" /> Đang chọn
      </li>
      <li>
        <span className="seat-swatch is-held" /> Đang được giữ
      </li>
      <li>
        <span className="seat-swatch is-booked" /> Đã bán
      </li>
    </ul>
  )
}
