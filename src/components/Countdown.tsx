import { useEffect, useRef, useState } from 'react'
import { serverNow } from '../api/client'
import { formatCountdown } from '../lib/format'
import { Icon } from './Icon'

interface CountdownProps {
  /** Thời điểm hết hạn (ISO) */
  expiresAt: string
  /** Gọi đúng một lần khi đếm về 0 */
  onExpire?: () => void
  size?: 'sm' | 'lg'
}

const secondsLeft = (target: number) => Math.max(0, Math.ceil((target - serverNow()) / 1000))

export function Countdown({ expiresAt, onExpire, size = 'sm' }: CountdownProps) {
  const target = new Date(expiresAt).getTime()
  const [left, setLeft] = useState(() => secondsLeft(target))
  const onExpireRef = useRef(onExpire)
  const firedRef = useRef(false)

  useEffect(() => {
    onExpireRef.current = onExpire
  })

  useEffect(() => {
    firedRef.current = false
    const tick = () => {
      const remaining = secondsLeft(target)
      setLeft(remaining)
      if (remaining === 0 && !firedRef.current) {
        firedRef.current = true
        onExpireRef.current?.()
      }
    }
    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [target])

  return (
    <span className={`countdown countdown-${size} ${left <= 60 ? 'is-urgent' : ''}`} role="timer">
      <Icon name="clock" size={size === 'lg' ? 22 : 16} />
      <span className="sr-only">Thời gian giữ ghế còn lại: </span>
      <time>{formatCountdown(left)}</time>
    </span>
  )
}
