import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ChatProvider } from './context/ChatContext'
import { UIProvider } from './context/UIContext'
import { AppShell } from './layout/AppShell'
import { FullScreenLoader } from './components/FullScreenLoader'
import { Landing } from './pages/Landing'
import { Chat } from './pages/Chat'
import { Settings } from './pages/Settings'
import { AuthCallback } from './pages/AuthCallback'

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/*" element={<ProtectedApp />} />
    </Routes>
  )
}

function ProtectedApp() {
  const { user, loading } = useAuth()
  if (loading) return <FullScreenLoader label="Waking up your memory…" />
  if (!user) return <Navigate to="/" replace />

  return (
    <UIProvider>
      <ChatProvider>
        <AppShell>
          <Routes>
            <Route path="/chat" element={<Chat />} />
            <Route path="/chat/:conversationId" element={<Chat />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/chat" replace />} />
          </Routes>
        </AppShell>
      </ChatProvider>
    </UIProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}