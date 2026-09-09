import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

export type ModalKind = 'accounts' | 'add-account' | 'help' | null

interface UIContextValue {
  modal: ModalKind
  openModal: (kind: Exclude<ModalKind, null>) => void
  closeModal: () => void
}

const UIContext = createContext<UIContextValue | null>(null)

export function UIProvider({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<ModalKind>(null)

  const openModal = useCallback((kind: Exclude<ModalKind, null>) => setModal(kind), [])
  const closeModal = useCallback(() => setModal(null), [])

  const value = useMemo(() => ({ modal, openModal, closeModal }), [modal, openModal, closeModal])
  return <UIContext.Provider value={value}>{children}</UIContext.Provider>
}

export function useUI(): UIContextValue {
  const ctx = useContext(UIContext)
  if (!ctx) throw new Error('useUI must be used within UIProvider')
  return ctx
}