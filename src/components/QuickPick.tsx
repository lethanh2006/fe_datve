import { useId, useMemo, useState } from 'react'
import type { Seat } from '../api/types'
import { categoryLabel } from '../lib/seats'
import { quickPick, type QuickPickResult } from '../lib/quickPick'

interface QuickPickProps {
  seats: Seat[]
  maxSeats: number
  disabled?: boolean
  /** `result` là null khi không đủ ghế trống theo yêu cầu */
  onPick: (result: QuickPickResult | null, wanted: number, category: string) => void
}

/** Thanh chọn nhanh: chọn số ghế (và hạng) rồi để hệ thống chọn dãy ghế liền nhau đẹp nhất còn trống. */
export function QuickPick({ seats, maxSeats, disabled, onPick }: QuickPickProps) {
  const [count, setCount] = useState(2)
  const [category, setCategory] = useState('')
  const countId = useId()
  const categoryId = useId()
  const categories = useMemo(() => [...new Set(seats.map((s) => s.category))], [seats])

  return (
    <div className="quickpick" role="group" aria-label="Chọn nhanh ghế đẹp">
      <div className="field">
        <label htmlFor={countId}>Số ghế</label>
        <select id={countId} className="select" value={count} onChange={(e) => setCount(Number(e.target.value))}>
          {Array.from({ length: maxSeats }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
      {categories.length > 1 && (
        <div className="field">
          <label htmlFor={categoryId}>Hạng ghế</label>
          <select id={categoryId} className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Mọi hạng</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {categoryLabel(c)}
              </option>
            ))}
          </select>
        </div>
      )}
      <button
        type="button"
        className="btn btn-outline"
        disabled={disabled}
        onClick={() => onPick(quickPick(seats, count, category || undefined), count, category)}
      >
        Chọn nhanh
      </button>
    </div>
  )
}
