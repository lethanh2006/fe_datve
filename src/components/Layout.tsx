import { useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { Icon } from './Icon'

function Logo() {
  return (
    <svg width="30" height="30" viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="var(--primary)" />
      <path
        fill="var(--on-primary)"
        d="M12 22a4 4 0 0 1 4-4h32a4 4 0 0 1 4 4v4.5a5.5 5.5 0 0 0 0 11V42a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4v-4.5a5.5 5.5 0 0 0 0-11z"
      />
      <path stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeDasharray="1 5" d="M38 21v22" />
    </svg>
  )
}

const YEAR = new Date().getFullYear()

export function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  // Chuyển trang thì cuộn về đầu
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="app">
      <a href="#main" className="skip-link">
        Bỏ qua điều hướng
      </a>
      <header className="site-header">
        <div className="container site-header-inner">
          <Link to="/" className="brand">
            <Logo />
            <span>
              Đặt<b>Vé</b>
            </span>
          </Link>
          <nav className="site-nav" aria-label="Điều hướng chính">
            <NavLink to="/" end>
              Sự kiện
            </NavLink>
            {user && <NavLink to="/bookings">Vé của tôi</NavLink>}
            {user && <NavLink to="/account">Tài khoản</NavLink>}
            {user?.role === 'ADMIN' && <NavLink to="/admin">Quản trị</NavLink>}
          </nav>
          <div className="site-user">
            {user ? (
              <>
                <span className="site-user-name" title={user.email}>
                  <Icon name="user" size={16} />
                  {user.fullName}
                </span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    logout()
                    navigate('/')
                  }}
                >
                  <Icon name="logout" size={16} />
                  <span className="hide-sm">Đăng xuất</span>
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost btn-sm">
                  Đăng nhập
                </Link>
                <Link to="/register" className="btn btn-primary btn-sm">
                  Đăng ký
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main id="main" className="app-main">
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="container">
          <span>© {YEAR} ĐặtVé</span>
          <span className="muted">Giữ ghế 5 phút · Thanh toán an toàn</span>
        </div>
      </footer>
    </div>
  )
}
