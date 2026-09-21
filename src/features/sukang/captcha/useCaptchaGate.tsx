import { useCallback, useState, type ReactNode } from 'react'
import { CaptchaModal } from '@/features/sukang/captcha/CaptchaModal'
import { newCaptchaAnswer } from '@/features/sukang/captcha/generateCaptcha'
import { CAPTCHA_TOTAL } from '@/features/sukang/captcha/texts'
import { env } from '@/shared/config/env'
import { useSessionStore } from '@/shared/session/store'

interface PendingChallenge {
  run: () => void
  answer: string
  showError: boolean
  attempt: number
}

export function useCaptchaGate(): { guard: (run: () => void) => void; modal: ReactNode } {
  const enabled = env.CAPTCHA === 'on'
  const fails = useSessionStore((s) => s.captchaFails)
  const recordCaptchaFail = useSessionStore((s) => s.recordCaptchaFail)
  const logout = useSessionStore((s) => s.logout)
  const [pending, setPending] = useState<PendingChallenge | null>(null)

  const guard = useCallback(
    (run: () => void) => {
      if (!enabled) {
        run()
        return
      }
      setPending({ run, answer: newCaptchaAnswer(), showError: false, attempt: 1 })
    },
    [enabled],
  )

  const onConfirm = (input: string) => {
    if (!pending) return
    if (input === pending.answer) {
      const { run } = pending
      setPending(null)
      run()
      return
    }
    const nextFails = recordCaptchaFail()
    if (nextFails >= CAPTCHA_TOTAL) {
      setPending(null)
      logout()
      return
    }
    setPending({
      run: pending.run,
      answer: newCaptchaAnswer(),
      showError: true,
      attempt: pending.attempt + 1,
    })
  }

  const modal = pending ? (
    <CaptchaModal
      key={pending.attempt}
      answer={pending.answer}
      remain={CAPTCHA_TOTAL - fails}
      showError={pending.showError}
      onConfirm={onConfirm}
      onClose={() => setPending(null)}
    />
  ) : null

  return { guard, modal }
}
