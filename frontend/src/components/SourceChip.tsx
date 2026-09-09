import type { Source } from '../api/types'
import { Icon } from './Icon'

const ICONS: Record<Source['type'], string> = {
  email: 'mail',
  attachment: 'description',
  link: 'link',
}

interface SourceChipProps {
  source: Source
}

export function SourceChip({ source }: SourceChipProps) {
  const label = source.subject ?? (source.type === 'attachment' ? source.snippet : new URL(source.url ?? '', 'https://recall.ai').hostname)
  const Wrapper = source.url ? 'a' : 'div'
  return (
    <Wrapper
      {...(source.url ? { href: source.url, target: '_blank', rel: 'noreferrer' } : {})}
      className="inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-full bg-surface-low px-2.5 py-1 text-label-md text-primary transition-colors hover:bg-surface-high"
      title={source.snippet}
    >
      <Icon name={ICONS[source.type]} size={14} className="shrink-0 text-accent" />
      <span className="truncate">{label}</span>
      {source.url && <Icon name="open_in_new" size={12} className="shrink-0 text-muted" />}
    </Wrapper>
  )
}