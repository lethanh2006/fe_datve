const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

/** Lỗi trả về từ API, có cùng cấu trúc {code, message} với backend. */
export class ApiError extends Error {
  status: number
  code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

let authToken: string | null = null

// Chênh lệch giữa đồng hồ server và đồng hồ máy, lấy từ header Date của response.
// Dùng cho đếm ngược để máy lệch giờ không làm sai thời hạn giữ ghế.
let serverOffsetMs = 0

/** Thời điểm hiện tại theo đồng hồ server (xấp xỉ, sai số cỡ 1 giây). */
export function serverNow(): number {
  return Date.now() + serverOffsetMs
}
let onUnauthorized: (() => void) | null = null

export function setAuthToken(token: string | null) {
  authToken = token
}

/** Được gọi khi server từ chối token đang dùng (hết hạn, bị thu hồi...). */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler
}

type Query = Record<string, string | number | boolean | null | undefined>

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  query?: Query
  headers?: Record<string, string>
  signal?: AbortSignal
}

function buildUrl(path: string, query?: Query) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
  }
  const qs = params.toString()
  return `${BASE_URL}${path}${qs ? `?${qs}` : ''}`
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json', ...options.headers }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (authToken) headers.Authorization = `Bearer ${authToken}`

  let response: Response
  try {
    response = await fetch(buildUrl(path, options.query), {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(0, 'NETWORK_ERROR', 'Không kết nối được máy chủ, vui lòng kiểm tra mạng và thử lại')
  }

  const serverDate = Date.parse(response.headers.get('Date') ?? '')
  if (!Number.isNaN(serverDate)) serverOffsetMs = serverDate - Date.now()

  if (response.status === 204) return undefined as T

  const text = await response.text()
  let data: unknown
  try {
    data = text ? JSON.parse(text) : undefined
  } catch {
    data = undefined
  }

  if (!response.ok) {
    const body = (data ?? {}) as { code?: string; message?: string }
    const error = new ApiError(
      response.status,
      body.code ?? `HTTP_${response.status}`,
      body.message ?? 'Có lỗi xảy ra, vui lòng thử lại',
    )
    if (response.status === 401 && authToken && error.code === 'INVALID_TOKEN') onUnauthorized?.()
    throw error
  }
  return data as T
}
