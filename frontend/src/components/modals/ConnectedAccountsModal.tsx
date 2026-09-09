import { useEffect, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { AccountSummary, ProviderInfo } from '../../api/types'
import { api, USE_MOCK_API } from '../../api/client'
import { Icon } from '../Icon'
import { Modal } from '../Modal'

interface ConnectedAccountsModalProps {
  open: boolean
  onClose: () => void
  onManaged?: () => void
}

const PROVIDER_ICONS: Record<string, string> = {
  gmail: 'mail',
  whatsapp: 'chat',
  slack: 'forum',
  sms: 'sms',
}

export function ConnectedAccountsModal({ open, onClose, onManaged }: ConnectedAccountsModalProps) {
  const [providers, setProviders] = useState<ProviderInfo[]>([])
  const [accounts, setAccounts] = useState<AccountSummary[]>([])
  const [syncing, setSyncing] = useState<string | null>(null)
  const [connecting, setConnecting] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    void Promise.all([api.accounts.providers(), api.accounts.list()]).then(
      ([p, a]) => {
        setProviders(p)
        setAccounts(a)
      },
    )
  }, [open])

  const sync = async (accountId: string) => {
    setSyncing(accountId)
    await api.accounts.sync(accountId)
    setSyncing(null)
  }

  const connect = async (provider: string) => {
    setConnecting(provider)
    if (USE_MOCK_API) {
      await new Promise((r) => setTimeout(r, 900))
      await api.accounts.connect(provider)
      const [provs, accts] = await Promise.all([api.accounts.providers(), api.accounts.list()])
      setProviders(provs)
      setAccounts(accts)
      onManaged?.()
    } else {
      const { redirect_url } = await api.accounts.connect(provider)
      window.location.href = redirect_url
    }
    setConnecting(null)
  }

  const connectedFor = (key: string) => accounts.filter((a) => a.provider_key === key)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Connected Accounts"
      icon="link"
      footer={
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-border px-4 py-2 text-label-md text-primary transition-colors hover:bg-surface-low"
        >
          Close
        </button>
      }
    >
      <ul className="space-y-3">
        {providers.map((p) => {
          const connected = connectedFor(p.key)
          const connectingNow = connecting === p.key
          const connectable = p.is_active && connected.length === 0
          const icon = PROVIDER_ICONS[p.key] ?? 'link'
          return (
            <li
              key={p.key}
              role={connectable ? 'button' : undefined}
              tabIndex={connectable ? 0 : undefined}
              onClick={connectable ? () => void connect(p.key) : undefined}
              onKeyDown={
                connectable
                  ? (e: KeyboardEvent<HTMLLIElement>) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        void connect(p.key)
                      }
                    }
                  : undefined
              }
              className={`flex items-center gap-3 rounded-[8px] border border-border bg-surface p-3.5 transition-colors ${
                connectable ? 'cursor-pointer hover:border-accent' : ''
              } ${connectingNow ? 'cursor-wait opacity-70' : ''}`}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-high">
                <Icon name={icon} size={20} className="text-primary" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-body-sm font-medium text-primary">{p.display_name}</p>
                <p className="truncate text-label-sm text-muted">
                  {connected.length > 0
                    ? connected.map((a) => a.display_label).join(', ')
                    : p.is_active
                      ? 'Not connected'
                      : 'Coming soon'}
                </p>
              </div>
              {!p.is_active ? (
                <span className="shrink-0 rounded-full bg-surface-low px-3 py-1 text-label-sm uppercase tracking-wider text-muted">
                  Coming soon
                </span>
              ) : connected.length > 0 ? (
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => sync(connected[0].id)}
                    disabled={syncing !== null}
                    className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-label-md text-primary transition-colors hover:bg-surface-high disabled:opacity-60"
                  >
                    {syncing === connected[0].id ? (
                      <span className="flex items-center gap-1.5">
                        <Icon name="sync" size={14} className="animate-spin" /> Syncing
                      </span>
                    ) : (
                      <>
                        <Icon name="sync" size={14} /> Sync
                      </>
                    )}
                  </button>
                  <span className="flex items-center gap-1 text-label-sm font-medium text-success">
                    <Icon name="check_circle" size={15} filled /> Connected
                  </span>
                </div>
              ) : connectingNow ? (
                <span className="flex shrink-0 items-center gap-1.5 text-label-md text-accent">
                  <Icon name="sync" size={14} className="animate-spin" /> Connecting
                </span>
              ) : (
                <span className="flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-label-md text-on-primary">
                  <Icon name="add_link" size={14} /> Connect
                </span>
              )}
            </li>
          )
        })}
      </ul>
      <p className="mt-4 flex items-center gap-1.5 text-label-sm text-muted">
        <Icon name="lock" size={14} />
        Your credentials stay encrypted. Recall never posts to your accounts without action.
      </p>
    </Modal>
  )
}