import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { errorMessage } from '../lib/errors'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { passwordError } from '../lib/password'

function useRedirectTarget() {
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from
  // Chỉ chấp nhận đường dẫn nội bộ để tránh chuyển hướng ra ngoài
  return from && from.startsWith('/') && !from.startsWith('//') ? from : '/'
}

export function LoginPage() {
  useDocumentTitle('Đăng nhập')
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const target = useRedirectTarget()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (user && !busy) return <Navigate to={target} replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await login(email, password)
      navigate(target, { replace: true })
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <div className="container auth-page">
      <form className="card card-pad stack auth-card" onSubmit={submit} noValidate={false}>
        <div>
          <h1>Đăng nhập</h1>
          <p className="muted">Đăng nhập để giữ ghế và xem vé của bạn.</p>
        </div>
        {error && (
          <p className="alert alert-danger" role="alert">
            {error}
          </p>
        )}
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            className="input"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="password">Mật khẩu</label>
          <input
            id="password"
            className="input"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-primary btn-lg" disabled={busy}>
          {busy && <span className="spinner" />}
          Đăng nhập
        </button>
        <Link to="/forgot-password">Quên mật khẩu?</Link>
        <p className="muted" style={{ textAlign: 'center' }}>
          Chưa có tài khoản?{' '}
          <Link to="/register" state={location_state(target)}>
            Đăng ký
          </Link>
        </p>
      </form>
    </div>
  )
}

const location_state = (from: string) => (from === '/' ? undefined : { from })

export function RegisterPage() {
  useDocumentTitle('Đăng ký')
  const { user, register } = useAuth()
  const navigate = useNavigate()
  const target = useRedirectTarget()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (user && !busy) return <Navigate to={target} replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const validation = passwordError(password)
      if (validation) {
        setError(validation)
        setBusy(false)
        return
      }
      await register(email, password, fullName)
      navigate(target, { replace: true })
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <div className="container auth-page">
      <form className="card card-pad stack auth-card" onSubmit={submit}>
        <div>
          <h1>Tạo tài khoản</h1>
          <p className="muted">Chỉ mất vài giây để bắt đầu đặt vé.</p>
        </div>
        {error && (
          <p className="alert alert-danger" role="alert">
            {error}
          </p>
        )}
        <div className="field">
          <label htmlFor="fullName">Họ và tên</label>
          <input
            id="fullName"
            className="input"
            autoComplete="name"
            required
            maxLength={255}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            className="input"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="password">Mật khẩu</label>
          <input
            id="password"
            className="input"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={72}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-describedby="password-hint"
          />
          <span id="password-hint" className="field-hint">
            Tối thiểu 8 ký tự.
          </span>
        </div>
        <button type="submit" className="btn btn-primary btn-lg" disabled={busy}>
          {busy && <span className="spinner" />}
          Đăng ký
        </button>
        <p className="muted" style={{ textAlign: 'center' }}>
          Đã có tài khoản?{' '}
          <Link to="/login" state={location_state(target)}>
            Đăng nhập
          </Link>
        </p>
      </form>
    </div>
  )
}
