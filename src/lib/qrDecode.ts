/** Đọc mã QR từ một khung hình của <video>; trả về nội dung hoặc null nếu khung hình chưa có mã. */
export type FrameDecoder = (video: HTMLVideoElement) => Promise<string | null>

// Kiểu tối thiểu của Shape Detection API (chưa có trong lib.dom của TypeScript)
interface NativeBarcodeDetector {
  detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>
}
interface NativeBarcodeDetectorCtor {
  new (options: { formats: string[] }): NativeBarcodeDetector
  getSupportedFormats(): Promise<string[]>
}

/** Ảnh lớn hơn mức này được thu nhỏ trước khi giải mã: nhanh hơn nhiều mà vẫn đọc tốt mã QR cầm gần camera. */
const MAX_DECODE_WIDTH = 640

/**
 * Chọn bộ giải mã tốt nhất có sẵn: BarcodeDetector của trình duyệt (nhanh, tiết kiệm pin, có trên Chrome Android/macOS),
 * nếu không có thì dùng jsQR (chỉ tải khi thật sự cần nên không làm nặng các trang khác).
 */
export async function createFrameDecoder(): Promise<FrameDecoder> {
  const Native = (window as unknown as { BarcodeDetector?: NativeBarcodeDetectorCtor }).BarcodeDetector
  if (Native) {
    try {
      if ((await Native.getSupportedFormats()).includes('qr_code')) {
        const detector = new Native({ formats: ['qr_code'] })
        return async (video) => (await detector.detect(video))[0]?.rawValue ?? null
      }
    } catch {
      // rơi xuống jsQR
    }
  }

  const { default: jsQR } = await import('jsqr')
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('Không khởi tạo được canvas để đọc mã QR')

  return (video) => {
    const { videoWidth: width, videoHeight: height } = video
    if (!width || !height) return Promise.resolve(null)
    const scale = Math.min(1, MAX_DECODE_WIDTH / width)
    canvas.width = Math.round(width * scale)
    canvas.height = Math.round(height * scale)
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    const image = context.getImageData(0, 0, canvas.width, canvas.height)
    return Promise.resolve(jsQR(image.data, image.width, image.height, { inversionAttempts: 'dontInvert' })?.data ?? null)
  }
}
