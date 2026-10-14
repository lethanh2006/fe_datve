import { afterEach, describe, expect, it, vi } from 'vitest'
import { resetApiState, mockFetch } from '../test/utils'
import { ApiError, request, serverNow, setAuthToken, setUnauthorizedHandler } from './client'

afterEach(() => {
  vi.unstubAllGlobals()
  resetApiState()
})

describe('request', () => {
  it('gửi JSON, header Authorization và bỏ qua tham số rỗng trên query', async () => {
    const calls = mockFetch({ 'POST /api/x': () => ({ status: 201, body: { ok: true } }) })
    setAuthToken('tok')

    const result = await request<{ ok: boolean }>('/api/x', {
      method: 'POST',
      body: { a: 1 },
      query: { q: 'abc', empty: '', none: undefined, zero: 0, flag: false },
    })

    expect(result).toEqual({ ok: true })
    expect(calls[0]).toMatchObject({ method: 'POST', path: '/api/x?q=abc&zero=0&flag=false', body: { a: 1 } })
    expect(calls[0]!.headers.get('Authorization')).toBe('Bearer tok')
    expect(calls[0]!.headers.get('Content-Type')).toBe('application/json')
  })

  it('không gửi Authorization khi chưa đăng nhập', async () => {
    const calls = mockFetch({ 'GET /api/x': () => ({ body: {} }) })
    await request('/api/x')
    expect(calls[0]!.headers.has('Authorization')).toBe(false)
  })

  it('đổi lỗi của backend thành ApiError có status và code', async () => {
    mockFetch({
      'GET /api/x': () => ({ status: 409, body: { code: 'SEAT_UNAVAILABLE', message: 'Ghế không còn trống' } }),
    })
    const error = await request('/api/x').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 409, code: 'SEAT_UNAVAILABLE', message: 'Ghế không còn trống' })
  })

  it('lỗi không có body JSON vẫn cho thông báo mặc định', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>502</html>', { status: 502 })))
    const error = (await request('/api/x').catch((e: unknown) => e)) as ApiError
    expect(error).toMatchObject({ status: 502, code: 'HTTP_502' })
    expect(error.message).not.toBe('')
  })

  it('mất mạng được báo là NETWORK_ERROR với status 0', async () => {
    mockFetch({ 'GET /api/x': () => 'network-error' })
    const error = await request('/api/x').catch((e: unknown) => e)
    expect(error).toMatchObject({ status: 0, code: 'NETWORK_ERROR' })
  })

  it('204 trả undefined', async () => {
    mockFetch({ 'DELETE /api/x': () => ({ status: 204 }) })
    expect(await request('/api/x', { method: 'DELETE' })).toBeUndefined()
  })

  it('token bị từ chối thì gọi handler đăng xuất, lỗi 401 khác thì không', async () => {
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    setAuthToken('tok')
    mockFetch({
      'GET /api/a': () => ({ status: 401, body: { code: 'INVALID_TOKEN', message: 'hết hạn' } }),
      'GET /api/b': () => ({ status: 401, body: { code: 'INVALID_CREDENTIALS', message: 'sai mật khẩu' } }),
    })

    await request('/api/b').catch(() => undefined)
    expect(handler).not.toHaveBeenCalled()
    await request('/api/a').catch(() => undefined)
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('ghi nhận độ lệch giữa đồng hồ server và đồng hồ máy từ header Date', async () => {
    const serverTime = Date.now() + 90_000
    mockFetch({ 'GET /api/x': () => ({ body: {}, headers: { Date: new Date(serverTime).toUTCString() } }) })
    await request('/api/x')
    expect(Math.abs(serverNow() - Date.now() - 90_000)).toBeLessThan(2000)
  })
})
