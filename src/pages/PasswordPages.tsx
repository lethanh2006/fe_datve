import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api/endpoints'
import { useAuth } from '../auth/useAuth'
import { NewPasswordFields } from '../components/NewPasswordFields'
import { errorMessage } from '../lib/errors'
import { passwordError } from '../lib/password'
import { useDocumentTitle } from '../lib/useDocumentTitle'

export function ForgotPasswordPage() {
  useDocumentTitle('Quên mật khẩu')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      setMessage((await api.forgotPassword(email.trim())).message)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="container auth-page">
      <form className="card card-pad stack auth-card" onSubmit={submit}>
        <h1>Quên mật khẩu</h1>
        <p className="muted">Nhập email đã đăng ký để nhận liên kết đặt lại mật khẩu.</p>
        {error && (
          <p className="alert alert-danger" role="alert">
            {error}
          </p>
        )}
        {message ? (
          <>
            <p className="alert alert-success" role="status">
              {message}
            </p>
            <p className="muted">Kiểm tra cả thư mục thư rác. Liên kết có hiệu lực trong 30 phút.</p>
            <button className="btn btn-outline" type="button" onClick={() => setMessage(null)}>
              Nhập lại email
            </button>
          </>
        ) : (
          <>
            <div className="field">
              <label htmlFor="reset-email">Email</label>
              <input
                id="reset-email"
                className="input"
                type="email"
                autoComplete="email"
                required
                maxLength={255}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? 'Đang gửi...' : 'Gửi liên kết'}
            </button>
          </>
        )}
        <Link to="/login">← Về đăng nhập</Link>
      </form>
    </div>
  )
}

export function ResetPasswordPage() {
  useDocumentTitle('Đặt lại mật khẩu')
  const [params, setParams] = useSearchParams()
  const token = params.get('token') ?? ''
  const { logout } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const validation = passwordError(password, confirmation)
    setError(validation)
    if (validation) return
    setBusy(true)
    try {
      await api.resetPassword(token, password)
      logout()
      setPassword('')
      setConfirmation('')
      setDone(true)
      setParams({}, { replace: true })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="container auth-page">
      <div className="card card-pad stack auth-card">
        <h1>Đặt lại mật khẩu</h1>
        {done ? (
          <>
            <p className="alert alert-success" role="status">
              Mật khẩu đã được đặt lại. Hãy đăng nhập bằng mật khẩu mới.
            </p>
            <Link className="btn btn-primary" to="/login">
              Đăng nhập
            </Link>
          </>
        ) : !token.trim() ? (
          <>
            <p className="alert alert-danger" role="alert">
              Liên kết thiếu mã đặt lại mật khẩu. Vui lòng yêu cầu liên kết mới.
            </p>
            <Link to="/forgot-password">Gửi lại liên kết</Link>
          </>
        ) : (
          <form className="stack" onSubmit={submit}>
            <p className="muted">Chọn mật khẩu mới để bảo vệ tài khoản của bạn.</p>
            {error && (
              <p className="alert alert-danger" role="alert">
                {error}
              </p>
            )}
            <NewPasswordFields
              password={password}
              confirmation={confirmation}
              onPassword={setPassword}
              onConfirmation={setConfirmation}
            />
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? 'Đang lưu...' : 'Lưu mật khẩu mới'}
            </button>
            <Link to="/forgot-password">Gửi lại liên kết</Link>
          </form>
        )}
      </div>
    </div>
  )
}
