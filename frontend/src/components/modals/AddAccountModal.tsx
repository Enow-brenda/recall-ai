import { useEffect, useState } from 'react'
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

  useEffect(() => {
    if (!open) return
    void Promise.all([api.accounts.providers(), api.accounts.list()]).then(([p, a]) => {
      setProviders(p)
      setAccounts(a)
    })
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
        Connect a source so Recall can search across it. More sources means a fuller memory.
      </p>
      <ul className="space-y-2.5">
        {providers.map((p) => {
          const busy = connecting === p.key
          return (
            <li key={p.key} className="flex items-center gap-3 rounded-[8px] border border-border p-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-high">
                <Icon name={p.key === 'gmail' ? 'mail' : p.key === 'whatsapp' ? 'chat' : p.key === 'slack' ? 'forum' : 'sms'} size={20} className="text-primary" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-body-sm font-medium text-primary">{p.display_name}</p>
                <p className="text-label-sm text-muted">{isConnected(p.key) ? 'Connected' : p.is_active ? 'Available' : 'Coming soon'}</p>
              </div>
              {p.is_active && !isConnected(p.key) && (
                <button
                  type="button"
                  onClick={() => connect(p.key)}
                  disabled={busy}
                  className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-label-md text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-60"
                >
                  {busy ? <Icon name="sync" size={14} className="animate-spin" /> : <Icon name="add" size={14} />}
                  {busy ? 'Connecting' : 'Connect'}
                </button>
              )}
              {isConnected(p.key) && (
                <span className="flex items-center gap-1 text-label-sm font-medium text-success">
                  <Icon name="check_circle" size={15} filled /> Connected
                </span>
              )}
              {!p.is_active && !isConnected(p.key) && (
                <span className="rounded-full bg-surface-low px-3 py-1 text-label-sm uppercase tracking-wider text-muted">
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