let audio: AudioContext | null = null

/**
 * Tiếng bíp ngắn để nhân viên soát vé biết kết quả mà không cần nhìn màn hình:
 * cao = cho vào, hai tiếng trầm = bị từ chối/đã quét. Lỗi âm thanh (bị chặn, không hỗ trợ) được bỏ qua.
 */
export function beep(kind: 'ok' | 'warn' | 'error'): void {
  try {
    const Ctor = window.AudioContext
    if (!Ctor) return
    audio ??= new Ctor()
    const ctx = audio
    void ctx.resume()
    const notes = kind === 'ok' ? [{ f: 880, at: 0 }] : kind === 'warn' ? [{ f: 520, at: 0 }, { f: 520, at: 0.18 }] : [{ f: 220, at: 0 }, { f: 220, at: 0.22 }]
    for (const { f, at } of notes) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = f
      osc.type = 'sine'
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + at)
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + at + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + 0.15)
      osc.connect(gain).connect(ctx.destination)
      osc.start(ctx.currentTime + at)
      osc.stop(ctx.currentTime + at + 0.16)
    }
  } catch {
    // không có âm báo cũng không sao
  }
}
