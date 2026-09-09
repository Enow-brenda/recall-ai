import { useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Icon } from './Icon'

interface ConversationInputProps {
  onSend: (content: string) => void
  disabled?: boolean
  placeholder?: string
}

export function ConversationInput({
  onSend,
  disabled = false,
  placeholder = 'Ask anything about your inbox…',
}: ConversationInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const canSend = value.trim().length > 0 && !disabled

  const submit = () => {
    if (!canSend) return
    onSend(value.trim())
    setValue('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  const autoResize = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }

  return (
    <div className="mx-auto w-full max-w-[800px] px-4 pb-4 md:px-0">
      <div className="flex items-end gap-2 rounded-full border border-border bg-card py-1.5 pl-1.5 pr-1.5 shadow-card transition-all focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
        <button
          type="button"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-low hover:text-primary"
          aria-label="Attach"
        >
          <Icon name="attach_file" size={20} />
        </button>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            autoResize()
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          rows={1}
          className="max-h-40 min-h-9 flex-1 resize-none bg-transparent py-2 text-body-md text-primary placeholder-neutral outline-none"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!canSend}
          aria-label="Send message"
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all ${
            canSend
              ? 'bg-accent text-on-accent shadow-card hover:bg-accent-hover'
              : 'cursor-not-allowed bg-surface-low text-neutral'
          }`}
        >
          <Icon name="arrow_upward" size={20} />
        </button>
      </div>
      <p className="mt-2 text-center text-label-sm text-muted">
        Recall AI can make mistakes. Verify important information.
      </p>
    </div>
  )
}