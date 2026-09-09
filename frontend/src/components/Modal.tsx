import type { ReactNode } from 'react'
import { Icon } from './Icon'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  icon?: string
  maxWidth?: string
  children: ReactNode
  footer?: ReactNode
}

export function Modal({ open, onClose, title, icon, maxWidth = 'max-w-lg', children, footer }: ModalProps) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-primary/40 p-4 backdrop-blur-[2px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`w-full ${maxWidth} max-h-[85vh] overflow-y-auto rounded-[8px] bg-card shadow-overlay`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
          <div className="flex items-center gap-2.5">
            {icon && <Icon name={icon} size={20} className="text-accent" />}
            <h2 className="text-headline-md">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded text-muted transition-colors hover:bg-surface-low hover:text-primary"
            aria-label="Close"
          >
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-3 border-t border-border px-6 py-4">{footer}</div>}
      </div>
    </div>
  )
}