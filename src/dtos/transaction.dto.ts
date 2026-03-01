import { z } from 'zod'

export const TransactionListQueryDto = z.object({
  start: z.string().optional(),
  end: z.string().optional(),
  t_type: z.string().optional(),
  t_group: z.string().optional(),
  t_class: z.string().optional(),
  value_gt: z.coerce.number().optional(),
  value_lt: z.coerce.number().optional(),
  description: z.string().optional(),
  source: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(500).default(50),
})

export type TransactionListQuery = z.infer<typeof TransactionListQueryDto>

export const PeriodEnum = z.enum(['1 Month', '3 Months', '6 Months', '12 Months', '24 Months', 'All'])
export type Period = z.infer<typeof PeriodEnum>

export const GroupPeriodEnum = z.enum(['month', 'week', 'year'])
export type GroupPeriod = z.infer<typeof GroupPeriodEnum>

export const GroupByEnum = z.enum(['group', 'class'])
export type GroupBy = z.infer<typeof GroupByEnum>

export const TransactionSummaryQueryDto = z.object({
  period: PeriodEnum.default('12 Months'),
  group_period: GroupPeriodEnum.default('month'),
  t_type: z.string().optional(),
  t_group: z.string().optional(),
  t_class: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  group_by: GroupByEnum.default('group'),
})

export type TransactionSummaryQuery = z.infer<typeof TransactionSummaryQueryDto>

export const TransactionTotalQueryDto = z.object({
  period: PeriodEnum.default('12 Months'),
  t_type: z.string().optional(),
})

export type TransactionTotalQuery = z.infer<typeof TransactionTotalQueryDto>

export const TransactionResponseDto = z.object({
  id: z.string(),
  date: z.string(),
  description: z.string(),
  amount: z.string(),
  sourceId: z.string(),
  sourceName: z.string(),
  classId: z.string().nullable(),
  className: z.string().nullable(),
  groupId: z.string().nullable(),
  groupName: z.string().nullable(),
  typeId: z.string().nullable(),
  typeName: z.string().nullable(),
})

export type TransactionResponse = z.infer<typeof TransactionResponseDto>
