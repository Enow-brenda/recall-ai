import type { ChatMessage as ChatMessageType, Source } from '../api/types'
import { BotAvatar } from './Logo'
import { Icon } from './Icon'
import Markdown from 'react-markdown'

interface ChatMessageProps {
  message: ChatMessageType
  streaming?: boolean
}

export function ChatMessage({ message, streaming = false }: ChatMessageProps) {
  const isUser = message.direction === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[74%] rounded-lg bg-primary px-4 py-2.5 text-body-md leading-relaxed text-on-primary">
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3">
      <BotAvatar size={32} iconSize={18} />
      <div className="min-w-0 flex-1 space-y-2.5">
        <div className="flex items-center gap-2">
          <span className="text-label-sm uppercase tracking-wider text-muted">Recall</span>
          {streaming && (
            <span className="flex items-center gap-1 text-muted">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent [animation-delay:0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent [animation-delay:0.3s]" />
            </span>
          )}
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3 text-body-md leading-relaxed text-primary">
          <div className="prose prose-slate max-w-none prose-p:my-2 prose-strong:font-semibold prose-strong:text-primary">
            <Markdown>{message.content}</Markdown>
          </div>
        </div>
        {message.sources && message.sources.length > 0 && (
          <div>
            <span className="flex items-center gap-1 text-label-sm uppercase tracking-wider text-muted">
              <Icon name="fact_check" size={14} /> Sources
            </span>
            <ol className="mt-1.5 space-y-1">
              {message.sources.map((s, i) => (
                <SourceRow key={`${s.ref_id}-${i}`} index={i} source={s} />
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  )
}

const SOURCE_ICONS: Record<Source['type'], string> = {
  email: 'mail',
  attachment: 'description',
  link: 'link',
}

function SourceRow({ index, source }: { index: number; source: Source }) {
  const label =
    source.subject ??
    (source.type === 'attachment' ? source.snippet : new URL(source.url ?? '', 'https://recall.ai').hostname)
  const Wrapper = source.url ? 'a' : 'div'

  return (
    <Wrapper
      {...(source.url ? { href: source.url, target: '_blank', rel: 'noreferrer' } : {})}
      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-body-sm text-primary transition-colors hover:bg-surface-low"
      title={source.snippet}
    >
      <span className="w-16 shrink-0 text-label-sm text-muted">Source {index + 1}</span>
      <Icon name={SOURCE_ICONS[source.type]} size={14} className="shrink-0 text-accent" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {source.url && <Icon name="open_in_new" size={12} className="shrink-0 text-muted" />}
    </Wrapper>
  )
}