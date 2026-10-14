import { useState } from 'react'

interface PosterProps {
  id: number
  name: string
  src: string | null
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')

/**
 * Ảnh bìa sự kiện, lấp đầy khung cha (cha cần position: relative).
 * Luôn vẽ nền gradient sinh từ id; ảnh hiện dần phía trên khi tải xong nên không bị khung xám,
 * còn thiếu ảnh hoặc ảnh lỗi thì giữ nguyên gradient.
 */
export function Poster({ id, name, src }: PosterProps) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)

  return (
    <div className="poster-wrap" style={{ '--hue': (id * 47) % 360 } as React.CSSProperties}>
      <div className="poster-fallback" aria-hidden="true">
        <span>{initials(name)}</span>
      </div>
      {src && !failed && (
        <img
          className="poster-img"
          src={src}
          alt=""
          loading="lazy"
          data-loaded={loaded}
          // ảnh đã có trong cache có thể hoàn tất trước khi gắn sự kiện onLoad
          ref={(el) => {
            if (el?.complete && el.naturalWidth > 0) setLoaded(true)
          }}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  )
}
