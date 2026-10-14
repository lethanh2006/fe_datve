import { describe, expect, it } from 'vitest'
import { parseRows } from './rows'

describe('parseRows', () => {
  it('đọc danh sách ngăn cách bằng dấu phẩy hoặc khoảng trắng, tự viết hoa', () => {
    expect(parseRows('a, b c')).toEqual(['A', 'B', 'C'])
  })
  it('đọc khoảng A-D', () => {
    expect(parseRows('A-D')).toEqual(['A', 'B', 'C', 'D'])
    expect(parseRows('a-c, F')).toEqual(['A', 'B', 'C', 'F'])
  })
  it('bỏ trùng và giữ thứ tự nhập', () => {
    expect(parseRows('B, A-C')).toEqual(['B', 'A', 'C'])
  })
  it('nhận hàng hai chữ cái', () => {
    expect(parseRows('AA, AB')).toEqual(['AA', 'AB'])
  })
  it('từ chối đầu vào sai', () => {
    expect(parseRows('')).toBeNull()
    expect(parseRows('D-A')).toBeNull()
    expect(parseRows('A1')).toBeNull()
    expect(parseRows('A, 5')).toBeNull()
    expect(parseRows('ABC')).toBeNull()
  })
})
