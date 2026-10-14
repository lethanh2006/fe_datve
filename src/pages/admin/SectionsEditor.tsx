import { Icon } from '../../components/Icon'
import { newSection, type SectionDraft } from './sections'

interface SectionsEditorProps {
  value: SectionDraft[]
  onChange: (next: SectionDraft[]) => void
  idPrefix: string
}

export function SectionsEditor({ value, onChange, idPrefix }: SectionsEditorProps) {
  const update = (key: number, patch: Partial<SectionDraft>) =>
    onChange(value.map((s) => (s.key === key ? { ...s, ...patch } : s)))
  const nextKey = value.reduce((max, s) => Math.max(max, s.key), 0) + 1

  return (
    <div className="stack" style={{ gap: 12 }}>
      {value.map((s, i) => (
        <fieldset key={s.key} className="section-box">
          <legend>Khu {i + 1}</legend>
          <div className="form-grid section-grid">
            <div className="field">
              <label htmlFor={`${idPrefix}-cat-${s.key}`}>Hạng ghế</label>
              <input
                id={`${idPrefix}-cat-${s.key}`}
                className="input"
                list={`${idPrefix}-tiers`}
                value={s.category}
                maxLength={30}
                onChange={(e) => update(s.key, { category: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor={`${idPrefix}-rows-${s.key}`}>Hàng ghế</label>
              <input
                id={`${idPrefix}-rows-${s.key}`}
                className="input"
                value={s.rows}
                placeholder="A-D hoặc A, B, C"
                onChange={(e) => update(s.key, { rows: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor={`${idPrefix}-n-${s.key}`}>Ghế mỗi hàng</label>
              <input
                id={`${idPrefix}-n-${s.key}`}
                className="input"
                type="number"
                min={1}
                max={100}
                value={s.seatsPerRow}
                onChange={(e) => update(s.key, { seatsPerRow: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor={`${idPrefix}-price-${s.key}`}>Giá vé (₫)</label>
              <input
                id={`${idPrefix}-price-${s.key}`}
                className="input"
                type="number"
                min={0}
                step={1000}
                value={s.faceValue}
                onChange={(e) => update(s.key, { faceValue: e.target.value })}
              />
            </div>
          </div>
          {value.length > 1 && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => onChange(value.filter((x) => x.key !== s.key))}
            >
              <Icon name="trash" size={14} /> Xoá khu {i + 1}
            </button>
          )}
        </fieldset>
      ))}
      <datalist id={`${idPrefix}-tiers`}>
        <option value="VIP" />
        <option value="STANDARD" />
        <option value="ECONOMY" />
      </datalist>
      <div>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => onChange([...value, newSection(nextKey, { rows: '', faceValue: '100000' })])}>
          <Icon name="plus" size={14} /> Thêm khu ghế
        </button>
      </div>
    </div>
  )
}
