import type { CSSProperties } from 'react'

interface IconProps {
  name: string
  size?: number
  filled?: boolean
  className?: string
}

export function Icon({ name, size = 18, filled = false, className = '' }: IconProps) {
  const style: CSSProperties = {
    fontSize: size,
    fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' ${filled ? 600 : 400}, 'GRAD' 0, 'opsz' 24`,
  }
  return (
    <span aria-hidden="true" className={`material-symbols-outlined ${className}`} style={style}>
      {name}
    </span>
  )
}