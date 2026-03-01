import { z } from 'zod'
import { router, workspaceProcedure } from '../index'
import { transactionService } from '@/services/transactionService'
import { PeriodEnum, GroupByEnum, GroupPeriodEnum } from '@/dtos/transaction.dto'

export const transactionsRouter = router({
  list: workspaceProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        typeId: z.string().optional(),
        groupId: z.string().optional(),
        classId: z.string().optional(),
        sourceId: z.string().optional(),
        description: z.string().optional(),
        valueGt: z.number().optional(),
        valueLt: z.number().optional(),
        cursor: z.string().optional(),
        limit: z.number().min(1).max(500).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      return transactionService.list({
        workspaceId: ctx.workspaceId,
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        endDate: input.endDate ? new Date(input.endDate) : undefined,
        typeId: input.typeId,
        groupId: input.groupId,
        classId: input.classId,
        sourceId: input.sourceId,
        description: input.description,
        valueGt: input.valueGt,
        valueLt: input.valueLt,
        cursor: input.cursor,
        limit: input.limit,
      })
    }),

  byId: workspaceProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return transactionService.getById(input.id)
    }),

  summary: workspaceProcedure
    .input(
      z.object({
        period: PeriodEnum.default('12 Months'),
        typeId: z.string().optional(),
        groupId: z.string().optional(),
        classId: z.string().optional(),
        groupBy: GroupByEnum.default('group'),
        groupPeriod: GroupPeriodEnum.default('month'),
      }),
    )
    .query(async ({ ctx, input }) => {
      return transactionService.getSummary({
        workspaceId: ctx.workspaceId,
        period: input.period,
        typeId: input.typeId,
        groupId: input.groupId,
        classId: input.classId,
        groupBy: input.groupBy,
        groupPeriod: input.groupPeriod,
      })
    }),

  total: workspaceProcedure
    .input(
      z.object({
        period: PeriodEnum.default('12 Months'),
        typeId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return transactionService.getTotal({
        workspaceId: ctx.workspaceId,
        period: input.period,
        typeId: input.typeId,
      })
    }),

  kpi: workspaceProcedure
    .input(z.object({ period: PeriodEnum.default('12 Months') }))
    .query(async ({ ctx, input }) => {
      return transactionService.getKpiData(ctx.workspaceId, input.period)
    }),
})
