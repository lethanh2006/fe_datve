import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AuthResponse } from '../api/types'
import { mockFetch, renderApp, resetApiState } from '../test/utils'
import { LoginPage, RegisterPage } from './AuthPages'

const auth: AuthResponse = {
  accessToken: 'jwt-token',
  tokenType: 'Bearer',
  expiresIn: 86400,
  user: { id: 1, email: 'a@test.com', fullName: 'Nguyễn A', role: 'USER' },
}

afterEach(() => {
  vi.unstubAllGlobals()
  resetApiState()
})

describe('LoginPage', () => {
  it('đăng nhập thành công: lưu token và chuyển về trang đích', async () => {
    const calls = mockFetch({ 'POST /api/auth/login': () => ({ body: auth }) })
    renderApp(<LoginPage />, { route: '/login', path: '/login' })

    await userEvent.type(screen.getByLabelText('Email'), 'a@test.com')
    await userEvent.type(screen.getByLabelText('Mật khẩu'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }))

    await waitFor(() => expect(screen.getByTestId('elsewhere')).toBeInTheDocument())
    expect(calls[0]!.body).toEqual({ email: 'a@test.com', password: 'password123' })
    expect(localStorage.getItem('datve.token')).toBe('jwt-token')
  })

  it('hiện thông báo lỗi từ server và giữ nguyên form', async () => {
    mockFetch({
      'POST /api/auth/login': () => ({ status: 401, body: { code: 'INVALID_CREDENTIALS', message: 'Email hoặc mật khẩu không đúng' } }),
    })
    renderApp(<LoginPage />, { route: '/login', path: '/login' })

    await userEvent.type(screen.getByLabelText('Email'), 'a@test.com')
    await userEvent.type(screen.getByLabelText('Mật khẩu'), 'sai-mat-khau')
    await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Email hoặc mật khẩu không đúng')
    expect(screen.getByLabelText('Email')).toHaveValue('a@test.com')
    expect(screen.getByRole('button', { name: 'Đăng nhập' })).toBeEnabled()
    expect(localStorage.getItem('datve.token')).toBeNull()
  })

  it('chỉ chuyển hướng về đường dẫn nội bộ sau khi đăng nhập', async () => {
    mockFetch({ 'POST /api/auth/login': () => ({ body: auth }) })
    renderApp(<LoginPage />, { route: { pathname: '/login', state: { from: '//evil.example.com' } }, path: '/login' })
    await userEvent.type(screen.getByLabelText('Email'), 'a@test.com')
    await userEvent.type(screen.getByLabelText('Mật khẩu'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }))
    // về trang chủ ('/') chứ không đi tới "//evil.example.com"
    await waitFor(() => expect(screen.getByTestId('elsewhere')).toBeInTheDocument())
  })
})

describe('RegisterPage', () => {
  it('gửi đúng họ tên, email, mật khẩu và đăng nhập luôn', async () => {
    const calls = mockFetch({ 'POST /api/auth/register': () => ({ status: 201, body: auth }) })
    renderApp(<RegisterPage />, { route: '/register', path: '/register' })

    await userEvent.type(screen.getByLabelText('Họ và tên'), 'Nguyễn A')
    await userEvent.type(screen.getByLabelText('Email'), 'a@test.com')
    await userEvent.type(screen.getByLabelText('Mật khẩu'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: 'Đăng ký' }))

    await waitFor(() => expect(screen.getByTestId('elsewhere')).toBeInTheDocument())
    expect(calls[0]!.body).toEqual({ email: 'a@test.com', password: 'password123', fullName: 'Nguyễn A' })
    expect(localStorage.getItem('datve.token')).toBe('jwt-token')
  })

  it('hiện lỗi email đã tồn tại', async () => {
    mockFetch({
      'POST /api/auth/register': () => ({ status: 409, body: { code: 'EMAIL_ALREADY_EXISTS', message: 'Email đã được sử dụng' } }),
    })
    renderApp(<RegisterPage />, { route: '/register', path: '/register' })
    await userEvent.type(screen.getByLabelText('Họ và tên'), 'Nguyễn A')
    await userEvent.type(screen.getByLabelText('Email'), 'a@test.com')
    await userEvent.type(screen.getByLabelText('Mật khẩu'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: 'Đăng ký' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Email đã được sử dụng')
  })
})
