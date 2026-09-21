import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// 로컬 dev 서버 전용 덮어쓰기 키(.env, 접두사 없음 — D57). 프로덕션 빌드는 읽지 않아 배포값은 src/shared/config/env.ts 기본값.
//   API_ADAPTER=mock|http · API_BASE_URL(http 일 때 필수, `/api/v1` 포함) · MOCK_FAIL=session · CAPTCHA=on|off
const DEV_OVERRIDE_KEYS = ['API_ADAPTER', 'API_BASE_URL', 'MOCK_FAIL', 'CAPTCHA']

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const loaded = command === 'serve' ? loadEnv(mode, process.cwd(), '') : {}
  const overrides = Object.fromEntries(
    DEV_OVERRIDE_KEYS.flatMap((key) => (loaded[key] ? [[key, loaded[key]]] : [])),
  )

  return {
    plugins: [react()],
    define: { __DEV_OVERRIDES__: JSON.stringify(overrides) },
    resolve: {
      // 03 §7-3: 절대경로 alias `@/` 만 사용(rules/architecture.md)
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
  }
})
