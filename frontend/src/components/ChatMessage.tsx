import type { ChatMessage as ChatMessageType } from '../api/types'
import { BotAvatar } from './Logo'
import { SourceChip } from './SourceChip'
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
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="flex items-center gap-1 text-label-sm uppercase tracking-wider text-muted">
              <Icon name="fact_check" size={14} /> Sources
            </span>
            {message.sources.map((s, i) => (
              <SourceChip key={`${s.ref_id}-${i}`} source={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}