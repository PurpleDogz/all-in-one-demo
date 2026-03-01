import { z } from 'zod'

export const ClassifierRuleCreateDto = z.object({
  classId: z.string().min(1),
  regex: z.string().min(1),
  value: z.string().regex(/^\d+(\.\d{1,2})?$/).optional().nullable(),
  valueMin: z.string().regex(/^\d+(\.\d{1,2})?$/).optional().nullable(),
  valueMax: z.string().regex(/^\d+(\.\d{1,2})?$/).optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
})

export type ClassifierRuleCreate = z.infer<typeof ClassifierRuleCreateDto>

export const ClassifierRuleUpdateDto = ClassifierRuleCreateDto.partial()

export type ClassifierRuleUpdate = z.infer<typeof ClassifierRuleUpdateDto>

export const ClassifierRuleResponseDto = z.object({
  id: z.string(),
  classId: z.string(),
  className: z.string(),
  groupName: z.string(),
  regex: z.string(),
  value: z.string().nullable(),
  valueMin: z.string().nullable(),
  valueMax: z.string().nullable(),
  date: z.string().nullable(),
})

export type ClassifierRuleResponse = z.infer<typeof ClassifierRuleResponseDto>
