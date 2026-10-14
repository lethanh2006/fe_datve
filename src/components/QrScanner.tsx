import { useEffect, useRef, useState } from 'react'
import { createFrameDecoder, type FrameDecoder } from '../lib/qrDecode'

interface QrScannerProps {
  /** Gọi khi đọc được một mã (cùng một mã liên tục chỉ báo lại sau `repeatAfterMs`) */
  onScan: (text: string) => void
  /** Tạm dừng đọc (ví dụ đang gửi yêu cầu), camera vẫn bật */
  paused?: boolean
  /** Chu kỳ lấy khung hình để giải mã */
  intervalMs?: number
  repeatAfterMs?: number
  /** Cho test thay bộ giải mã */
  createDecoder?: () => Promise<FrameDecoder>
}

type State = { status: 'starting' } | { status: 'scanning' } | { status: 'error'; message: string }

function cameraError(error: unknown): string {
  const name = error instanceof DOMException ? error.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'Bạn chưa cho phép dùng camera. Hãy cấp quyền camera cho trang này trong trình duyệt.'
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'Không tìm thấy camera trên thiết bị này.'
  if (name === 'NotReadableError') return 'Camera đang được ứng dụng khác sử dụng.'
  return 'Không mở được camera. Hãy thử tải lại trang.'
}

/** Camera quét mã QR. Chỉ chạy được trên HTTPS hoặc localhost (quy định của trình duyệt về camera). */
export function QrScanner({ onScan, paused = false, intervalMs = 150, repeatAfterMs = 3000, createDecoder = createFrameDecoder }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [state, setState] = useState<State>({ status: 'starting' })
  const onScanRef = useRef(onScan)
  const pausedRef = useRef(paused)

  useEffect(() => {
    onScanRef.current = onScan
    pausedRef.current = paused
  })

  useEffect(() => {
    let stopped = false
    let timer: number | undefined
    let stream: MediaStream | undefined
    const video = videoRef.current

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setState({ status: 'error', message: 'Trình duyệt không hỗ trợ camera. Cần mở trang bằng HTTPS hoặc localhost.' })
        return
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
        if (stopped || !video) {
          // Đã rời trang trong lúc chờ cấp quyền: dừng luồng ngay, nếu không đèn camera sẽ sáng mãi
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        video.srcObject = stream
        await video.play()
        const decode = await createDecoder()
        if (stopped) return
        setState({ status: 'scanning' })

        let last = { text: '', at: 0 }
        const tick = async () => {
          if (stopped) return
          if (!pausedRef.current) {
            try {
              const text = await decode(video)
              const now = Date.now()
              if (text && (text !== last.text || now - last.at > repeatAfterMs)) {
                last = { text, at: now }
                onScanRef.current(text)
              }
            } catch {
              // một khung hình lỗi không làm dừng việc quét
            }
          }
          if (!stopped) timer = window.setTimeout(() => void tick(), intervalMs)
        }
        void tick()
      } catch (error) {
        if (!stopped) setState({ status: 'error', message: cameraError(error) })
      }
    }

    void start()
    return () => {
      stopped = true
      window.clearTimeout(timer)
      stream?.getTracks().forEach((track) => track.stop())
      if (video) video.srcObject = null
    }
  }, [createDecoder, intervalMs, repeatAfterMs])

  return (
    <div className="qr-scanner">
      {/* Khung cắt: bóng tối quanh ô ngắm chỉ được phủ lên video, không tràn ra cả trang */}
      <div className="qr-viewport">
        <video ref={videoRef} className="qr-video" muted playsInline aria-label="Hình ảnh từ camera" />
        <div className="qr-frame" aria-hidden="true" />
      </div>
      <p className="qr-status" role="status">
        {state.status === 'starting' && 'Đang mở camera...'}
        {state.status === 'scanning' && (paused ? 'Đang xử lý...' : 'Đưa mã QR vào khung để quét')}
        {state.status === 'error' && state.message}
      </p>
    </div>
  )
}
