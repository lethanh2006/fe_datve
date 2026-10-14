import { useState, type FormEvent } from 'react'
import { useAuth } from '../auth/useAuth'
import { NewPasswordFields } from '../components/NewPasswordFields'
import { errorMessage } from '../lib/errors'
import { passwordError } from '../lib/password'
import { useDocumentTitle } from '../lib/useDocumentTitle'

export function AccountPage() {
  useDocumentTitle('Tài khoản')
  const { user, updateProfile, changePassword } = useAuth()
  const [fullName, setFullName] = useState(user?.fullName ?? '')
  const [profileBusy, setProfileBusy] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileSaved, setProfileSaved] = useState(false)
  const [current, setCurrent] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [changed, setChanged] = useState(false)

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault()
    setProfileError(null)
    setProfileSaved(false)
    if (!fullName.trim()) {
      setProfileError('Vui lòng nhập họ và tên.')
      return
    }
    setProfileBusy(true)
    try {
      const updated = await updateProfile(fullName.trim())
      setFullName(updated.fullName)
      setProfileSaved(true)
    } catch (err) {
      setProfileError(errorMessage(err))
    } finally {
      setProfileBusy(false)
    }
  }

  const savePassword = async (e: FormEvent) => {
    e.preventDefault()
    setChanged(false)
    const validation = passwordError(password, confirmation)
    setError(validation)
    if (validation) return
    setPasswordBusy(true)
    try {
      await changePassword(current, password)
      setCurrent('')
      setPassword('')
      setConfirmation('')
      setChanged(true)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setPasswordBusy(false)
    }
  }

  return (
    <div className="container page">
      <h1 className="page-title">Tài khoản của tôi</h1>
      <div className="account-grid">
        <form className="card card-pad stack" onSubmit={saveProfile} aria-labelledby="profile-heading">
          <h2 id="profile-heading">Thông tin cá nhân</h2>
          {profileError && (
            <p className="alert alert-danger" role="alert">
              {profileError}
            </p>
          )}
          {profileSaved && (
            <p className="alert alert-success" role="status">
              Đã cập nhật thông tin cá nhân.
            </p>
          )}
          <div className="field">
            <label htmlFor="account-email">Email</label>
            <input id="account-email" className="input" type="email" value={user?.email ?? ''} readOnly />
          </div>
          <div className="field">
            <label htmlFor="account-name">Họ và tên</label>
            <input
              id="account-name"
              className="input"
              autoComplete="name"
              required
              maxLength={255}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={profileBusy || passwordBusy}>
            {profileBusy ? 'Đang lưu...' : 'Lưu thông tin'}
          </button>
        </form>
        <form className="card card-pad stack" onSubmit={savePassword} aria-labelledby="password-heading">
          <h2 id="password-heading">Đổi mật khẩu</h2>
          <p className="muted">
            Sau khi đổi, các phiên đăng nhập khác và liên kết đặt lại mật khẩu cũ sẽ hết hiệu lực.
          </p>
          {error && (
            <p className="alert alert-danger" role="alert">
              {error}
            </p>
          )}
          {changed && (
            <p className="alert alert-success" role="status">
              Đã đổi mật khẩu. Bạn vẫn đăng nhập trên thiết bị này.
            </p>
          )}
          <div className="field">
            <label htmlFor="current-password">Mật khẩu hiện tại</label>
            <input
              id="current-password"
              className="input"
              type="password"
              autoComplete="current-password"
              required
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </div>
          <NewPasswordFields
            password={password}
            confirmation={confirmation}
            onPassword={setPassword}
            onConfirmation={setConfirmation}
          />
          <button className="btn btn-primary" type="submit" disabled={passwordBusy || profileBusy}>
            {passwordBusy ? 'Đang đổi mật khẩu...' : 'Đổi mật khẩu'}
          </button>
        </form>
      </div>
    </div>
  )
}
