import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AdminEmail } from '../../api/types'
import { mockFetch, renderApp, resetApiState } from '../../test/utils'
import EmailsPage from './EmailsPage'

const email = (over: Partial<AdminEmail>): AdminEmail => ({
  id: 1,
  to: 'a@test.com',
  subject: 'Vé của bạn đã được xác nhận',
  status: 'SENT',
  attempts: 1,
  nextAttemptAt: '2026-10-14T10:00:00.000Z',
  lastError: null,
  createdAt: '2026-10-14T10:00:00.000Z',
  sentAt: '2026-10-14T10:00:01.000Z',
  ...over,
})

let rows: AdminEmail[]

function setup(extra: Parameters<typeof mockFetch>[0] = {}) {
  rows = [
    email({ id: 3, to: 'loi@test.com', subject: 'Đặt lại mật khẩu', status: 'FAILED', attempts: 5, lastError: 'Connection timeout' }),
    email({ id: 2, to: 'cho@test.com', status: 'PENDING', attempts: 2, lastError: 'ECONNREFUSED', sentAt: null }),
    email({ id: 1 }),
  ]
  const calls = mockFetch({
    'GET /api/admin/emails': ({ url }) => {
      const status = url.searchParams.get('status')
      const content = status ? rows.filter((r) => r.status === status) : rows
      return { body: { content, page: 0, size: 15, totalElements: content.length, totalPages: 1 } }
    },
    ...extra,
  })
  renderApp(<EmailsPage />, { route: '/admin/emails', path: '/admin/emails' })
  return calls
}

const rowOf = async (text: string) => within((await screen.findByText(text)).closest('tr')!)

describe('EmailsPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    resetApiState()
  })

  it('hiện trạng thái, số lần thử và lỗi gần nhất của từng thư', async () => {
    setup()
    const failed = await rowOf('loi@test.com')
    expect(failed.getByText('Thất bại')).toBeInTheDocument()
    expect(failed.getByText('5')).toBeInTheDocument()
    expect(failed.getByText('Connection timeout')).toBeInTheDocument()
    const pending = await rowOf('cho@test.com')
    expect(pending.getByText('Đang chờ / thử lại')).toBeInTheDocument()
    expect(pending.getByText('ECONNREFUSED')).toBeInTheDocument()
    expect(pending.queryByRole('button', { name: 'Gửi lại' })).not.toBeInTheDocument()
    const sent = await rowOf('a@test.com')
    expect(sent.getByText('Đã gửi')).toBeInTheDocument()
  })

  it('chỉ thư thất bại mới có nút gửi lại và bấm thì gọi API', async () => {
    const calls = setup({ 'POST /api/admin/emails/3/retry': () => ({ status: 202, body: { message: 'ok' } }) })
    const failed = await rowOf('loi@test.com')
    await userEvent.click(failed.getByRole('button', { name: 'Gửi lại' }))
    expect(await screen.findByText('Đã đưa thư vào hàng đợi gửi lại')).toBeInTheDocument()
    expect(calls.some((c) => c.method === 'POST' && c.path === '/api/admin/emails/3/retry')).toBe(true)
  })

  it('lỗi từ server khi gửi lại được hiện ra', async () => {
    setup({
      'POST /api/admin/emails/3/retry': () => ({
        status: 409,
        body: { code: 'EMAIL_NOT_RETRYABLE', message: 'Chỉ gửi lại được thư đã thất bại' },
      }),
    })
    await userEvent.click((await rowOf('loi@test.com')).getByRole('button', { name: 'Gửi lại' }))
    expect(await screen.findByText('Chỉ gửi lại được thư đã thất bại')).toBeInTheDocument()
  })

  it('lọc theo trạng thái', async () => {
    const calls = setup()
    await screen.findByText('loi@test.com')
    await userEvent.click(screen.getByRole('button', { name: 'Thất bại' }))
    await waitFor(() => expect(calls.some((c) => c.path.includes('status=FAILED'))).toBe(true))
    await waitFor(() => expect(screen.queryByText('cho@test.com')).not.toBeInTheDocument())
  })
})
