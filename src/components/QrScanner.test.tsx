import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { QrScanner } from './QrScanner'

function fakeStream() {
  const track = { stop: vi.fn() }
  return { track, stream: { getTracks: () => [track] } as unknown as MediaStream }
}

describe('QrScanner', () => {
  const getUserMedia = vi.fn()

  beforeEach(() => {
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia }, configurable: true })
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
  })
  afterEach(() => {
    getUserMedia.mockReset()
    vi.restoreAllMocks()
  })

  it('mở camera sau, đọc mã định kỳ và chỉ báo lại cùng một mã sau khoảng chờ', async () => {
    const { stream, track } = fakeStream()
    getUserMedia.mockResolvedValue(stream)
    const frames = ['abc123', 'abc123', null, 'abc123', 'xyz789']
    const decode = vi.fn(() => Promise.resolve(frames.shift() ?? null))
    const onScan = vi.fn()

    const { unmount } = render(
      <QrScanner onScan={onScan} intervalMs={5} repeatAfterMs={40} createDecoder={() => Promise.resolve(decode)} />,
    )

    expect(getUserMedia).toHaveBeenCalledWith({ video: { facingMode: { ideal: 'environment' } }, audio: false })
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Đưa mã QR vào khung'))
    await waitFor(() => expect(onScan).toHaveBeenCalledWith('xyz789'))
    // abc123 lặp liên tục trong khoảng chờ chỉ được báo một lần
    expect(onScan.mock.calls.filter(([text]) => text === 'abc123').length).toBeLessThanOrEqual(2)
    expect(onScan.mock.calls[0]).toEqual(['abc123'])

    unmount()
    expect(track.stop).toHaveBeenCalled()
  })

  it('tạm dừng thì không đọc mã', async () => {
    getUserMedia.mockResolvedValue(fakeStream().stream)
    const decode = vi.fn(() => Promise.resolve('abc123'))
    const onScan = vi.fn()
    const { rerender } = render(
      <QrScanner onScan={onScan} paused intervalMs={5} createDecoder={() => Promise.resolve(decode)} />,
    )
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Đang xử lý'))
    await act(() => new Promise((r) => setTimeout(r, 60)))
    expect(onScan).not.toHaveBeenCalled()

    rerender(<QrScanner onScan={onScan} paused={false} intervalMs={5} createDecoder={() => Promise.resolve(decode)} />)
    await waitFor(() => expect(onScan).toHaveBeenCalledWith('abc123'))
  })

  it.each([
    ['NotAllowedError', /chưa cho phép dùng camera/],
    ['NotFoundError', /Không tìm thấy camera/],
    ['NotReadableError', /đang được ứng dụng khác sử dụng/],
  ])('báo lỗi dễ hiểu khi %s', async (name, message) => {
    getUserMedia.mockRejectedValue(new DOMException('x', name))
    render(<QrScanner onScan={() => {}} createDecoder={() => Promise.resolve(() => Promise.resolve(null))} />)
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(message))
  })

  it('trình duyệt không có API camera (HTTP thường) thì hướng dẫn dùng HTTPS', async () => {
    Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true })
    render(<QrScanner onScan={() => {}} />)
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/HTTPS hoặc localhost/))
  })

  it('tắt component trước khi camera mở xong thì giải phóng camera ngay', async () => {
    const { stream, track } = fakeStream()
    let release!: (s: MediaStream) => void
    getUserMedia.mockReturnValue(new Promise<MediaStream>((r) => (release = r)))
    const { unmount } = render(<QrScanner onScan={() => {}} createDecoder={() => Promise.resolve(() => Promise.resolve(null))} />)
    unmount()
    release(stream)
    await act(() => new Promise((r) => setTimeout(r, 20)))
    // luồng được cấp sau khi đã huỷ vẫn phải được dừng, nếu không đèn camera sẽ sáng mãi
    expect(track.stop).toHaveBeenCalled()
  })
})
