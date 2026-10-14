import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Countdown } from './Countdown'

describe('Countdown', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-17T12:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('đếm ngược từng giây và gọi onExpire đúng một lần khi về 0', () => {
    const onExpire = vi.fn()
    render(<Countdown expiresAt="2026-10-17T12:00:03Z" onExpire={onExpire} />)
    expect(screen.getByRole('timer')).toHaveTextContent('00:03')

    act(() => void vi.advanceTimersByTime(1000))
    expect(screen.getByRole('timer')).toHaveTextContent('00:02')
    expect(onExpire).not.toHaveBeenCalled()

    act(() => void vi.advanceTimersByTime(5000))
    expect(screen.getByRole('timer')).toHaveTextContent('00:00')
    expect(onExpire).toHaveBeenCalledTimes(1)
  })

  it('đã quá hạn thì báo hết hạn ngay', () => {
    const onExpire = vi.fn()
    render(<Countdown expiresAt="2026-10-17T11:59:00Z" onExpire={onExpire} />)
    expect(screen.getByRole('timer')).toHaveTextContent('00:00')
    expect(onExpire).toHaveBeenCalledTimes(1)
  })

  it('chuyển sang trạng thái khẩn cấp khi còn dưới 1 phút', () => {
    render(<Countdown expiresAt="2026-10-17T12:04:00Z" />)
    expect(screen.getByRole('timer')).not.toHaveClass('is-urgent')
    act(() => void vi.advanceTimersByTime(3 * 60_000 + 1000))
    expect(screen.getByRole('timer')).toHaveClass('is-urgent')
  })
})
