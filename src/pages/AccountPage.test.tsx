import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RequireAuth } from '../auth/RequireAuth'
import { useAuth } from '../auth/useAuth'
import { mockFetch, renderApp, resetApiState } from '../test/utils'
import { AccountPage } from './AccountPage'

const user = { id: 1, email: 'a@test.com', fullName: 'Nguyễn A', role: 'USER' }
function AccountWithName() {
  const { user: current } = useAuth()
  return (
    <>
      <span data-testid="session-name">{current?.fullName}</span>
      <RequireAuth>
        <AccountPage />
      </RequireAuth>
    </>
  )
}
const renderAccount = () => {
  localStorage.setItem('datve.token', 'old-token')
  renderApp(<AccountWithName />, { route: '/account', path: '/account' })
}
afterEach(() => {
  vi.unstubAllGlobals()
  resetApiState()
})

describe('AccountPage', () => {
  it('cập nhật họ tên vào phiên hiện tại và gửi tên đã bỏ khoảng trắng', async () => {
    const calls = mockFetch({
      'GET /api/auth/me': () => ({ body: user }),
      'PUT /api/auth/me': () => ({ body: { ...user, fullName: 'Tên Mới' } }),
    })
    renderAccount()
    const input = await screen.findByLabelText('Họ và tên')
    expect(input).toHaveValue('Nguyễn A')
    await userEvent.clear(input)
    await userEvent.type(input, '  Tên Mới  ')
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thông tin' }))
    expect(await screen.findByText('Đã cập nhật thông tin cá nhân.')).toHaveAttribute('role', 'status')
    expect(screen.getByTestId('session-name')).toHaveTextContent('Tên Mới')
    expect(calls.find((c) => c.method === 'PUT')?.body).toEqual({ fullName: 'Tên Mới' })
  })

  it('đổi mật khẩu thay token của phiên và xoá nội dung các ô mật khẩu', async () => {
    const calls = mockFetch({
      'GET /api/auth/me': () => ({ body: user }),
      'PUT /api/auth/password': () => ({
        body: { accessToken: 'new-token', tokenType: 'Bearer', expiresIn: 86400, user },
      }),
    })
    renderAccount()
    await userEvent.type(await screen.findByLabelText('Mật khẩu hiện tại'), 'password123')
    await userEvent.type(screen.getByLabelText('Mật khẩu mới'), 'new-password')
    await userEvent.type(screen.getByLabelText('Nhập lại mật khẩu mới'), 'new-password')
    await userEvent.click(screen.getByRole('button', { name: 'Đổi mật khẩu' }))
    expect(await screen.findByText(/Đã đổi mật khẩu\. Bạn/)).toHaveAttribute('role', 'status')
    expect(localStorage.getItem('datve.token')).toBe('new-token')
    expect(screen.getByLabelText('Mật khẩu hiện tại')).toHaveValue('')
    expect(screen.getByLabelText('Mật khẩu mới')).toHaveValue('')
    expect(calls.find((c) => c.method === 'PUT')?.body).toEqual({
      currentPassword: 'password123',
      newPassword: 'new-password',
    })
  })

  it('báo mật khẩu hiện tại sai và giữ phiên đăng nhập', async () => {
    mockFetch({
      'GET /api/auth/me': () => ({ body: user }),
      'PUT /api/auth/password': () => ({
        status: 400,
        body: { code: 'INVALID_CURRENT_PASSWORD', message: 'Mật khẩu hiện tại không đúng' },
      }),
    })
    renderAccount()
    await userEvent.type(await screen.findByLabelText('Mật khẩu hiện tại'), 'wrong-password')
    await userEvent.type(screen.getByLabelText('Mật khẩu mới'), 'new-password')
    await userEvent.type(screen.getByLabelText('Nhập lại mật khẩu mới'), 'new-password')
    await userEvent.click(screen.getByRole('button', { name: 'Đổi mật khẩu' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Mật khẩu hiện tại không đúng')
    expect(localStorage.getItem('datve.token')).toBe('old-token')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Đổi mật khẩu' })).toBeEnabled())
  })
})
