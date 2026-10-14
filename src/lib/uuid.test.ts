import { describe, expect, it } from 'vitest'
import { uuid } from './uuid'

describe('uuid', () => {
  it('đúng định dạng UUID v4 và không trùng nhau', () => {
    const ids = Array.from({ length: 50 }, uuid)
    for (const id of ids) expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    expect(new Set(ids).size).toBe(50)
  })
  it('thoả quy tắc Idempotency-Key của backend (8-100 ký tự chữ, số, - _ : .)', () => {
    expect(uuid()).toMatch(/^[A-Za-z0-9_\-:.]{8,100}$/)
  })
})
