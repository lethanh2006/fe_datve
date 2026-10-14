import { ApiError } from '../api/client'

/** Thông báo lỗi thân thiện để hiển thị cho người dùng. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  return 'Có lỗi xảy ra, vui lòng thử lại'
}
