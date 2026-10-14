export function passwordError(password: string, confirmation?: string): string | null {
  if ([...password].length < 8) return 'Mật khẩu tối thiểu 8 ký tự.'
  if (new TextEncoder().encode(password).length > 72)
    return 'Mật khẩu quá dài. Hãy dùng mật khẩu ngắn hơn (tối đa 72 byte UTF-8).'
  if (confirmation !== undefined && password !== confirmation) return 'Mật khẩu nhập lại chưa khớp.'
  return null
}
