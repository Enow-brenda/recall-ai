import { Icon } from '../Icon'
import { Modal } from '../Modal'

interface DeleteConversationModalProps {
  open: boolean
  conversationTitle?: string
  busy: boolean
  error: string | null
  onConfirm: () => void
  onClose: () => void
}

export function DeleteConversationModal({
  open,
  conversationTitle,
  busy,
  error,
  onConfirm,
  onClose,
}: DeleteConversationModalProps) {
  const title = conversationTitle ?? 'this conversation'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Delete conversation?"
      icon="delete"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg px-4 py-2 text-label-md text-primary transition-colors hover:bg-surface-low disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-danger px-4 py-2 text-label-md text-on-primary transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? (
              <>
                <Icon name="sync" size={15} className="animate-spin" /> Deleting…
              </>
            ) : (
              'Delete'
            )}
          </button>
        </>
      }
    >
      <p className="text-body-sm text-muted">
        Delete “{title}”? This conversation and all its messages will be permanently removed.
        This can't be undone.
      </p>
      {error && <p className="mt-3 text-label-md text-danger">{error}</p>}
    </Modal>
  )
}