import { z } from 'zod'

export const ImportResultDto = z.object({
  inserted: z.number(),
  skipped: z.number(),
  sourceId: z.string(),
  sourceFileId: z.string(),
  classifiedFrom: z.string().optional(),
})

export type ImportResult = z.infer<typeof ImportResultDto>
