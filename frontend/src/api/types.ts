export type UUID = string
export type ISOString = string

/**
 * Generic API envelope returned by every backend endpoint.
 * Mirrors backend/app/schemas/common.py (ApiResponse).
 */
export interface ApiResponse<T> {
  success: boolean
  status_code: number
  message: string
  data: T | null
  errors?: string | null
  pagination?: Pagination | null
}

export interface Pagination {
  page: number
  page_size: number
  total_items: number
  total_pages: number
}

/* ------------------------------------------------------------------ */
/* Users                                                               */
/* ------------------------------------------------------------------ */

export interface PlanInfo {
  id: UUID
  name: string
  max_daily_queries: number
}

export interface UserProfile {
  id: UUID
  name: string | null
  primary_email: string
  profile_picture_url: string | null
  plan: PlanInfo
  plan_usage: number
  last_plan_reset: ISOString
  created_at: ISOString
}

export interface UsageStats {
  emails_indexed: number
  attachments: number
  links: number
  conversations: number
  messages_sent: number
  quota_used: number
  quota_limit: number
}

/* ------------------------------------------------------------------ */
/* Accounts & providers                                                */
/* ------------------------------------------------------------------ */

export interface ProviderInfo {
  key: string
  display_name: string
  auth_type: string
  is_active: boolean
}

export interface AccountSummary {
  id: UUID
  provider_key: string
  provider_display_name: string
  account_identifier: string
  display_label: string
  is_active: boolean
  connected_at: ISOString
}

/* ------------------------------------------------------------------ */
/* Conversations & chat                                                */
/* ------------------------------------------------------------------ */

export interface Conversation {
  id: UUID
  title: string
  started_at: ISOString
  last_modified_at: ISOString
}

export type MessageDirection = 'user' | 'assistant'
export type MessageStatus = 'pending' | 'sent' | 'error'

/** A single cited source pinned to an assistant answer. */
export interface Source {
  type: 'email' | 'attachment' | 'link'
  ref_id: UUID
  account_label?: string
  subject?: string
  sender?: string
  snippet: string
  url?: string
}

export interface ChatMessage {
  id: UUID
  conversation_id: UUID
  direction: MessageDirection
  content: string
  status: MessageStatus
  sources: Source[] | null
  created_at: ISOString
}

export interface ChatRequest {
  conversation_id?: UUID
  message: string
  account_ids?: UUID[]
}

export interface ChatResponse {
  conversation: Conversation
  message: ChatMessage
}

/* ------------------------------------------------------------------ */
/* Service interface — implemented by both mock and real client        */
/* ------------------------------------------------------------------ */

export interface Api {
  auth: {
    me: () => Promise<UserProfile>
    logout: () => Promise<void>
  }
  users: {
    profile: () => Promise<UserProfile>
    stats: () => Promise<UsageStats>
    delete: (confirm: string) => Promise<void>
  }
  accounts: {
    providers: () => Promise<ProviderInfo[]>
    list: () => Promise<AccountSummary[]>
    sync: (accountId: UUID) => Promise<void>
    toggle: (accountId: UUID) => Promise<AccountSummary>
    connect: (provider: string) => Promise<{ redirect_url: string }>
  }
  conversations: {
    list: () => Promise<Conversation[]>
    create: (title?: string) => Promise<Conversation>
    get: (id: UUID) => Promise<ChatMessage[]>
    del: (id: UUID) => Promise<void>
  }
  chat: {
    send: (req: ChatRequest) => Promise<ChatResponse>
  }
  support: {
    send: (payload: SupportRequest) => Promise<void>
  }
}

export interface SupportRequest {
  name?: string
  email?: string
  category?: string
  message: string
}

/** Public client surface exposed to components (narrower than `Api`). */
export interface RecallApi {
  auth: Api['auth']
  users: Api['users']
  accounts: Api['accounts']
  conversations: Api['conversations']
  chat: Api['chat']
  support: Api['support']
}