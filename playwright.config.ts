import { defineConfig } from '@playwright/test'

/**
 * step-8 QA 스모크(03 §9). `hooks/checks/smoke.sh` 가 `npx playwright test .claude/resource/smoke` 로 실행.
 * mock 어댑터의 dev 서버를 자동 기동(이미 떠 있으면 재사용). 각 테스트는 새 컨텍스트 → 인메모리 mock 이 초기 상태.
 */
const PORT = 5199

export default defineConfig({
  testDir: '.claude/resource/smoke',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1600, height: 1000 },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 60_000,
    // 배포 기본값은 CAPTCHA on(D57) — 스모크는 신청 흐름을 직접 누르므로 dev 덮어쓰기로 끈다
    env: { CAPTCHA: 'off' },
  },
})
