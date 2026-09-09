import { Modal } from '../Modal'

interface HelpModalProps {
  open: boolean
  onClose: () => void
}

const CHIPS = ['Bug report', 'Billing issue', 'Feature request', 'Something else']

export function HelpModal({ open, onClose }: HelpModalProps) {
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
            className="rounded-full border border-border bg-surface px-3 py-1.5 text-label-md text-primary transition-colors hover:border-accent hover:text-accent"
          >
            {chip}
          </button>
        ))}
      </div>
      <div className="mt-5 rounded-[8px] border border-border bg-surface p-3">
        <p className="text-body-sm text-primary">Type your question below and we'll respond.</p>
        <input
          type="text"
          placeholder="Describe your issue…"
          className="mt-2 w-full rounded-lg border border-border bg-card px-3 py-2 text-body-sm text-primary outline-none transition-colors placeholder:text-neutral focus:border-accent"
        />
        <button
          type="button"
          className="mt-3 w-full rounded-lg bg-primary py-2 text-label-md text-on-primary transition-colors hover:bg-primary-dim"
        >
          Send message
        </button>
      </div>
    </Modal>
  )
}