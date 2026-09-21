import { getApiClient, readAccessToken } from '@/shared/api/client'
import { env } from '@/shared/config/env'

export interface LoginResult {
  accessToken: string | null
}

export async function authenticate(studentId: string, password: string): Promise<LoginResult> {
  if (env.API_ADAPTER !== 'http') return { accessToken: null }

  const response = await getApiClient().post<unknown>('/auth/login', { studentId, password })
  const accessToken = readAccessToken(response.data)
  if (accessToken === null) throw new Error('로그인 응답에 accessToken 이 없습니다')
  return { accessToken }
}
