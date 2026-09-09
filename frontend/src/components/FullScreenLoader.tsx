import { Icon } from './Icon'

export function FullScreenLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-surface">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft">
        <Icon name="sync" size={24} className="animate-spin text-accent" />
      </span>
      <p className="text-body-sm text-muted">{label}</p>
    </div>
  )
}