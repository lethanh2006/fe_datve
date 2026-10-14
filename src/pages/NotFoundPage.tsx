import { Link } from 'react-router-dom'
import { EmptyState } from '../components/States'
import { useDocumentTitle } from '../lib/useDocumentTitle'

export function NotFoundPage() {
  useDocumentTitle('Không tìm thấy trang')
  return (
    <div className="container page">
      <EmptyState icon="🧭" title="Không tìm thấy trang">
        <p>Đường dẫn bạn truy cập không tồn tại hoặc đã bị di chuyển.</p>
        <Link to="/" className="btn btn-primary">
          Về trang chủ
        </Link>
      </EmptyState>
    </div>
  )
}
