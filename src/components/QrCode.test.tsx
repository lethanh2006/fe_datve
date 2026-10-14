import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { QrCode } from './QrCode'

describe('QrCode', () => {
  it('vẽ SVG có nhãn truy cập và viewBox vuông', () => {
    render(<QrCode value="a1b2c3d4e5f60718" label="Mã QR vé DV-000001" />)
    const svg = screen.getByRole('img', { name: 'Mã QR vé DV-000001' })
    const [, , w, h] = svg.getAttribute('viewBox')!.split(' ').map(Number)
    expect(w).toBe(h)
    // 16 ký tự hex ở mức sửa lỗi M vẫn là QR version 2 (25x25) + viền 2 mỗi bên
    expect(w).toBeGreaterThanOrEqual(29)
    expect(svg.querySelector('path')!.getAttribute('d')).toMatch(/^M\d+ \d+h\d+v1h-\d+z/)
  })

  it('nội dung khác nhau cho hình khác nhau, cùng nội dung cho cùng hình', () => {
    const d = (value: string) => {
      const { container, unmount } = render(<QrCode value={value} label="qr" />)
      const path = container.querySelector('path')!.getAttribute('d')
      unmount()
      return path
    }
    expect(d('aaaaaaaaaaaaaaaa')).toBe(d('aaaaaaaaaaaaaaaa'))
    expect(d('aaaaaaaaaaaaaaaa')).not.toBe(d('bbbbbbbbbbbbbbbb'))
  })
})
