import { httpApi } from '@/features/sukang/api/httpApi'
import { mockApi } from '@/features/sukang/api/mock/mockApi'
import type { SukangApi } from '@/features/sukang/api/types'
import { env } from '@/shared/config/env'

export function getAdapter(): SukangApi {
  return env.API_ADAPTER === 'http' ? httpApi : mockApi
}
