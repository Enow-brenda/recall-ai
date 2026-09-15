import type { AccountSummary, Conversation } from '../api/types'
import { Icon } from './Icon'
import { Logo } from './Logo'
import { ToggleSwitch } from './ToggleSwitch'
import { useState } from 'react'

interface SidebarProps {
  conversations: Conversation[]
  activeConversationId: string | null
  accounts: AccountSummary[]
  togglingAccountId: string | null
  creatingConversation: boolean
  selectingConversationId: string | null
  onNewChat: () => void
  onSelectConversation: (id: string) => void
  onDeleteConversation: (conversation: Conversation) => void
  onToggleAccount: (id: string, checked: boolean) => void
  onOpenAccounts: () => void
  onOpenSettings: () => void
  onOpenHelp: () => void
  open: boolean
  onClose: () => void
}

export function Sidebar({
  conversations,
  activeConversationId,
  accounts,
  togglingAccountId,
  creatingConversation,
  selectingConversationId,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
  onToggleAccount,
  onOpenAccounts,
  onOpenSettings,
  onOpenHelp,
  open,
  onClose,
}: SidebarProps) {
  const [query, setQuery] = useState('')
  const [sourcesOpen, setSourcesOpen] = useState(true)

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(query.toLowerCase()),
  )
  const groups = groupByDay(filtered)

  const content = (
    <div className="flex h-full flex-col bg-surface-low p-4">
      {/* Brand */}
      <div className="flex items-center justify-between">
        <Logo text="Recall AI" tagline="Your inbox, remembered" />
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded text-muted hover:bg-surface-high md:hidden"
          aria-label="Close menu"
        >
          <Icon name="close" size={18} />
        </button>
      </div>

      {/* New Memory */}
      <button
        type="button"
        onClick={onNewChat}
        disabled={creatingConversation}
        className="mt-4.5 flex w-full items-center justify-center gap-2 rounded-full bg-accent py-2.5 text-label-md font-medium text-on-accent shadow-card transition-colors hover:bg-accent-hover disabled:cursor-wait disabled:opacity-70"
      >
        {creatingConversation ? (
          <Icon name="sync" size={18} className="animate-spin" />
        ) : (
          <Icon name="add" size={18} />
        )}
        New Memory
      </button>

      {/* Search */}
      <div className="relative mt-4">
        <Icon
          name="search"
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search conversations…"
          className="w-full rounded-[8px] border border-border bg-card py-2 pl-9 pr-3 text-body-sm text-primary placeholder-neutral outline-none transition-colors focus:border-accent"
        />
      </div>

      {/* Conversations (scrollable) */}
      <nav className="hide-scrollbar mt-4 flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <p className="px-2 py-2 text-body-sm text-muted">No conversations yet</p>
        )}
        {groups.map((group) => (
          <div key={group.label} className="mb-3">
            <p className="px-2 text-label-sm uppercase tracking-wider text-muted">{group.label}</p>
            <ul className="mt-1 space-y-0.5">
              {group.items.map((c) => (
                <li key={c.id}>
                  <div
                    className={`group flex items-center rounded-lg transition-colors ${
                      activeConversationId === c.id
                        ? 'bg-primary text-on-primary'
                        : 'hover:bg-surface-high'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onSelectConversation(c.id)
                        onClose()
                      }}
                      disabled={selectingConversationId === c.id}
                      className={`flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-left text-body-sm transition-colors disabled:cursor-wait ${
                        activeConversationId === c.id ? 'text-on-primary' : 'text-primary'
                      }`}
                    >
                      <Icon
                        name="chat_bubble"
                        size={16}
                        className="shrink-0 text-muted"
                        filled={activeConversationId === c.id}
                      />
                      <span className="truncate">{c.title}</span>
                      {selectingConversationId === c.id && (
                        <Icon name="sync" size={14} className="ml-auto animate-spin shrink-0" />
                      )}
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete conversation ${c.title}`}
                      title="Delete conversation"
                      onClick={() => onDeleteConversation(c)}
                      className={`mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded transition-colors focus-visible:opacity-100 ${
                        activeConversationId === c.id
                          ? 'text-on-primary/70 opacity-100 hover:text-on-primary'
                          : 'text-muted opacity-0 hover:text-danger group-hover:opacity-100'
                      }`}
                    >
                      <Icon name="delete" size={16} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer (fixed — Sources on the same section as Settings) */}
      <div className="mt-4 shrink-0 border-t border-border pt-2.5">
        <button
          type="button"
          onClick={() => setSourcesOpen((v) => !v)}
          className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-label-sm uppercase tracking-wider text-muted transition-colors hover:bg-surface-high"
        >
          Sources
          <Icon
            name={sourcesOpen ? 'expand_more' : 'expand_less'}
            size={16}
            className="transition-transform"
          />
        </button>
        {sourcesOpen && (
          <ul className="hide-scrollbar mt-1 max-h-[180px] space-y-0.5 overflow-y-auto">
            {accounts.map((acc) => (
              <li
                key={acc.id}
                className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5"
              >
                <span className="flex min-w-0 items-center gap-2 text-body-sm text-primary">
                  <Icon name="mail" size={16} className="shrink-0" style={{ color: '#EA4335' }} />
                  <span className="truncate">{acc.display_label}</span>
                </span>
                <ToggleSwitch
                  checked={acc.is_active}
                  busy={togglingAccountId === acc.id}
                  onChange={(v) => onToggleAccount(acc.id, v)}
                  label={`Toggle ${acc.display_label}`}
                />
              </li>
            ))}
          </ul>
        )}

        <div className="mt-1.5 space-y-0.5 border-t border-border pt-1.5">
          <button
            type="button"
            onClick={onOpenAccounts}
            className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-body-sm text-primary transition-colors hover:bg-surface-high"
          >
            <Icon name="link" size={17} className="text-muted" />
            Connected Accounts
            <span className="ml-auto text-label-sm text-muted">{accounts.length}</span>
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-body-sm text-primary transition-colors hover:bg-surface-high"
          >
            <Icon name="settings" size={17} className="text-muted" />
            Settings
          </button>
          <button
            type="button"
            onClick={onOpenHelp}
            className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-body-sm text-primary transition-colors hover:bg-surface-high"
          >
            <Icon name="help" size={17} className="text-muted" />
            Help
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[300px] border-r border-border md:block">
        {content}
      </aside>
      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={onClose} />
          <aside className="absolute inset-y-0 left-0 w-[300px] max-w-[85vw] border-r border-border shadow-overlay">
            {content}
          </aside>
        </div>
      )}
    </>
  )
}

type DayGroup = { label: string; items: Conversation[] }

function groupByDay(conversations: Conversation[]): DayGroup[] {
  const now = new Date()
  const todayStart = startOfDay(now)
  const yesterdayStart = new Date(todayStart.getTime() - 86_400_000)
  const weekStart = new Date(todayStart.getTime() - 6 * 86_400_000)

  const sorted = [...conversations].sort(
    (a, b) => +new Date(b.last_modified_at) - +new Date(a.last_modified_at),
  )

  const groups: Record<string, Conversation[]> = { Today: [], Yesterday: [], 'Previous 7 days': [], Older: [] }

  for (const c of sorted) {
    const d = startOfDay(new Date(c.last_modified_at)).getTime()
    if (d >= todayStart.getTime()) groups['Today'].push(c)
    else if (d >= yesterdayStart.getTime()) groups['Yesterday'].push(c)
    else if (d >= weekStart.getTime()) groups['Previous 7 days'].push(c)
    else groups['Older'].push(c)
  }

  return (['Today', 'Yesterday', 'Previous 7 days', 'Older'] as const)
    .filter((label) => groups[label].length > 0)
    .map((label) => ({ label, items: groups[label] }))
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}