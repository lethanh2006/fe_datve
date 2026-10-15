import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockFetch, renderApp, resetApiState } from '../test/utils'
import { HomePage } from './HomePage'

const event = {
  id: 1,
  name: 'Đêm nhạc Trịnh',
  description: null,
  venue: 'Nhà hát',
  category: 'Âm nhạc',
  imageUrl: null,
  minPrice: 100000,
  nextShowtime: '2030-01-01T12:00:00Z',
}
const page = { content: [event], page: 0, size: 12, totalElements: 1, totalPages: 1 }
afterEach(() => {
  vi.unstubAllGlobals()
  resetApiState()
})

describe('khám phá sự kiện', () => {
  it('tìm kiếm và lọc vẫn dùng URL, xoá bộ lọc khôi phục ô tìm kiếm', async () => {
    const calls = mockFetch({
      'GET /api/events': () => ({ body: page }),
      'GET /api/events/categories': () => ({ body: ['Âm nhạc', 'Sân khấu'] }),
    })
    renderApp(<HomePage />)
    await userEvent.type(screen.getByRole('searchbox', { name: 'Tìm sự kiện' }), 'dem nhac')
    await userEvent.click(screen.getByRole('button', { name: 'Tìm sự kiện' }))
    await waitFor(() =>
      expect(calls.some((call) => new URL(call.path, 'http://test').searchParams.get('q') === 'dem nhac')).toBe(true),
    )
    await userEvent.click(await screen.findByRole('button', { name: 'Âm nhạc' }))
    await waitFor(() =>
      expect(calls.some((call) => new URL(call.path, 'http://test').searchParams.get('category') === 'Âm nhạc')).toBe(
        true,
      ),
    )
    expect(screen.getByRole('button', { name: 'Âm nhạc' })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'Xoá bộ lọc' }))
    expect(screen.getByRole('searchbox', { name: 'Tìm sự kiện' })).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Tất cả' })).toHaveAttribute('aria-pressed', 'true')
  })
  it('liên kết có bộ lọc hiển thị đúng nội dung và không có sự kiện giả khi rỗng', async () => {
    mockFetch({
      'GET /api/events': () => ({ body: { ...page, content: [], totalElements: 0, totalPages: 0 } }),
      'GET /api/events/categories': () => ({ body: [] }),
    })
    renderApp(<HomePage />, { route: '/?q=khong-co' })
    expect(screen.getByRole('searchbox', { name: 'Tìm sự kiện' })).toHaveValue('khong-co')
    expect(await screen.findByText('Chưa tìm thấy sự kiện phù hợp')).toBeInTheDocument()
    expect(screen.queryByText('SẮP DIỄN RA')).not.toBeInTheDocument()
  })
})
