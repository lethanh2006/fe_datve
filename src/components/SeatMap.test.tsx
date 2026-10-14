import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Seat } from '../api/types'
import { SeatLegend, SeatMap } from './SeatMap'

const seats: Seat[] = [
  { id: 1, seatCode: 'A1', category: 'VIP', faceValue: 500000, status: 'AVAILABLE' },
  { id: 2, seatCode: 'A2', category: 'VIP', faceValue: 500000, status: 'HELD' },
  { id: 3, seatCode: 'A3', category: 'VIP', faceValue: 500000, status: 'BOOKED' },
  { id: 4, seatCode: 'B1', category: 'STANDARD', faceValue: 200000, status: 'AVAILABLE' },
]

describe('SeatMap', () => {
  it('chia theo hàng, mỗi ghế là một nút có nhãn đầy đủ', () => {
    render(<SeatMap seats={seats} selectedIds={new Set()} onToggle={() => {}} />)
    const rowA = screen.getByRole('group', { name: 'Hàng A' })
    expect(within(rowA).getAllByRole('button')).toHaveLength(3)
    expect(screen.getByRole('group', { name: 'Hàng B' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Ghế A1, VIP, .*500\.000.*còn trống/ })).toBeEnabled()
  })

  it('ghế đang giữ hoặc đã bán bị khoá, không gọi onToggle', async () => {
    const onToggle = vi.fn()
    render(<SeatMap seats={seats} selectedIds={new Set()} onToggle={onToggle} />)
    const held = screen.getByRole('button', { name: /Ghế A2.*đang được giữ/ })
    const booked = screen.getByRole('button', { name: /Ghế A3.*đã bán/ })
    expect(held).toBeDisabled()
    expect(booked).toBeDisabled()
    await userEvent.click(held)
    await userEvent.click(booked)
    expect(onToggle).not.toHaveBeenCalled()
  })

  it('bấm ghế trống gọi onToggle với đúng ghế', async () => {
    const onToggle = vi.fn()
    render(<SeatMap seats={seats} selectedIds={new Set()} onToggle={onToggle} />)
    await userEvent.click(screen.getByRole('button', { name: /Ghế B1/ }))
    expect(onToggle).toHaveBeenCalledWith(seats[3])
  })

  it('ghế đang chọn có aria-pressed và vẫn bấm được để bỏ chọn', async () => {
    const onToggle = vi.fn()
    render(<SeatMap seats={seats} selectedIds={new Set([1])} onToggle={onToggle} />)
    const selected = screen.getByRole('button', { name: /Ghế A1.*đang chọn/ })
    expect(selected).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(selected)
    expect(onToggle).toHaveBeenCalledWith(seats[0])
  })

  it('khoá toàn bộ khi disabled', () => {
    render(<SeatMap seats={seats} selectedIds={new Set()} onToggle={() => {}} disabled />)
    expect(screen.getByRole('button', { name: /Ghế A1/ })).toBeDisabled()
  })
})

describe('SeatLegend', () => {
  it('liệt kê hạng ghế theo giá giảm dần kèm giá thấp nhất mỗi hạng', () => {
    render(<SeatLegend seats={seats} />)
    const items = screen.getAllByRole('listitem').map((li) => li.textContent)
    expect(items[0]).toMatch(/VIP.*500\.000/)
    expect(items[1]).toMatch(/Tiêu chuẩn.*200\.000/)
    expect(items).toContain(' Đã bán')
  })
})
