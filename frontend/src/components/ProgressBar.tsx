interface ProgressBarProps {
  value: number // 0..100
  className?: string
  label?: string
}

export function ProgressBar({ value, className = '' }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-surface-low ${className}`} role="progressbar" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100}>
      <div
        className="h-full rounded-full bg-accent transition-all duration-500"
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}