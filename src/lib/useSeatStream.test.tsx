import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FakeEventSource } from '../test/fake-event-source'
import { useSeatStream } from './useSeatStream'

describe('useSeatStream', () => {
  beforeEach(() => {
    FakeEventSource.instances = []
    vi.stubGlobal('EventSource', FakeEventSource)
  })
  afterEach(() => vi.unstubAllGlobals())

  it('nối đúng URL, báo đã kết nối và tải lại mỗi lần nối hoặc nhận sự kiện seats', () => {
    const onChange = vi.fn()
    const { result } = renderHook(() => useSeatStream(7, true, onChange))
    const source = FakeEventSource.instances[0]!
    expect(source.url).toBe('/api/showtimes/7/seats/events')
    expect(result.current).toBe(false)

    act(() => source.onopen?.())
    expect(result.current).toBe(true)
    expect(onChange).toHaveBeenCalledTimes(1)

    act(() => source.emit('seats'))
    expect(onChange).toHaveBeenCalledTimes(2)

    // mất kết nối rồi tự nối lại: quay về làm mới định kỳ rồi tải bù khi nối lại
    act(() => source.onerror?.())
    expect(result.current).toBe(false)
    act(() => source.onopen?.())
    expect(result.current).toBe(true)
    expect(onChange).toHaveBeenCalledTimes(3)
  })

  it('luôn gọi phiên bản onChange mới nhất mà không nối lại luồng', () => {
    const first = vi.fn()
    const second = vi.fn()
    const { rerender } = renderHook(({ cb }) => useSeatStream(1, true, cb), { initialProps: { cb: first } })
    rerender({ cb: second })
    expect(FakeEventSource.instances).toHaveLength(1)
    act(() => FakeEventSource.instances[0]!.emit('seats'))
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('đóng luồng khi rời trang hoặc đổi suất diễn', () => {
    const { rerender, unmount } = renderHook(({ id }) => useSeatStream(id, true, () => {}), { initialProps: { id: 1 } })
    rerender({ id: 2 })
    expect(FakeEventSource.instances).toHaveLength(2)
    expect(FakeEventSource.instances[0]!.closed).toBe(true)
    expect(FakeEventSource.instances[1]!.url).toBe('/api/showtimes/2/seats/events')
    unmount()
    expect(FakeEventSource.instances[1]!.closed).toBe(true)
  })

  it('không nối khi bị tắt hoặc trình duyệt không có EventSource', () => {
    renderHook(() => useSeatStream(1, false, () => {}))
    expect(FakeEventSource.instances).toHaveLength(0)

    vi.stubGlobal('EventSource', undefined)
    const { result } = renderHook(() => useSeatStream(1, true, () => {}))
    expect(result.current).toBe(false)
  })
})
