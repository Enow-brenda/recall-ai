import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { Icon } from '../Icon'
import { Modal } from '../Modal'

interface HelpModalProps {
  open: boolean
  onClose: () => void
}

const CHIPS = ['Bug report', 'Billing issue', 'Feature request', 'Something else']

export function HelpModal({ open, onClose }: HelpModalProps) {
  const { user } = useAuth()
  const [category, setCategory] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    if (open) {
      setCategory(null)
      setName('')
      setEmail(user?.primary_email ?? '')
      setMessage('')
      setBusy(false)
      setError(null)
      setSent(false)
    }
  }, [open, user?.primary_email])

  const canSend = message.trim().length > 0 && !busy

  const send = async () => {
    if (!canSend) return
    setBusy(true)
    setError(null)
    try {
      await api.support.send({
        name: name.trim(),
        email: email.trim(),
        category: category ?? undefined,
        message: message.trim(),
      })
      setSent(true)
      window.setTimeout(() => {
        setSent(false)
        onClose()
      }, 1800)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong — please try again.')
    } finally {
      setBusy(false)
    }
  }

  const inputClass =
    'w-full rounded-lg border border-border bg-card px-3 py-2 text-body-sm text-primary outline-none transition-colors placeholder:text-neutral focus:border-accent disabled:opacity-60'

  return (
    <Modal open={open} onClose={onClose} title="How can we help?" icon="support_agent">
      <p className="mb-4 text-body-sm text-muted">
        Ask us anything about Recall. A real person replies within 24 hours.
      </p>
      <div className="flex flex-wrap gap-2">
        {CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => setCategory(chip)}
            aria-pressed={category === chip}
            className={`rounded-full border px-3 py-1.5 text-label-md transition-colors ${
              category === chip
                ? 'border-accent bg-accent-soft text-accent'
                : 'border-border bg-surface text-primary hover:border-accent hover:text-accent'
            }`}
          >
            {chip}
          </button>
        ))}
      </div>
      <div className="mt-5 space-y-3 rounded-[8px] border border-border bg-surface p-3">
        <div>
          <label htmlFor="help-name" className="mb-1 block text-label-sm text-muted">
            Name
          </label>
          <input
            id="help-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Doe"
            disabled={busy}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="help-email" className="mb-1 block text-label-sm text-muted">
            Email
          </label>
          <input
            id="help-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={busy}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="help-message" className="mb-1 block text-label-sm text-muted">
            How can we help?
          </label>
          <input
            id="help-message"
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void send()
            }}
            placeholder="Describe your issue…"
            disabled={busy}
            className={inputClass}
          />
        </div>
        <button
          type="button"
          onClick={() => void send()}
          disabled={!canSend}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-label-md text-on-primary transition-colors hover:bg-primary-dim disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? (
            <>
              <Icon name="sync" size={15} className="animate-spin" /> Sending…
            </>
          ) : (
            'Send message'
          )}
        </button>
        {error && <p className="text-center text-label-md text-danger">{error}</p>}
        {sent && (
          <p className="flex items-center justify-center gap-1.5 text-label-md text-success">
            <Icon name="check_circle" size={15} filled />
            Message sent — we'll get back to you within 24 hours.
          </p>
        )}
      </div>
    </Modal>
  )
}