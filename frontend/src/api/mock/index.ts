import type {
  AccountSummary,
  Api,
  ChatMessage,
  ChatRequest,
  ChatResponse,
  Conversation,
  ProviderInfo,
  UserProfile,
} from '../types'
import {
  MOCK_ACCOUNTS,
  MOCK_ASSISTANT_REPLIES,
  MOCK_CONVERSATIONS,
  MOCK_MESSAGES,
  MOCK_PROVIDERS,
  MOCK_STATS,
  MOCK_USER,
} from './data'

const delay = (ms = 450) => new Promise((r) => setTimeout(r, ms + Math.random() * 400))
const uuid = () => `mock_${Math.random().toString(36).slice(2, 10)}`

let replyCursor = 0

/* mutable session state */
const conversations: Conversation[] = [...MOCK_CONVERSATIONS]
const messagesByConversation = new Map<string, ChatMessage[]>()

const loadMessages = (convId: string): ChatMessage[] => {
  let list = messagesByConversation.get(convId)
  if (!list) {
    list = MOCK_MESSAGES(convId)
    messagesByConversation.set(convId, list)
  }
  return list
}

const titleFor = (content: string) =>
  content.length > 42 ? content.slice(0, 42).trimEnd() + '…' : content

export const mockApi: Api = {
  auth: {
    async me(): Promise<UserProfile> {
      await delay(300)
      return { ...MOCK_USER }
    },
    async logout() {
      await delay(250)
    },
  },

  users: {
    async profile() {
      await delay(300)
      return { ...MOCK_USER }
    },
    async stats() {
      await delay(350)
      return { ...MOCK_STATS }
    },
    async delete(confirm: string) {
      await delay(500)
      if (confirm !== 'DELETE') throw new Error("Confirmation string does not match 'DELETE'")
      conversations.splice(0, conversations.length)
      messagesByConversation.clear()
    },
  },

  accounts: {
    async providers(): Promise<ProviderInfo[]> {
      await delay(250)
      return MOCK_PROVIDERS.map((p) => ({ ...p }))
    },
    async list(): Promise<AccountSummary[]> {
      await delay(300)
      return MOCK_ACCOUNTS.map((a) => ({ ...a }))
    },
    async sync() {
      await delay(400)
    },
    async toggle(accountId): Promise<AccountSummary> {
      await delay(500)
      const acc = MOCK_ACCOUNTS.find((a) => a.id === accountId)
      if (!acc) throw new Error('Account not found')
      acc.is_active = !acc.is_active
      return { ...acc }
    },
    async connect(): Promise<{ redirect_url: string }> {
      await delay(400)
      return { redirect_url: '/auth/callback' }
    },
  },

  conversations: {
    async list(): Promise<Conversation[]> {
      await delay(400)
      return [...conversations].sort(
        (a, b) => +new Date(b.last_modified_at) - +new Date(a.last_modified_at),
      )
    },
    async create(title?: string): Promise<Conversation> {
      await delay(400)
      const conv: Conversation = {
        id: uuid(),
        title: title ?? 'New chat',
        started_at: new Date().toISOString(),
        last_modified_at: new Date().toISOString(),
      }
      conversations.unshift(conv)
      messagesByConversation.set(conv.id, [])
      return { ...conv }
    },
    async get(id): Promise<ChatMessage[]> {
      await delay(350)
      return loadMessages(id).map((m) => ({ ...m, sources: m.sources ? [...m.sources] : null }))
    },
    async del(id) {
      await delay(300)
      const idx = conversations.findIndex((c) => c.id === id)
      if (idx >= 0) conversations.splice(idx, 1)
      messagesByConversation.delete(id)
    },
  },

  chat: {
    async send(req: ChatRequest): Promise<ChatResponse> {
      await delay(1400)
      let conv = conversations.find((c) => c.id === req.conversation_id)
      if (!conv) {
        conv = {
          id: req.conversation_id ?? uuid(),
          title: titleFor(req.message),
          started_at: new Date().toISOString(),
          last_modified_at: new Date().toISOString(),
        }
        conversations.unshift(conv)
        messagesByConversation.set(conv.id, [])
      }

      const now = new Date().toISOString()
      const userMsg: ChatMessage = {
        id: uuid(),
        conversation_id: conv.id,
        direction: 'user',
        content: req.message,
        status: 'sent',
        sources: null,
        created_at: now,
      }

      const reply = MOCK_ASSISTANT_REPLIES[replyCursor % MOCK_ASSISTANT_REPLIES.length]
      replyCursor += 1
      const assistantMsg: ChatMessage = {
        id: uuid(),
        conversation_id: conv.id,
        direction: 'assistant',
        content: reply.content,
        status: 'sent',
        sources: [...reply.sources],
        created_at: new Date(Date.now() + 2000).toISOString(),
      }

      const list = loadMessages(conv.id)
      list.push(userMsg, assistantMsg)
      conv.last_modified_at = now

      return { conversation: { ...conv }, message: { ...assistantMsg } }
    },
  },

  support: {
    async send() {
      await delay(900)
    },
  },
}