/** Dãy số trang rút gọn: 1 … 4 5 [6] 7 8 … 20 (trang tính từ 0). */
export function pageWindow(page: number, totalPages: number): (number | 'gap')[] {
  const pages = new Set<number>([0, totalPages - 1, page - 1, page, page + 1])
  const sorted = [...pages].filter((p) => p >= 0 && p < totalPages).sort((a, b) => a - b)
  const out: (number | 'gap')[] = []
  sorted.forEach((p, i) => {
    const prev = sorted[i - 1]
    if (prev !== undefined && p - prev > 1) out.push('gap')
    out.push(p)
  })
  return out
}
