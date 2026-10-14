import { useEffect } from 'react'

const SUFFIX = 'ĐặtVé'

/** Đặt tiêu đề tab theo trang; để trống thì chỉ hiện tên site. */
export function useDocumentTitle(title?: string | null) {
  useEffect(() => {
    document.title = title ? `${title} · ${SUFFIX}` : `${SUFFIX} - Đặt vé sự kiện`
  }, [title])
}
