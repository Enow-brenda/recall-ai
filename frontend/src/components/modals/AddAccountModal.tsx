import { useEffect, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { AccountSummary, ProviderInfo } from '../../api/types'
import { api, USE_MOCK_API } from '../../api/client'
import { Icon } from '../Icon'
import { Modal } from '../Modal'

interface AddAccountModalProps {
  open: boolean
  onClose: () => void
  onAdded?: () => void
}

export function AddAccountModal({ open, onClose, onAdded }: AddAccountModalProps) {
  const [providers, setProviders] = useState<ProviderInfo[]>([])
  const [accounts, setAccounts] = useState<AccountSummary[]>([])
  const [connecting, setConnecting] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    void Promise.all([api.accounts.providers(), api.accounts.list()])
      .then(([p, a]) => {
        setProviders(p)
        setAccounts(a)
      })
      .finally(() => setLoading(false))
  }, [open])

  const connect = async (provider: string) => {
    setConnecting(provider)
    if (USE_MOCK_API) {
      await new Promise((r) => setTimeout(r, 900))
      await api.accounts.connect(provider)
      const accts = await api.accounts.list()
      setAccounts(accts)
      onAdded?.()
    } else {
      const { redirect_url } = await api.accounts.connect(provider)
      window.location.href = redirect_url
    }
    setConnecting(null)
  }

  const isConnected = (key: string) => accounts.some((a) => a.provider_key === key)
  const providerIcon = (key: string) =>
    key === 'gmail' ? 'mail' : key === 'whatsapp' ? 'chat' : key === 'slack' ? 'forum' : 'sms'

  const onKeyDown =
    (provider: string) => (e: KeyboardEvent<HTMLLIElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        void connect(provider)
      }
    }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add a Memory Source"
      icon="add"
      footer={
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-border px-4 py-2 text-label-md text-primary transition-colors hover:bg-surface-low"
        >
          Cancel
        </button>
      }
    >
      <p className="mb-4 text-body-sm text-muted">
        Connect a source so Recall can search across it. Tap a provider to begin.
      </p>
      <ul className="space-y-2.5">
        {loading && (
          <li className="flex h-24 flex-col items-center justify-center gap-2 rounded-[8px] border border-border text-muted">
            <Icon name="sync" size={20} className="animate-spin text-accent" />
            <span className="text-label-md">Loading sources…</span>
          </li>
        )}
        {!loading &&
          providers.map((p) => {
          const busy = connecting === p.key
          const connectable = p.is_active && !isConnected(p.key)
          return (
            <li
              key={p.key}
              role={connectable ? 'button' : undefined}
              tabIndex={connectable ? 0 : undefined}
              onClick={connectable ? () => void connect(p.key) : undefined}
              onKeyDown={connectable ? onKeyDown(p.key) : undefined}
              className={`flex items-center gap-3 rounded-[8px] border border-border p-3 transition-colors ${
                connectable ? 'cursor-pointer hover:border-accent hover:bg-surface' : ''
              } ${busy ? 'cursor-wait opacity-70' : ''}`}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-high">
                <Icon name={providerIcon(p.key)} size={20} className="text-primary" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-body-sm font-medium text-primary">{p.display_name}</p>
                <p className="text-label-sm text-muted">
                  {isConnected(p.key) ? 'Connected' : p.is_active ? 'Available' : 'Coming soon'}
                </p>
              </div>
              {connectable &&
                (busy ? (
                  <span className="flex shrink-0 items-center gap-1.5 text-label-md text-accent">
                    <Icon name="sync" size={14} className="animate-spin" /> Connecting
                  </span>
                ) : (
                  <span className="flex shrink-0 items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-label-md text-on-accent">
                    <Icon name="add" size={14} /> Connect
                  </span>
                ))}
              {isConnected(p.key) && (
                <span className="flex shrink-0 items-center gap-1 text-label-sm font-medium text-success">
                  <Icon name="check_circle" size={15} filled /> Connected
                </span>
              )}
              {!p.is_active && !isConnected(p.key) && (
                <span className="shrink-0 rounded-full bg-surface-low px-3 py-1 text-label-sm uppercase tracking-wider text-muted">
                  Soon
                </span>
              )}
            </li>
          )
        })}
      </ul>
      <p className="mt-4 flex items-center gap-1.5 text-label-sm text-muted">
        <Icon name="lock" size={14} />
        We only receive read access. You stay in control of what Recall can see.
      </p>
    </Modal>
  )
}