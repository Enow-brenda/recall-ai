import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react'
import type { ReactNode } from 'react'
import type { AccountSummary, ChatMessage, Conversation } from '../api/types'
import { api } from '../api/client'

interface ChatState {
  conversations: Conversation[]
  accounts: AccountSummary[]
  messagesByConversation: Record<string, ChatMessage[]>
  activeConversationId: string | null
  streaming: boolean
  indexing: boolean
}

type ChatAction =
  | { type: 'accounts/replace'; accounts: AccountSummary[] }
  | { type: 'accounts/toggle'; account: AccountSummary }
  | { type: 'conversations/set'; conversations: Conversation[] }
  | { type: 'conversation/select'; id: string; messages: ChatMessage[] }
  | { type: 'conversation/new'; conversation: Conversation }
  | { type: 'conversation/delete'; id: string }
  | { type: 'message/user'; conversationId: string; message: ChatMessage }
  | { type: 'message/assistant'; conversation: Conversation; message: ChatMessage }
  | { type: 'message/error'; conversationId: string }
  | { type: 'stream/start' }
  | { type: 'stream/stop' }
  | { type: 'indexing/done' }

const initialState: ChatState = {
  conversations: [],
  accounts: [],
  messagesByConversation: {},
  activeConversationId: null,
  streaming: false,
  indexing: true,
}

const sortByRecent = (list: Conversation[]) =>
  [...list].sort((a, b) => +new Date(b.last_modified_at) - +new Date(a.last_modified_at))

function upsertConversation(
  conversations: Conversation[],
  conv: Conversation,
): Conversation[] {
  const exists = conversations.some((c) => c.id === conv.id)
  const next = exists
    ? conversations.map((c) => (c.id === conv.id ? conv : c))
    : [...conversations, conv]
  return sortByRecent(next)
}

function reducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'accounts/replace':
      return { ...state, accounts: action.accounts }
    case 'accounts/toggle':
      return {
        ...state,
        accounts: state.accounts.map((a) =>
          a.id === action.account.id ? action.account : a,
        ),
      }
    case 'conversations/set':
      return { ...state, conversations: sortByRecent(action.conversations) }
    case 'conversation/select':
      return {
        ...state,
        activeConversationId: action.id,
        messagesByConversation: {
          ...state.messagesByConversation,
          [action.id]: action.messages,
        },
      }
    case 'conversation/new':
      return {
        ...state,
        conversations: upsertConversation(state.conversations, action.conversation),
        activeConversationId: action.conversation.id,
        messagesByConversation: {
          ...state.messagesByConversation,
          [action.conversation.id]: [],
        },
      }
    case 'conversation/delete': {
      const { [action.id]: _removed, ...rest } = state.messagesByConversation
      return {
        ...state,
        conversations: state.conversations.filter((c) => c.id !== action.id),
        messagesByConversation: rest,
        activeConversationId:
          state.activeConversationId === action.id ? null : state.activeConversationId,
      }
    }
    case 'message/user': {
      const list = state.messagesByConversation[action.conversationId] ?? []
      return {
        ...state,
        messagesByConversation: {
          ...state.messagesByConversation,
          [action.conversationId]: [...list, action.message],
        },
      }
    }
    case 'message/assistant': {
      const list = state.messagesByConversation[action.message.conversation_id] ?? []
      return {
        ...state,
        conversations: upsertConversation(state.conversations, action.conversation),
        messagesByConversation: {
          ...state.messagesByConversation,
          [action.message.conversation_id]: [...list, action.message],
        },
      }
    }
    case 'message/error':
      return { ...state }
    case 'stream/start':
      return { ...state, streaming: true }
    case 'stream/stop':
      return { ...state, streaming: false }
    case 'indexing/done':
      return { ...state, indexing: false }
  }
}

interface ChatContextValue extends ChatState {
  refreshAccounts: () => Promise<void>
  refreshConversations: () => Promise<void>
  selectConversation: (id: string) => Promise<void>
  newChat: () => Promise<void>
  deleteConversation: (id: string) => Promise<void>
  toggleAccount: (id: string, checked: boolean) => Promise<void>
  sendMessage: (content: string) => Promise<void>
}

const ChatContext = createContext<ChatContextValue | null>(null)

export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const stateRef = useRef(state)
  stateRef.current = state

  const refreshAccounts = useCallback(async () => {
    const accounts = await api.accounts.list()
    dispatch({ type: 'accounts/replace', accounts })
  }, [])

  const refreshConversations = useCallback(async () => {
    const conversations = await api.conversations.list()
    dispatch({ type: 'conversations/set', conversations })
  }, [])

  const selectConversation = useCallback(async (id: string) => {
    const messages = await api.conversations.get(id)
    dispatch({ type: 'conversation/select', id, messages })
  }, [])

  const newChat = useCallback(async () => {
    const conversation = await api.conversations.create()
    dispatch({ type: 'conversation/new', conversation })
  }, [])

  const deleteConversation = useCallback(async (id: string) => {
    await api.conversations.del(id)
    dispatch({ type: 'conversation/delete', id })
  }, [])

  const toggleAccount = useCallback(async (id: string, _checked: boolean) => {
    const account = await api.accounts.toggle(id)
    dispatch({ type: 'accounts/toggle', account })
  }, [])

  const sendMessage = useCallback(async (content: string) => {
    const current = stateRef.current
    let conversationId = current.activeConversationId

    if (!conversationId) {
      const conversation = await api.conversations.create()
      dispatch({ type: 'conversation/new', conversation })
      conversationId = conversation.id
    }

    dispatch({
      type: 'message/user',
      conversationId,
      message: {
        id: `local_${Date.now()}`,
        conversation_id: conversationId,
        direction: 'user',
        content,
        status: 'sent',
        sources: null,
        created_at: new Date().toISOString(),
      },
    })
    dispatch({ type: 'stream/start' })
    try {
      const res = await api.chat.send({ conversation_id: conversationId, message: content })
      dispatch({ type: 'message/assistant', conversation: res.conversation, message: res.message })
    } catch {
      dispatch({ type: 'message/error', conversationId })
    } finally {
      dispatch({ type: 'stream/stop' })
    }
  }, [])

  // First-run bootstrap
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const [conversations, accounts] = await Promise.all([
        api.conversations.list(),
        api.accounts.list(),
      ])
      if (cancelled) return
      dispatch({ type: 'conversations/set', conversations })
      dispatch({ type: 'accounts/replace', accounts })
    })()
    const timer = setTimeout(() => dispatch({ type: 'indexing/done' }), 2400)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [])

  const activeMessages =
    (state.activeConversationId &&
      state.messagesByConversation[state.activeConversationId]) ||
    null

  const value = useMemo<ChatContextValue>(
    () => ({
      ...state,
      activeMessages,
      refreshAccounts,
      refreshConversations,
      selectConversation,
      newChat,
      deleteConversation,
      toggleAccount,
      sendMessage,
    }),
    [
      state,
      activeMessages,
      refreshAccounts,
      refreshConversations,
      selectConversation,
      newChat,
      deleteConversation,
      toggleAccount,
      sendMessage,
    ],
  )

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChat must be used within ChatProvider')
  return ctx
}