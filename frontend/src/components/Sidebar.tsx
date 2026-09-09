import type { AccountSummary, Conversation, UserProfile } from '../api/types'
import { Icon } from './Icon'
import { Logo, LogoMark } from './Logo'
import { ToggleSwitch } from './ToggleSwitch'
import { useState } from 'react'

interface SidebarProps {
  user: UserProfile | null
  conversations: Conversation[]
  activeConversationId: string | null
  accounts: AccountSummary[]
  onNewChat: () => void
  onSelectConversation: (id: string) => void
  onToggleAccount: (id: string, checked: boolean) => void
  onOpenAccounts: () => void
  onOpenSettings: () => void
  onLogout: () => void
  open: boolean
  onClose: () => void
}

const SECTION_ICONS: Record<string, string> = {
  recents: 'history',
  starred: 'star',
  people: 'group',
}

export function Sidebar({
  user,
  conversations,
  activeConversationId,
  accounts,
  onNewChat,
  onSelectConversation,
  onToggleAccount,
  onOpenAccounts,
  onOpenSettings,
  onLogout,
  open,
  onClose,
}: SidebarProps) {
  const [query, setQuery] = useState('')
  const [sourcesOpen, setSourcesOpen] = useState(true)

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(query.toLowerCase()),
  )

  const content = (
    <div className="flex h-full flex-col bg-surface-low p-4">
      {/* Brand */}
      <div className="flex items-center justify-between">
        <Logo text="Recall" tagline="Your inbox, remembered" />
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
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-accent py-2.5 text-label-md font-medium text-on-accent shadow-card transition-colors hover:bg-accent-hover"
      >
        <Icon name="add" size={18} />
        New Memory
      </button>

      {/* Search */}
      <div className="relative mt-5">
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

      {/* Scrollable nav */}
      <nav className="hide-scrollbar mt-5 flex-1 overflow-y-auto">
        <ul className="space-y-0.5">
          {Object.entries(SECTION_ICONS).map(([key, icon]) => (
            <li key={key}>
              <NavRow icon={icon} label={key === 'recents' ? 'Recents' : key === 'starred' ? 'Starred' : 'People'} />
            </li>
          ))}
        </ul>

        {/* Conversations */}
        <p className="mt-5 px-2 text-label-sm uppercase tracking-wider text-muted">Conversations</p>
        <ul className="mt-1.5 space-y-0.5">
          {filtered.length === 0 && (
            <li className="px-2 py-2 text-body-sm text-muted">No conversations yet</li>
          )}
          {filtered.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => {
                  onSelectConversation(c.id)
                  onClose()
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-body-sm transition-colors ${
                  activeConversationId === c.id
                    ? 'bg-primary text-on-primary'
                    : 'text-primary hover:bg-surface-high'
                }`}
              >
                <Icon name="chat_bubble_outline" size={16} className="shrink-0 text-muted" />
                <span className="truncate">{c.title}</span>
              </button>
            </li>
          ))}
        </ul>

        {/* Sources */}
        <div className="mt-5">
          <button
            type="button"
            onClick={() => setSourcesOpen((v) => !v)}
            className="flex w-full items-center justify-between px-2 text-label-sm uppercase tracking-wider text-muted"
          >
            Sources
            <Icon name={sourcesOpen ? 'expand_less' : 'expand_more'} size={16} />
          </button>
          {sourcesOpen && (
            <ul className="mt-1.5 space-y-0.5">
              {accounts.map((acc) => (
                <li
                  key={acc.id}
                  className="flex items-center justify-between gap-2 rounded-lg px-2 py-2"
                >
                  <span className="flex min-w-0 items-center gap-2 text-body-sm text-primary">
                    <Icon name="mail" size={16} className="shrink-0 text-accent" />
                    <span className="truncate">{acc.display_label}</span>
                  </span>
                  <ToggleSwitch
                    checked={acc.is_active}
                    onChange={(v) => onToggleAccount(acc.id, v)}
                    label={`Toggle ${acc.display_label}`}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </nav>

      {/* Footer */}
      <div className="mt-4 border-t border-border pt-3">
        <button
          type="button"
          onClick={onOpenAccounts}
          className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-body-sm text-primary transition-colors hover:bg-surface-high"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-high">
            <Icon name="link" size={16} className="text-muted" />
          </span>
          Connected Accounts
          <span className="ml-auto text-label-sm text-muted">{accounts.length}</span>
        </button>
        <button
          type="button"
          onClick={onOpenSettings}
          className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-body-sm text-primary transition-colors hover:bg-surface-high"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-high">
            <Icon name="settings" size={16} className="text-muted" />
          </span>
          Settings
        </button>
        <div className="mt-2 flex items-center gap-2 border-t border-border bg-surface px-2 py-2.5 pt-3">
          {user?.profile_picture_url ? (
            <img
              src={user.profile_picture_url}
              alt=""
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <LogoMark className="h-8 w-8" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-body-sm font-medium text-primary">{user?.name}</p>
            <p className="truncate text-label-sm text-muted">{user?.primary_email}</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="flex h-8 w-8 items-center justify-center rounded text-muted transition-colors hover:bg-danger-soft hover:text-danger"
            aria-label="Log out"
            title="Log out"
          >
            <Icon name="logout" size={18} />
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
          <div className="absolute inset-0 bg-primary/40" onClick={onClose} />
          <aside className="absolute inset-y-0 left-0 w-[300px] max-w-[85vw] border-r border-border shadow-overlay">
            {content}
          </aside>
        </div>
      )}
    </>
  )
}

function NavRow({ icon, label }: { icon: string; label: string }) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-body-sm text-primary transition-colors hover:bg-surface-high"
    >
      <Icon name={icon} size={17} className="text-muted" />
      {label}
    </button>
  )
}