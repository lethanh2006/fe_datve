interface Props {
  password: string
  confirmation: string
  onPassword: (value: string) => void
  onConfirmation: (value: string) => void
}

export function NewPasswordFields({ password, confirmation, onPassword, onConfirmation }: Props) {
  return (
    <>
      <div className="field">
        <label htmlFor="new-password">Mật khẩu mới</label>
        <input
          id="new-password"
          className="input"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={72}
          value={password}
          onChange={(e) => onPassword(e.target.value)}
          aria-describedby="new-password-hint"
        />
        <span id="new-password-hint" className="field-hint">
          Tối thiểu 8 ký tự. Nên dùng mật khẩu riêng cho tài khoản này.
        </span>
      </div>
      <div className="field">
        <label htmlFor="confirm-password">Nhập lại mật khẩu mới</label>
        <input
          id="confirm-password"
          className="input"
          type="password"
          autoComplete="new-password"
          required
          maxLength={72}
          value={confirmation}
          onChange={(e) => onConfirmation(e.target.value)}
        />
      </div>
    </>
  )
}
