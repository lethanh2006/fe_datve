import { useEffect, useState } from 'react'
import { serverNow } from '../api/client'

/** Thời điểm hiện tại (theo đồng hồ server), tự cập nhật mỗi `intervalMs` để giao diện không bị cũ. */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => serverNow())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(serverNow()), intervalMs)
    return () => window.clearInterval(timer)
  }, [intervalMs])
  return now
}
