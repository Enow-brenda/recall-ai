import { Icon } from './Icon'

interface LogoProps {
  text?: string
  tagline?: string
  className?: string
}

const BARS = [
  { x: 3.5, h: 11 },
  { x: 9.5, h: 18 },
  { x: 15.5, h: 25 },
  { x: 21.5, h: 25 },
  { x: 27.5, h: 18 },
  { x: 33.5, h: 11 },
]

export function LogoMark({ className = '', fill = '#EA580C' }: { className?: string; fill?: string }) {
  return (
    <svg viewBox="0 0 40 32" className={className} aria-hidden="true">
      {BARS.map((bar) => (
        <rect
          key={bar.x}
          x={bar.x}
          y={(32 - bar.h) / 2}
          width="4"
          height={bar.h}
          rx="2"
          fill={fill}
        />
      ))}
    </svg>
  )
}

export function Logo({ text = 'Recall AI', tagline, className = '' }: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <span className="flex items-center justify-center text-accent" aria-hidden="true">
        <Icon name="graphic_eq" size={26} filled />
      </span>
      {text && (
        <div className="leading-tight">
          <span className="block text-[20px] font-semibold tracking-tight text-primary">{text}</span>
          {tagline && <span className="block text-xs text-muted">{tagline}</span>}
        </div>
      )}
    </div>
  )
}

// Fixed mark used on favicon/brand contexts where the Material font may not apply.
export function BotAvatar({
  size = 24,
  iconSize = 16,
  className = '',
}: {
  size?: number
  iconSize?: number
  className?: string
}) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-primary text-on-primary ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <Icon name="graphic_eq" size={iconSize} filled />
    </span>
  )
}