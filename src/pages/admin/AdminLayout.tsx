import { NavLink, Outlet } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { useDocumentTitle } from '../../lib/useDocumentTitle'

export default function AdminLayout() {
  useDocumentTitle('Quản trị')
  return (
    <div className="container page">
      <h1 className="page-title">Quản trị</h1>
      <nav className="admin-tabs" aria-label="Quản trị">
        <NavLink to="/admin" end>
          <Icon name="chart" size={16} /> Tổng quan
        </NavLink>
        <NavLink to="/admin/events">
          <Icon name="ticket" size={16} /> Sự kiện
        </NavLink>
        <NavLink to="/admin/bookings">
          <Icon name="list" size={16} /> Đơn đặt vé
        </NavLink>
      </nav>
      <Outlet />
    </div>
  )
}
