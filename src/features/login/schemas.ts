import { z } from 'zod'
import { env } from '@/shared/config/env'

const passwordField = env.API_ADAPTER === 'http' ? z.string().min(1) : z.string()

export const LoginFormSchema = z.object({
  studentId: z.string().trim().min(1),
  password: passwordField,
})
export type LoginForm = z.infer<typeof LoginFormSchema>
