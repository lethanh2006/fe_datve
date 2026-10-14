import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api } from '../api/endpoints'
import { ApiError, setAuthToken, setUnauthorizedHandler } from '../api/client'
import type { AuthResponse, User } from '../api/types'
import { AuthContext, type AuthState } from './auth-context'

const TOKEN_KEY = 'datve.token'

function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

function writeToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // trình duyệt chặn localStorage: phiên chỉ tồn tại trong tab này
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(() => {
    // Gắn token ngay lúc khởi tạo: các component con chạy effect trước provider,
    // nếu để đến effect của provider thì request đầu tiên sẽ đi không kèm token.
    const token = readToken()
    setAuthToken(token)
    return token !== null
  })

  const clearSession = useCallback(() => {
    setAuthToken(null)
    writeToken(null)
    setUser(null)
    queryClient.clear()
  }, [queryClient])

  const startSession = useCallback((res: AuthResponse) => {
    setAuthToken(res.accessToken)
    writeToken(res.accessToken)
    setUser(res.user)
    return res.user
  }, [])

  // Token hết hạn giữa chừng: tự đăng xuất
  useEffect(() => {
    setUnauthorizedHandler(clearSession)
    return () => setUnauthorizedHandler(null)
  }, [clearSession])

  // Khôi phục phiên từ token đã lưu
  useEffect(() => {
    if (!readToken()) return
    let cancelled = false
    api
      .me()
      .then((me) => !cancelled && setUser(me))
      .catch((error: unknown) => {
        // Chỉ bỏ token khi server từ chối; lỗi mạng thì giữ lại để thử lại lần sau
        if (!cancelled && error instanceof ApiError && error.status === 401) clearSession()
      })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [clearSession])

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      login: async (email, password) => startSession(await api.login(email, password)),
      register: async (email, password, fullName) => startSession(await api.register(email, password, fullName)),
      logout: clearSession,
    }),
    [user, loading, startSession, clearSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
