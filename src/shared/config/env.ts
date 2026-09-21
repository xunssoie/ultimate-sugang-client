import { z } from 'zod'

// 배포값 = 아래 스키마의 기본값. VITE_* 환경변수는 쓰지 않는다(보안 정책, D57) → Vercel 환경변수 0개.
// 로컬 dev 서버에서만 .env 의 접두사 없는 키로 덮어쓴다(vite.config.ts 가 주입, 프로덕션 빌드는 빈 객체).
declare const __DEV_OVERRIDES__: Record<string, string>

const emptyToUndefined = (v: unknown): unknown =>
  typeof v === 'string' && v.trim() === '' ? undefined : v

const EnvSchema = z
  .object({
    API_ADAPTER: z.preprocess(emptyToUndefined, z.enum(['mock', 'http']).default('mock')),
    API_BASE_URL: z.preprocess(emptyToUndefined, z.string().optional()),
    MOCK_FAIL: z.preprocess(emptyToUndefined, z.enum(['session']).optional()),
    CAPTCHA: z.preprocess(emptyToUndefined, z.enum(['on', 'off']).default('on')),
  })
  .refine((e) => e.API_ADAPTER !== 'http' || Boolean(e.API_BASE_URL), {
    message: 'API_ADAPTER=http 이면 API_BASE_URL 이 필수입니다 (03 §8)',
    path: ['API_BASE_URL'],
  })

export type Env = z.infer<typeof EnvSchema>

export const env: Env = EnvSchema.parse(__DEV_OVERRIDES__)
