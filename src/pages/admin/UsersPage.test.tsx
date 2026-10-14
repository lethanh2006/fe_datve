import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AdminUser } from '../../api/types'
import { mockFetch, renderApp, resetApiState } from '../../test/utils'
import UsersPage from './UsersPage'

const user = (over: Partial<AdminUser>): AdminUser => ({
  id: 1,
  email: 'a@test.com',
  fullName: 'Nguyễn An',
  role: 'USER',
  createdAt: '2026-10-01T00:00:00.000Z',
  disabledAt: null,
  confirmedBookings: 2,
  totalSpent: 1_400_000,
  ...over,
})

const me = { id: 9, email: 'admin@test.com', fullName: 'Quản Trị', role: 'ADMIN' as const, createdAt: '2026-01-01T00:00:00.000Z' }

let rows: AdminUser[]

function setup(extra: Parameters<typeof mockFetch>[0] = {}) {
  localStorage.setItem('datve.token', 'tok')
  rows = [
    user({ id: 9, email: 'admin@test.com', fullName: 'Quản Trị', role: 'ADMIN' }),
    user({ id: 1 }),
    user({ id: 2, email: 'b@test.com', fullName: 'Trần Bình', disabledAt: '2026-10-10T00:00:00.000Z', confirmedBookings: 0, totalSpent: 0 }),
  ]
  const calls = mockFetch({
    'GET /api/auth/me': () => ({ body: me }),
    'GET /api/admin/users': () => ({ body: { content: rows, page: 0, size: 15, totalElements: rows.length, totalPages: 1 } }),
    ...extra,
  })
  renderApp(<UsersPage />, { route: '/admin/users', path: '/admin/users' })
  return calls
}

const rowOf = async (name: string) => within((await screen.findByText(name)).closest('tr')!)

describe('UsersPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    resetApiState()
  })

  it('liệt kê người dùng kèm vai trò, trạng thái, số đơn và tổng chi tiêu', async () => {
    setup()
    const an = await rowOf('Nguyễn An')
    expect(an.getByText('Khách hàng')).toBeInTheDocument()
    expect(an.getByText('Hoạt động')).toBeInTheDocument()
    expect(an.getByText('2 đơn')).toBeInTheDocument()
    expect(an.getByText(/1\.400\.000/)).toBeInTheDocument()
    const binh = await rowOf('Trần Bình')
    expect(binh.getByText('Đã khoá')).toBeInTheDocument()
    expect(binh.getByRole('button', { name: 'Mở khoá' })).toBeEnabled()
  })

  it('không cho tự đổi quyền hay tự khoá chính mình', async () => {
    setup()
    const self = await rowOf('Quản Trị')
    await waitFor(() => expect(self.getByText('Bạn')).toBeInTheDocument())
    expect(self.getByRole('button', { name: 'Hạ xuống khách' })).toBeDisabled()
    expect(self.getByRole('button', { name: 'Khoá' })).toBeDisabled()
  })

  it('khoá tài khoản cần xác nhận rồi gọi API', async () => {
    const calls = setup({
      'PUT /api/admin/users/1/status': () => {
        rows = rows.map((r) => (r.id === 1 ? { ...r, disabledAt: '2026-10-14T00:00:00.000Z' } : r))
        return { body: rows[1] }
      },
    })
    const an = await rowOf('Nguyễn An')
    await userEvent.click(an.getByRole('button', { name: 'Khoá' }))
    const dialog = await screen.findByRole('dialog', { name: 'Khoá tài khoản?' })
    expect(calls.some((c) => c.method === 'PUT')).toBe(false)
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận' }))

    await waitFor(() => expect(calls.find((c) => c.method === 'PUT')?.body).toEqual({ disabled: true }))
    expect(await screen.findByText('Đã cập nhật người dùng')).toBeInTheDocument()
    await waitFor(async () => expect((await rowOf('Nguyễn An')).getByText('Đã khoá')).toBeInTheDocument())
  })

  it('nâng quyền gửi đúng vai trò mới; lỗi từ server được hiện ra', async () => {
    const calls = setup({
      'PUT /api/admin/users/1/role': () => ({
        status: 409,
        body: { code: 'LAST_ADMIN', message: 'Phải còn ít nhất một quản trị viên đang hoạt động' },
      }),
    })
    const an = await rowOf('Nguyễn An')
    await userEvent.click(an.getByRole('button', { name: 'Nâng làm admin' }))
    const dialog = await screen.findByRole('dialog', { name: 'Nâng làm quản trị viên?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận' }))

    expect(await screen.findByText('Phải còn ít nhất một quản trị viên đang hoạt động')).toBeInTheDocument()
    expect(calls.find((c) => c.method === 'PUT')?.body).toEqual({ role: 'ADMIN' })
  })

  it('lọc và tìm kiếm gửi tham số lên API', async () => {
    const calls = setup()
    await screen.findByText('Nguyễn An')
    await userEvent.click(screen.getByRole('button', { name: 'Đã khoá' }))
    await waitFor(() => expect(calls.some((c) => c.path.includes('status=DISABLED'))).toBe(true))
    await userEvent.type(screen.getByRole('searchbox', { name: 'Tìm người dùng' }), 'bình{Enter}')
    await waitFor(() => expect(calls.some((c) => c.path.includes('q=b%C3%ACnh'))).toBe(true))
  })
})
