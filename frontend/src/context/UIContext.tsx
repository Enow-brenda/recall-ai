import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

export type ModalKind = 'accounts' | 'add-account' | 'help' | null
export type Theme = 'light' | 'dark'

const THEME_STORAGE_KEY = 'recall-theme'

function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    /* ignore */
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

interface UIContextValue {
  theme: Theme
  toggleTheme: () => void
  modal: ModalKind
  openModal: (kind: Exclude<ModalKind, null>) => void
  closeModal: () => void
}

const UIContext = createContext<UIContextValue | null>(null)

export function UIProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const [modal, setModal] = useState<ModalKind>(null)

  useEffect(() => {
    applyTheme(theme)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      /* ignore */
    }
  }, [theme])

  const toggleTheme = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), [])
  const openModal = useCallback((kind: Exclude<ModalKind, null>) => setModal(kind), [])
  const closeModal = useCallback(() => setModal(null), [])

  const value = useMemo(
    () => ({ theme, toggleTheme, modal, openModal, closeModal }),
    [theme, toggleTheme, modal, openModal, closeModal],
  )
  return <UIContext.Provider value={value}>{children}</UIContext.Provider>
}

export function useUI(): UIContextValue {
  const ctx = useContext(UIContext)
  if (!ctx) throw new Error('useUI must be used within UIProvider')
  return ctx
}