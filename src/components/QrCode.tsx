import { useMemo } from 'react'
import { encode } from 'uqr'

interface QrCodeProps {
  value: string
  /** Mô tả cho trình đọc màn hình */
  label: string
  /** Cạnh hiển thị, tính bằng px */
  size?: number
}

/**
 * Mã QR vẽ bằng SVG (không dùng innerHTML). Luôn đen trên nền trắng, kể cả ở chế độ tối,
 * vì máy quét cần độ tương phản chuẩn.
 */
export function QrCode({ value, label, size = 168 }: QrCodeProps) {
  const { grid, path } = useMemo(() => {
    const { data } = encode(value, { ecc: 'M', border: 2 })
    const runs: string[] = []
    data.forEach((row, y) => {
      // Gộp các ô đen liền nhau trên cùng một hàng thành một đoạn để SVG gọn hơn
      let x = 0
      while (x < row.length) {
        if (!row[x]) {
          x++
          continue
        }
        const start = x
        while (x < row.length && row[x]) x++
        runs.push(`M${start} ${y}h${x - start}v1h-${x - start}z`)
      }
    })
    return { grid: data.length, path: runs.join('') }
  }, [value])

  return (
    <svg
      className="qr"
      width={size}
      height={size}
      viewBox={`0 0 ${grid} ${grid}`}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
    >
      <rect width={grid} height={grid} fill="#fff" />
      <path d={path} fill="#000" />
    </svg>
  )
}
