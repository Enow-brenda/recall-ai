import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import type { UserProfile } from '../api/types'
import { api, USE_MOCK_API } from '../api/client'

interface AuthContextValue {
  user: UserProfile | null
  loading: boolean
  isAuthenticated: boolean
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const profile = await api.users.profile()
      setUser(profile)
    } catch {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    if (USE_MOCK_API) {
      // Mock mode: always warm a user so the whole app is clickable.
      api.users.profile().then((p) => {
        setUser(p)
        setLoading(false)
      })
    } else {
      refresh().finally(() => setLoading(false))
    }
  }, [refresh])

  const logout = useCallback(async () => {
    try {
      await api.auth.logout()
    } finally {
      setUser(null)
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, isAuthenticated: !!user, logout, refresh }),
    [user, loading, logout, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}