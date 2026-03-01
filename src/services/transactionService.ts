import { transactionRepository, TransactionFilters } from '@/repositories/transactionRepository'
import { classRepository, typeRepository } from '@/repositories/classRepository'
import { NotFoundError } from '@/lib/errors'
import { subMonths, startOfMonth, endOfMonth, startOfYear } from 'date-fns'

export type Period = '1 Month' | '3 Months' | '6 Months' | '12 Months' | '24 Months' | 'All'

export function periodToDateRange(period: Period): { startDate?: Date; endDate?: Date } {
  const now = new Date()
  if (period === 'All') return {}

  const months: Record<string, number> = {
    '1 Month': 1,
    '3 Months': 3,
    '6 Months': 6,
    '12 Months': 12,
    '24 Months': 24,
  }

  const n = months[period]
  return {
    startDate: subMonths(startOfMonth(now), n - 1),
    endDate: endOfMonth(now),
  }
}

export const transactionService = {
  async list(filters: TransactionFilters & { workspaceId: string }) {
    return transactionRepository.findMany(filters)
  },

  async getById(id: string) {
    const tx = await transactionRepository.findById(id)
    if (!tx) throw new NotFoundError('Transaction', id)
    return tx
  },

  async getSummary(params: {
    workspaceId: string
    period: Period
    typeId?: string
    groupId?: string
    classId?: string
    groupBy?: 'group' | 'class'
    groupPeriod?: 'month' | 'week' | 'year'
  }) {
    const dateRange = periodToDateRange(params.period)
    return transactionRepository.getSummaryByMonth({
      workspaceId: params.workspaceId,
      typeId: params.typeId,
      groupId: params.groupId,
      classId: params.classId,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      groupBy: params.groupBy,
      groupPeriod: params.groupPeriod,
    })
  },

  async getTotal(params: { workspaceId: string; period: Period; typeId?: string }) {
    const dateRange = periodToDateRange(params.period)
    return transactionRepository.getTotal({
      typeId: params.typeId,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      workspaceId: params.workspaceId,
    })
  },

  async getKpiData(workspaceId: string, period: Period) {
    const now = new Date()
    const dateRange = periodToDateRange(period)

    const debitType = await typeRepository.findByName('Debit Normal', workspaceId)
    const creditType = await typeRepository.findByName('Credit Normal', workspaceId)

    const [periodSpend, periodIncome, thisMonthSpend, ytdSpend] = await Promise.all([
      transactionRepository.getTotal({
        typeId: debitType?.id,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        workspaceId,
      }),
      transactionRepository.getTotal({
        typeId: creditType?.id,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        workspaceId,
      }),
      transactionRepository.getTotal({
        typeId: debitType?.id,
        startDate: startOfMonth(now),
        endDate: endOfMonth(now),
        workspaceId,
      }),
      transactionRepository.getTotal({
        typeId: debitType?.id,
        startDate: startOfYear(now),
        endDate: endOfMonth(now),
        workspaceId,
      }),
    ])

    // Previous month for MoM comparison
    const prevMonthStart = startOfMonth(subMonths(now, 1))
    const prevMonthEnd = endOfMonth(subMonths(now, 1))
    const prevMonthSpend = await transactionRepository.getTotal({
      typeId: debitType?.id,
      startDate: prevMonthStart,
      endDate: prevMonthEnd,
      workspaceId,
    })

    return {
      periodSpend: periodSpend.sum,
      periodIncome: periodIncome.sum,
      thisMonthSpend: thisMonthSpend.sum,
      ytdSpend: ytdSpend.sum,
      prevMonthSpend: prevMonthSpend.sum,
    }
  },
}
