import { z } from 'zod'

export const LoginDto = z.object({
  name: z.string().min(1),
  password: z.string().min(1),
})

export type LoginInput = z.infer<typeof LoginDto>

export const RefreshDto = z.object({
  refreshToken: z.string().optional(),
})

export type RefreshInput = z.infer<typeof RefreshDto>
