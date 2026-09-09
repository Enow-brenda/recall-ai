import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useChat } from '../context/ChatContext'
import { useUI } from '../context/UIContext'
import { ChatMessage } from '../components/ChatMessage'
import { ConversationInput } from '../components/ConversationInput'
import { Icon } from '../components/Icon'
import { BotAvatar } from '../components/Logo'

const SUGGESTIONS = [
  'What was the invoice amount from Safi Studio?',
  'Did anyone share a flight itinerary this month?',
  'Find documents mentioning the lease agreement',
  'Summarize emails from Apex Legal',
]

export function Chat() {
  const { conversationId } = useParams()
  const ui = useUI()
  const chat = useChat()

  useEffect(() => {
    if (conversationId && conversationId !== chat.activeConversationId) {
      void chat.selectConversation(conversationId)
    }
  }, [conversationId]) // eslint-disable-line react-hooks/exhaustive-deps

  const activeMessages = chat.activeConversationId
    ? chat.messagesByConversation[chat.activeConversationId]
    : null
  const isEmpty = !activeMessages || activeMessages.length === 0

  return (
    <div className="flex h-screen flex-col">
      {/* Filter bar */}
      <div className="hide-scrollbar flex items-center gap-2 overflow-x-auto border-b border-border bg-card/70 px-4 py-2.5 backdrop-blur">
        <span
          className={`shrink-0 rounded-full border px-3 py-1 text-label-md transition-colors ${
            'text-primary border-transparent bg-primary text-on-primary'
          }`}
        >
          All Sources
        </span>
        {chat.accounts.map((acc) => (
          <span
            key={acc.id}
            className="shrink-0 rounded-full border border-border bg-surface px-3 py-1 text-label-md text-muted"
          >
            {acc.display_label}
          </span>
        ))}
        <button
          type="button"
          onClick={() => ui.openModal('add-account')}
          className="ml-auto flex shrink-0 items-center gap-1 rounded-full border border-dashed border-border px-3 py-1 text-label-md text-muted transition-colors hover:border-accent hover:text-accent"
        >
          <Icon name="add" size={14} /> Add source
        </button>
      </div>

      {/* Message area */}
      <div className="hide-scrollbar flex-1 overflow-y-auto px-4 py-6 md:px-8">
        <div className="mx-auto w-full max-w-[800px] space-y-6">
          {chat.indexing ? (
            <IndexingState />
          ) : isEmpty ? (
            <EmptyState onSuggestion={(s) => void chat.sendMessage(s)} />
          ) : (
            <>
              {activeMessages?.map((m) => (
                <ChatMessage key={m.id} message={m} />
              ))}
              {chat.streaming && <PlaceholderBubble />}
            </>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border bg-surface/95 backdrop-blur">
        <ConversationInput onSend={(s) => void chat.sendMessage(s)} disabled={chat.streaming || chat.indexing} />
      </div>
    </div>
  )
}

function IndexingState() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <div className="relative">
        <BotAvatar size={64} iconSize={32} />
        <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-on-accent">
          <Icon name="sync" size={14} className="animate-spin" />
        </span>
      </div>
      <h2 className="mt-6 text-headline-md">Recall is indexing your inbox</h2>
      <p className="mt-2 max-w-sm text-body-sm text-muted">
        We're reading your emails, attachments, and links so you can ask anything.
      </p>
      <div className="mt-8 flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent"
            style={{ animationDelay: `${i * 0.12}s` }}
          />
        ))}
      </div>
    </div>
  )
}

function EmptyState({ onSuggestion }: { onSuggestion: (s: string) => void }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <BotAvatar size={56} iconSize={28} />
      <h2 className="mt-5 text-headline-md">What would you like to recall?</h2>
      <p className="mt-1.5 text-body-sm text-muted">
        Start typing or pick a suggestion below.
      </p>
      <div className="mt-7 flex max-w-lg flex-wrap items-center justify-center gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onSuggestion(s)}
            className="rounded-full border border-border bg-card px-3.5 py-1.5 text-label-md text-primary shadow-card transition-colors hover:border-accent hover:text-accent"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}

function PlaceholderBubble() {
  return (
    <div className="flex gap-3">
      <BotAvatar size={32} iconSize={18} />
      <div className="flex-1 space-y-2">
        <span className="text-label-sm uppercase tracking-wider text-muted">Recall is thinking</span>
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <span className="flex items-center gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-2 w-2 animate-bounce rounded-full bg-neutral"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </span>
        </div>
      </div>
    </div>
  )
}