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
import { Logo } from '../components/Logo'

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

  const topLevelChat = chat.activeConversationId

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar
        user={user}
        conversations={chat.conversations}
        activeConversationId={topLevelChat ?? null}
        accounts={chat.accounts}
        onNewChat={() => navigate('/chat')}
        onSelectConversation={(id) => navigate(`/chat/${id}`)}
        onToggleAccount={(id, checked) => void chat.toggleAccount(id, checked)}
        onOpenAccounts={() => ui.openModal('accounts')}
        onOpenSettings={() => navigate('/settings')}
        onLogout={() => void handleLogout()}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-surface/90 px-4 py-3 backdrop-blur md:hidden">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-primary hover:bg-surface-low"
          aria-label="Open menu"
        >
          <Icon name="menu" size={22} />
        </button>
        <Logo text="Recall" className="scale-90" />
        <button
          type="button"
          onClick={() => navigate('/settings')}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-primary hover:bg-surface-low"
          aria-label="Settings"
        >
          <Icon name="settings" size={20} />
        </button>
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