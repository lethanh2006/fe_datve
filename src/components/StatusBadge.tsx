import type { BookingStatus } from '../api/types'
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_TONE } from '../lib/status'

export function StatusBadge({ status }: { status: BookingStatus }) {
  return <span className={`badge badge-${BOOKING_STATUS_TONE[status]}`}>{BOOKING_STATUS_LABEL[status]}</span>
}
