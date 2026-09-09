import { useEffect, useState } from 'react'
import type { UsageStats, UserProfile } from '../api/types'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useChat } from '../context/ChatContext'
import { useUI } from '../context/UIContext'
import { Icon } from '../components/Icon'
import { ProgressBar } from '../components/ProgressBar'
import { ToggleSwitch } from '../components/ToggleSwitch'

export function Settings() {
  const { user } = useAuth()
  const chat = useChat()
  const ui = useUI()
  const [stats, setStats] = useState<UsageStats | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    api.users.stats().then(setStats)
  }, [])

  const statsGrid = stats
    ? [
        { label: 'Emails indexed', value: stats.emails_indexed.toLocaleString(), icon: 'mail' },
        { label: 'Attachments', value: stats.attachments.toLocaleString(), icon: 'description' },
        { label: 'Links saved', value: stats.links.toLocaleString(), icon: 'link' },
        { label: 'Messages sent', value: stats.messages_sent.toLocaleString(), icon: 'chat_bubble' },
      ]
    : []

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <div className="mb-6">
        <h1 className="text-headline-md">Settings</h1>
        <p className="mt-1 text-body-sm text-muted">Manage your profile, plan, and memory sources.</p>
      </div>

      <div className="space-y-5">
        {/* Profile */}
        <Section title="Profile" icon="person">
          <div className="flex items-center gap-4">
            <Avatar user={user} />
            <div className="min-w-0 flex-1">
              <p className="text-body-md font-medium text-primary">{user?.name}</p>
              <p className="truncate text-body-sm text-muted">{user?.primary_email}</p>
            </div>
          </div>
        </Section>

        {/* Plan & usage */}
        <Section title="Plan & Usage" icon="workspace_premium">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <p className="text-body-sm font-medium text-primary">{user?.plan.name} plan</p>
                <p className="text-label-sm text-muted">
                  {stats?.quota_used ?? 0} / {stats?.quota_limit ?? '—'} queries today
                </p>
              </div>
              <ProgressBar
                className="mt-2.5"
                value={((stats?.quota_used ?? 0) / Math.max(stats?.quota_limit ?? 1, 1)) * 100}
              />
              <p className="mt-2 text-label-sm text-muted">
                Resets in {user ? daysLeft(user.last_plan_reset) : 0} day(s)
              </p>
            </div>
            <button
              type="button"
              disabled
              title="Upgrade coming soon"
              className="shrink-0 cursor-not-allowed rounded-lg bg-surface-low px-5 py-2.5 text-label-md font-medium text-muted"
            >
              Upgrade to Pro · $12/mo
            </button>
          </div>
        </Section>

        {/* Connected accounts */}
        <Section title="Connected Accounts" icon="link">
          <ul className="space-y-2.5">
            {chat.accounts.map((acc) => (
              <li
                key={acc.id}
                className="flex items-center gap-3 rounded-[8px] border border-border bg-surface p-3"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-high">
                  <Icon name="mail" size={18} className="text-primary" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-body-sm font-medium text-primary">{acc.display_label}</p>
                  <p className="truncate text-label-sm text-muted">{acc.account_identifier}</p>
                </div>
                <span
                  className={`flex items-center gap-1 text-label-sm font-medium ${
                    acc.is_active ? 'text-success' : 'text-muted'
                  }`}
                >
                  <Icon name="circle" size={10} filled className={acc.is_active ? '' : 'text-neutral'} />
                  {acc.is_active ? 'Active' : 'Paused'}
                </span>
                <ToggleSwitch
                  checked={acc.is_active}
                  busy={chat.togglingAccountId === acc.id}
                  onChange={(v) => void chat.toggleAccount(acc.id, v)}
                  label={`Toggle ${acc.display_label}`}
                />
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => ui.openModal('add-account')}
            className="mt-3.5 flex items-center gap-1.5 rounded-lg border border-dashed border-border px-4 py-2 text-label-md text-muted transition-colors hover:border-accent hover:text-accent"
          >
            <Icon name="add" size={16} /> Add account
          </button>
        </Section>

        {/* Indexed data */}
        <Section title="Indexed Data" icon="database">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {statsGrid.map((s) => (
              <div key={s.label} className="rounded-[8px] border border-border bg-surface p-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft">
                  <Icon name={s.icon} size={16} className="text-accent" />
                </span>
                <p className="mt-3 text-headline-sm">{s.value}</p>
                <p className="text-label-sm text-muted">{s.label}</p>
              </div>
            ))}
          </div>
          <p className="mt-3.5 text-label-sm text-muted">
            {stats ? formatBytes((stats.quota_used / Math.max(stats.quota_limit ?? 1, 1)) * 50) : ''} of 50 GB memory used
          </p>
        </Section>

        {/* Danger zone */}
        <div className="rounded-[8px] border border-danger/30 bg-danger-soft p-5">
          <h2 className="flex items-center gap-2 text-headline-sm text-danger">
            <Icon name="warning" size={20} /> Danger Zone
          </h2>
          <p className="mt-1.5 text-body-sm text-muted">
            Permanently delete your account and all indexed memory. This cannot be undone.
          </p>
          {confirmDelete ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <p className="text-body-sm text-primary">Type DELETE to confirm:</p>
              <input
                type="text"
                placeholder="DELETE"
                className="w-40 rounded-lg border border-danger bg-card px-3 py-2 text-body-sm outline-none focus:border-danger"
              />
              <button
                type="button"
                className="rounded-lg bg-danger px-4 py-2 text-label-md text-on-primary transition-colors hover:opacity-90"
              >
                Delete my account
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="rounded-lg border border-border px-4 py-2 text-label-md text-primary hover:bg-card"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="mt-4 rounded-lg border border-danger/40 px-4 py-2 text-label-md text-danger transition-colors hover:bg-danger hover:text-on-primary"
            >
              Request deletion
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Section({
  title,
  icon,
  children,
}: {
  title: string
  icon: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-[8px] border border-border bg-card p-5 shadow-card md:p-6">
      <h2 className="flex items-center gap-2 text-headline-sm">
        <Icon name={icon} size={20} className="text-accent" />
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function Avatar({ user }: { user: UserProfile | null }) {
  if (user?.profile_picture_url) {
    return <img src={user.profile_picture_url} alt="" className="h-14 w-14 rounded-full object-cover" />
  }
  return (
    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-high text-headline-md text-primary">
      {user?.name?.[0] ?? 'R'}
    </span>
  )
}

function daysLeft(iso: string) {
  return Math.max(1, 24 - Math.floor((Date.now() - +new Date(iso)) / 86_400_000))
}

function formatBytes(gb: number) {
  return gb < 1 ? `${Math.round(gb * 1000)} MB` : `${gb.toFixed(1)} GB`
}