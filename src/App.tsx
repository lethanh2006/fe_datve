import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { RequireAuth } from './auth/RequireAuth'
import { Layout } from './components/Layout'
import { Spinner } from './components/States'
import { BookingPage } from './pages/BookingPage'
import { EventPage } from './pages/EventPage'
import { HomePage } from './pages/HomePage'
import { LoginPage, RegisterPage } from './pages/AuthPages'
import { MyBookingsPage } from './pages/MyBookingsPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { SeatSelectionPage } from './pages/SeatSelectionPage'

// Trang quản trị ít người dùng nên tách chunk riêng
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'))
const DashboardPage = lazy(() => import('./pages/admin/DashboardPage'))
const AdminEventsPage = lazy(() => import('./pages/admin/AdminEventsPage'))
const AdminEventPage = lazy(() => import('./pages/admin/AdminEventPage'))
const AdminBookingsPage = lazy(() => import('./pages/admin/AdminBookingsPage'))
const CheckInPage = lazy(() => import('./pages/admin/CheckInPage'))

export default function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="events/:id" element={<EventPage />} />
          <Route path="showtimes/:id" element={<SeatSelectionPage />} />
          <Route
            path="bookings"
            element={
              <RequireAuth>
                <MyBookingsPage />
              </RequireAuth>
            }
          />
          <Route
            path="bookings/:id"
            element={
              <RequireAuth>
                <BookingPage />
              </RequireAuth>
            }
          />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route
            path="admin"
            element={
              <RequireAuth role="ADMIN">
                <AdminLayout />
              </RequireAuth>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="events" element={<AdminEventsPage />} />
            <Route path="events/:id" element={<AdminEventPage />} />
            <Route path="bookings" element={<AdminBookingsPage />} />
            <Route path="check-in" element={<CheckInPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
