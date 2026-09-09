interface LogoProps {
  text?: string
  tagline?: string
  className?: string
}

export function LogoMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#F8FAFC" />
      <path
        d="M16 7.5c-4.7 0-8.5 3.2-8.5 7.25 0 2.2 1.1 4.15 2.9 5.5l-.55 2.35a.5.5 0 0 0 .77.53l2.5-1.5c.9.2 1.85.37 2.88.37 4.7 0 8.5-3.2 8.5-7.25S20.7 7.5 16 7.5Z"
        fill="#EA580C"
      />
      <path
        d="M12.9 13.6a1.15 1.15 0 1 1 0 2.3 1.15 1.15 0 0 1 0-2.3Zm3.1 0a1.15 1.15 0 1 1 0 2.3 1.15 1.15 0 0 1 0-2.3Zm3.1 0a1.15 1.15 0 1 1 0 2.3 1.15 1.15 0 0 1 0-2.3Z"
        fill="#F8FAFC"
      />
    </svg>
  )
}

export function Logo({ text, tagline, className = '' }: LogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <LogoMark className="h-9 w-9 shrink-0" />
      {text && (
        <div className="leading-tight">
          <span className="block text-[20px] font-semibold tracking-tight text-primary">{text}</span>
          {tagline && <span className="block text-xs text-muted">{tagline}</span>}
        </div>
      )}
    </div>
  )
}