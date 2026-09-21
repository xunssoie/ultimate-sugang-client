import axios, { AxiosHeaders, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import { setOffsetFromDateHeader } from '@/shared/api/serverTime'
import { env } from '@/shared/config/env'
import { useSessionStore } from '@/shared/session/store'

export const DEFAULT_TIMEOUT_MS = 10_000

// Bearer 접두사 없음 · 401 단일비행 재발급 → .claude/spec/convention/01_data.md §5
export const ACCESS_TOKEN_HEADER = 'access-token'

const PUBLIC_PATHS = ['/auth/login', '/auth/sign-up', '/auth/email-availability', '/auth/re-issue']

const isPublicPath = (url: string | undefined): boolean =>
  url !== undefined && PUBLIC_PATHS.some((path) => url.startsWith(path))

interface RetriableConfig extends InternalAxiosRequestConfig {
  retried?: boolean
}

export function createApiClient(
  baseURL: string,
  timeout: number = DEFAULT_TIMEOUT_MS,
): AxiosInstance {
  const client = axios.create({ baseURL, timeout })

  client.interceptors.request.use((config) => {
    const { accessToken } = useSessionStore.getState()
    if (accessToken !== null && !isPublicPath(config.url)) {
      config.headers = AxiosHeaders.from(config.headers)
      config.headers.set(ACCESS_TOKEN_HEADER, accessToken)
    }
    return config
  })

  client.interceptors.response.use(
    (response) => {
      setOffsetFromDateHeader(response.headers.date as string | undefined)
      return response
    },
    async (error: unknown) => {
      if (!axios.isAxiosError(error)) throw error
      if (error.response) setOffsetFromDateHeader(error.response.headers.date as string | undefined)

      const config = error.config as RetriableConfig | undefined
      const canRetry =
        error.response?.status === 401 &&
        config !== undefined &&
        config.retried !== true &&
        !isPublicPath(config.url)
      if (!canRetry || config === undefined) throw error

      const renewed = await reissueOnce(client)
      if (renewed === null) throw error

      config.retried = true
      config.headers = AxiosHeaders.from(config.headers)
      config.headers.set(ACCESS_TOKEN_HEADER, renewed)
      return client.request(config)
    },
  )

  return client
}

let reissueInFlight: Promise<string | null> | null = null

async function reissueOnce(client: AxiosInstance): Promise<string | null> {
  reissueInFlight ??= reissue(client).finally(() => {
    reissueInFlight = null
  })
  return reissueInFlight
}

async function reissue(client: AxiosInstance): Promise<string | null> {
  const expired = useSessionStore.getState().accessToken
  if (expired === null) return null
  try {
    const response = await client.post<unknown>('/auth/re-issue', undefined, {
      headers: { [ACCESS_TOKEN_HEADER]: expired },
    })
    const token = readAccessToken(response.data)
    if (token === null) return null
    useSessionStore.getState().setAccessToken(token)
    return token
  } catch {
    return null
  }
}

export function readAccessToken(data: unknown): string | null {
  if (typeof data !== 'object' || data === null) return null
  const token = (data as Record<string, unknown>).accessToken
  return typeof token === 'string' && token.length > 0 ? token : null
}

let sharedClient: AxiosInstance | null = null

export function getApiClient(): AxiosInstance {
  sharedClient ??= createApiClient(env.API_BASE_URL ?? '')
  return sharedClient
}
