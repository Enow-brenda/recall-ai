import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useChat } from '../context/ChatContext'
import { useUI } from '../context/UIContext'
import { Sidebar } from '../components/Sidebar'
import { ConnectedAccountsModal } from '../components/modals/ConnectedAccountsModal'
import { AddAccountModal } from '../components/modals/AddAccountModal'
import { HelpModal } from '../components/modals/HelpModal'
import { Icon } from '../components/Icon'

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth()
  const chat = useChat()
  const ui = useUI()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const isSettings = location.pathname.startsWith('/settings')
  const activeConversation = chat.conversations.find((c) => c.id === chat.activeConversationId)
  const title = isSettings ? 'Settings' : (activeConversation?.title ?? 'New chat')

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar
        conversations={chat.conversations}
        activeConversationId={chat.activeConversationId ?? null}
        accounts={chat.accounts}
        togglingAccountId={chat.togglingAccountId}
        creatingConversation={chat.creatingConversation}
        selectingConversationId={chat.selectingConversationId}
        onNewChat={() => void chat.newChat()}
        onSelectConversation={(id) => void chat.selectConversation(id)}
        onToggleAccount={(id, checked) => void chat.toggleAccount(id, checked)}
        onOpenAccounts={() => ui.openModal('accounts')}
        onOpenSettings={() => navigate('/settings')}
        onOpenHelp={() => ui.openModal('help')}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />

      {/* Header: title left, theme + profile right */}
      <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border bg-surface/90 px-4 py-3 backdrop-blur md:ml-[300px]">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-primary hover:bg-surface-low md:hidden"
            aria-label="Open menu"
          >
            <Icon name="menu" size={22} />
          </button>
          <h1 className="truncate text-headline-sm font-semibold text-primary">{title}</h1>
          {!isSettings && (
            <button
              type="button"
              onClick={() => ui.openModal('add-account')}
              className="hidden shrink-0 items-center gap-1 rounded-full border border-dashed border-border px-3 py-1 text-label-md text-muted transition-colors hover:border-accent hover:text-accent sm:flex"
            >
              <Icon name="add" size={14} /> Add source
            </button>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={ui.toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-primary transition-colors hover:bg-surface-low"
            aria-label={ui.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <Icon name={ui.theme === 'dark' ? 'light_mode' : 'dark_mode'} size={20} />
          </button>

          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="flex items-center gap-2 rounded-full p-0.5 pr-1 transition-colors hover:bg-surface-low sm:pr-2.5"
            aria-label="Profile"
          >
            {user?.profile_picture_url ? (
              <img
                src={user.profile_picture_url}
                alt=""
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-high text-body-sm font-medium text-primary">
                {user?.name?.[0] ?? 'R'}
              </span>
            )}
            <span className="hidden min-w-0 flex-col text-left leading-tight sm:flex">
              <span className="truncate text-label-md text-primary">{user?.name}</span>
              <span className="truncate text-label-sm text-muted">{user?.primary_email}</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => void handleLogout()}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-danger-soft hover:text-danger"
            aria-label="Log out"
            title="Log out"
          >
            <Icon name="logout" size={19} />
          </button>
        </div>
      </header>

      <main className="min-h-screen md:ml-[300px]">{children}</main>

      {ui.modal === 'accounts' && (
        <ConnectedAccountsModal
          open
          onClose={ui.closeModal}
          onManaged={() => void chat.refreshAccounts()}
        />
      )}
      {ui.modal === 'add-account' && (
        <AddAccountModal open onClose={ui.closeModal} onAdded={() => void chat.refreshAccounts()} />
      )}
      {ui.modal === 'help' && <HelpModal open onClose={ui.closeModal} />}
    </div>
  )
}