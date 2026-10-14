const ROW_PATTERN = /^[A-Z]{1,2}$/

/**
 * Đọc danh sách hàng ghế do admin nhập: "A, B, C" hoặc "A-D" hoặc trộn cả hai ("A-C, F").
 * Trả về null nếu có phần không hợp lệ; kết quả không trùng và giữ thứ tự nhập.
 */
export function parseRows(text: string): string[] | null {
  const rows: string[] = []
  const push = (row: string) => {
    if (!rows.includes(row)) rows.push(row)
  }

  for (const part of text.split(/[,\s]+/).filter(Boolean)) {
    const token = part.toUpperCase()
    const range = /^([A-Z])-([A-Z])$/.exec(token)
    if (range) {
      const from = range[1]!.charCodeAt(0)
      const to = range[2]!.charCodeAt(0)
      if (from > to) return null
      for (let c = from; c <= to; c++) push(String.fromCharCode(c))
    } else if (ROW_PATTERN.test(token)) {
      push(token)
    } else {
      return null
    }
  }
  return rows.length > 0 ? rows : null
}
