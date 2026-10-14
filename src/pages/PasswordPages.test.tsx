import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockFetch, renderApp, resetApiState } from '../test/utils'
import { ForgotPasswordPage, ResetPasswordPage } from './PasswordPages'

afterEach(() => {
  vi.unstubAllGlobals()
  resetApiState()
})
const renderReset = () =>
  renderApp(<ResetPasswordPage />, { route: '/reset-password?token=reset-code', path: '/reset-password' })
const fillPasswords = async (password = 'new-password', confirmation = password) => {
  await userEvent.type(screen.getByLabelText('Mật khẩu mới'), password)
  await userEvent.type(screen.getByLabelText('Nhập lại mật khẩu mới'), confirmation)
  await userEvent.click(screen.getByRole('button', { name: 'Lưu mật khẩu mới' }))
}

describe('khôi phục mật khẩu', () => {
  it('gửi email và hiển thị phản hồi chung không tiết lộ tài khoản', async () => {
    const message = 'Nếu email đã đăng ký, chúng tôi vừa gửi hướng dẫn đặt lại mật khẩu'
    const calls = mockFetch({ 'POST /api/auth/forgot-password': () => ({ status: 202, body: { message } }) })
    renderApp(<ForgotPasswordPage />)
    await userEvent.type(screen.getByLabelText('Email'), 'a@test.com')
    await userEvent.click(screen.getByRole('button', { name: 'Gửi liên kết' }))
    expect(await screen.findByText(message)).toHaveAttribute('role', 'status')
    expect(calls[0]?.body).toEqual({ email: 'a@test.com' })
    expect(screen.queryByRole('button', { name: 'Gửi liên kết' })).not.toBeInTheDocument()
  })

  it('lỗi mạng khi yêu cầu liên kết có thể thử lại', async () => {
    mockFetch({ 'POST /api/auth/forgot-password': () => 'network-error' })
    renderApp(<ForgotPasswordPage />)
    await userEvent.type(screen.getByLabelText('Email'), 'a@test.com')
    await userEvent.click(screen.getByRole('button', { name: 'Gửi liên kết' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Không kết nối được máy chủ')
    expect(screen.getByRole('button', { name: 'Gửi liên kết' })).toBeEnabled()
  })

  it('thiếu mã thì hướng dẫn lấy liên kết mới', () => {
    renderApp(<ResetPasswordPage />, { route: '/reset-password', path: '/reset-password' })
    expect(screen.getByRole('alert')).toHaveTextContent('thiếu mã')
    expect(screen.getByRole('link', { name: 'Gửi lại liên kết' })).toHaveAttribute('href', '/forgot-password')
    expect(screen.queryByLabelText('Mật khẩu mới')).not.toBeInTheDocument()
  })

  it('không gửi khi xác nhận mật khẩu không khớp', async () => {
    const calls = mockFetch({})
    renderReset()
    await fillPasswords('new-password', 'different-password')
    expect(await screen.findByRole('alert')).toHaveTextContent('chưa khớp')
    expect(calls).toHaveLength(0)
  })

  it('chặn mật khẩu Unicode vượt giới hạn byte của bcrypt', async () => {
    const calls = mockFetch({})
    renderReset()
    await fillPasswords('ệ'.repeat(25))
    expect(await screen.findByRole('alert')).toHaveTextContent('72 byte')
    expect(calls).toHaveLength(0)
  })

  it('đặt lại thành công, xoá phiên cũ và hướng tới đăng nhập', async () => {
    localStorage.setItem('datve.token', 'old-token')
    const calls = mockFetch({
      'GET /api/auth/me': () => ({ body: { id: 1, email: 'a@test.com', fullName: 'A', role: 'USER' } }),
      'POST /api/auth/reset-password': () => ({ status: 204 }),
    })
    renderReset()
    await fillPasswords()
    expect(await screen.findByText(/Mật khẩu đã được đặt lại\./)).toHaveAttribute('role', 'status')
    expect(calls.find((c) => c.method === 'POST')?.body).toEqual({ token: 'reset-code', password: 'new-password' })
    expect(localStorage.getItem('datve.token')).toBeNull()
    expect(screen.getByRole('link', { name: 'Đăng nhập' })).toHaveAttribute('href', '/login')
    expect(screen.queryByLabelText('Mật khẩu mới')).not.toBeInTheDocument()
  })

  it('mã hết hạn cho phép yêu cầu liên kết mới', async () => {
    mockFetch({
      'POST /api/auth/reset-password': () => ({
        status: 400,
        body: { code: 'INVALID_RESET_TOKEN', message: 'Liên kết đã hết hạn' },
      }),
    })
    renderReset()
    await fillPasswords()
    expect(await screen.findByRole('alert')).toHaveTextContent('Liên kết đã hết hạn')
    expect(screen.getByRole('link', { name: 'Gửi lại liên kết' })).toBeInTheDocument()
  })
})
