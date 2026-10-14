/** EventSource giả cho test: tự điều khiển việc mở, lỗi và sự kiện. */
export class FakeEventSource {
  static instances: FakeEventSource[] = []
  url: string
  closed = false
  onopen: (() => void) | null = null
  onerror: (() => void) | null = null
  private listeners = new Map<string, () => void>()

  constructor(url: string) {
    this.url = url
    FakeEventSource.instances.push(this)
  }

  addEventListener(type: string, listener: () => void) {
    this.listeners.set(type, listener)
  }

  close() {
    this.closed = true
  }

  emit(type: string) {
    this.listeners.get(type)?.()
  }

  static last(): FakeEventSource {
    return FakeEventSource.instances.at(-1)!
  }
}
