import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// jsdom chưa triển khai hành vi mở/đóng dialog như trình duyệt.
HTMLDialogElement.prototype.showModal ??= function () {
  this.setAttribute('open', '')
}
HTMLDialogElement.prototype.close ??= function () {
  this.removeAttribute('open')
  this.dispatchEvent(new Event('close'))
}

afterEach(() => {
  cleanup()
  localStorage.clear()
})
