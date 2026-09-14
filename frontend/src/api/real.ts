import type {
  AccountSummary,
  Api,
  ApiResponse,
  ChatRequest,
  ChatResponse,
  Conversation,
  ChatMessage,
  ProviderInfo,
  UsageStats,
  UserProfile,
} from './types'

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers),
      },
    })
  } catch {
    throw new ApiError(0, 'Network error — is the backend running?')
  }

  let body: ApiResponse<T> | null = null
  try {
    body = (await res.json()) as ApiResponse<T>
  } catch {
    // non-JSON response
  }

  if (!res.ok || (body && !body.success)) {
    const message =
      body?.message ?? body?.errors ?? `Request failed with status ${res.status}`
    throw new ApiError(res.status, message)
  }
  return (body?.data ?? null) as T
}

export const realApi: Api = {
  auth: {
    me: () => request<UserProfile>('/auth/me'),
    logout: () => request<void>('/auth/logout', { method: 'POST' }),
  },

  users: {
    profile: () => request<UserProfile>('/users/me'),
    stats: () => request<UsageStats>('/users/me/stats'),
    delete: (confirm) =>
      request<void>('/users/me', { method: 'DELETE', body: JSON.stringify({ confirm }) }),
  },

  accounts: {
    providers: () => request<ProviderInfo[]>('/accounts/providers'),
    list: () => request<AccountSummary[]>('/accounts'),
    sync: (accountId) => request<void>(`/accounts/${accountId}/sync`, { method: 'POST' }),
    toggle: (accountId) =>
      request<AccountSummary>(`/accounts/${accountId}/toggle`, { method: 'PATCH' }),
    connect: (provider) =>
      request<{ redirect_url: string }>('/accounts/connect', {
        method: 'POST',
        body: JSON.stringify({ provider }),
      }),
  },

  conversations: {
    list: () => request<Conversation[]>('/conversations'),
    create: (title) =>
      request<Conversation>('/conversations', {
        method: 'POST',
        body: JSON.stringify({ title }),
      }),
    get: (id) => request<ChatMessage[]>(`/conversations/${id}`),
    del: (id) => request<void>(`/conversations/${id}`, { method: 'DELETE' }),
  },

  chat: {
    send: (req: ChatRequest) =>
      request<ChatResponse>('/chat', {
        method: 'POST',
        body: JSON.stringify(req),
      }),
  },

  support: {
    send: (payload) =>
      request<void>('/support', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },
}