import { createContext } from 'react'
import type { User } from '../api/types'

export interface AuthState {
  user: User | null
  /** true trong lúc đang xác thực token đã lưu khi mở trang */
  loading: boolean
  login: (email: string, password: string) => Promise<User>
  register: (email: string, password: string, fullName: string) => Promise<User>
  logout: () => void
}

export const AuthContext = createContext<AuthState | null>(null)
