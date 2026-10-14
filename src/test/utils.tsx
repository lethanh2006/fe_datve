import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi } from 'vitest'
import { setAuthToken, setUnauthorizedHandler } from '../api/client'
import { AuthProvider } from '../auth/AuthProvider'
import { ToastProvider } from '../components/ToastProvider'

type InitialEntry = string | { pathname: string; state?: unknown }

export function renderApp(ui: ReactElement, { route = '/', path = '*' }: { route?: InitialEntry; path?: string } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <ToastProvider>
          <AuthProvider>
            <Routes>
              <Route path={path} element={ui} />
              <Route path="*" element={<div data-testid="elsewhere" />} />
            </Routes>
          </AuthProvider>
        </ToastProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

export interface FakeResponse {
  status?: number
  body?: unknown
  headers?: Record<string, string>
}

export type FakeHandler = (call: { url: URL; init: RequestInit; headers: Headers }) => FakeResponse | Promise<FakeResponse> | 'network-error'

/**
 * Thay fetch toàn cục bằng bộ định tuyến giả: khoá "METHOD /path" -> handler.
 * Trả về danh sách các request đã gọi để test kiểm tra.
 */
export function mockFetch(routes: Record<string, FakeHandler>) {
  const calls: { method: string; path: string; headers: Headers; body: unknown }[] = []
  const fn = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(String(input), 'http://localhost')
    const method = (init.method ?? 'GET').toUpperCase()
    const headers = new Headers(init.headers)
    calls.push({ method, path: url.pathname + url.search, headers, body: init.body ? JSON.parse(String(init.body)) : undefined })
    const handler = routes[`${method} ${url.pathname}`]
    if (!handler) return new Response(JSON.stringify({ code: 'NOT_FOUND', message: `không có mock cho ${method} ${url.pathname}` }), { status: 404 })
    const result = await handler({ url, init, headers })
    if (result === 'network-error') throw new TypeError('Failed to fetch')
    const status = result.status ?? 200
    return new Response(status === 204 ? null : JSON.stringify(result.body ?? {}), {
      status,
      headers: { 'Content-Type': 'application/json', ...result.headers },
    })
  })
  vi.stubGlobal('fetch', fn)
  return calls
}

/** Đưa các biến toàn cục của module api về trạng thái ban đầu giữa các test. */
export function resetApiState() {
  setAuthToken(null)
  setUnauthorizedHandler(null)
}
