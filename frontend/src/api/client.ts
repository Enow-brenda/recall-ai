import type { RecallApi } from './types'
import { mockApi } from './mock'
import { realApi } from './real'

/**
 * SET `VITE_USE_MOCK_API` in `.env` (or `.env.local`):
 *   true  → in-memory fixtures, no backend needed (default)
 *   false → real HTTP calls to the Recall backend
 */
export const USE_MOCK_API: boolean =
  (import.meta.env.VITE_USE_MOCK_API as string | undefined) !== 'false'

export const api: RecallApi = USE_MOCK_API ? mockApi : realApi

export { ApiError } from './real'
export * from './types'