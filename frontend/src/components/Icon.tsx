import type { CSSProperties } from 'react'

interface IconProps {
  name: string
  size?: number
  filled?: boolean
  className?: string
  style?: CSSProperties
}

export function Icon({ name, size = 18, filled = false, className = '', style }: IconProps) {
  const styles: CSSProperties = {
    fontSize: size,
    fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' ${filled ? 600 : 400}, 'GRAD' 0, 'opsz' 24`,
    ...style,
  }
  return (
    <span aria-hidden="true" className={`material-symbols-outlined ${className}`} style={styles}>
      {name}
    </span>
  )
}