import { useEffect, useRef, useState } from 'react'
import { apiUrl } from '../api/client'

/**
 * Theo dõi thay đổi ghế của một suất diễn qua Server-Sent Events.
 * Mỗi khi server báo ghế đổi (và mỗi lần nối/nối lại, để bù những thay đổi có thể đã lỡ) thì gọi `onChange`
 * để giao diện tải lại danh sách ghế. Trả về `true` khi luồng đang nối; khi đó có thể làm mới thưa hơn.
 * Trình duyệt hoặc mạng không hỗ trợ SSE thì hook không làm gì và trả `false`, giao diện dùng làm mới định kỳ.
 */
export function useSeatStream(showtimeId: number, enabled: boolean, onChange: () => void): boolean {
  const [connected, setConnected] = useState(false)
  const onChangeRef = useRef(onChange)

  useEffect(() => {
    onChangeRef.current = onChange
  })

  useEffect(() => {
    if (!enabled || typeof EventSource === 'undefined') return
    const source = new EventSource(apiUrl(`/api/showtimes/${showtimeId}/seats/events`))
    source.onopen = () => {
      setConnected(true)
      onChangeRef.current()
    }
    // EventSource tự nối lại sau lỗi; trong lúc mất kết nối thì quay về làm mới định kỳ
    source.onerror = () => setConnected(false)
    source.addEventListener('seats', () => onChangeRef.current())
    return () => {
      source.close()
      setConnected(false)
    }
  }, [showtimeId, enabled])

  return connected
}
