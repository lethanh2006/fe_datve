import { describe, expect, it } from 'vitest'
import { pageWindow } from './pagination'

describe('pageWindow', () => {
  it('ít trang thì hiện đủ', () => {
    expect(pageWindow(0, 3)).toEqual([0, 1, 2])
  })
  it('nhiều trang thì rút gọn bằng dấu …', () => {
    expect(pageWindow(5, 20)).toEqual([0, 'gap', 4, 5, 6, 'gap', 19])
    expect(pageWindow(0, 20)).toEqual([0, 1, 'gap', 19])
    expect(pageWindow(19, 20)).toEqual([0, 'gap', 18, 19])
  })
  it('không chèn … khi các trang liền nhau', () => {
    expect(pageWindow(2, 5)).toEqual([0, 1, 2, 3, 4])
  })
})
