import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export interface TransactionFilters {
  workspaceId?: string
  sourceId?: string
  classId?: string
  groupId?: string
  typeId?: string
  startDate?: Date
  endDate?: Date
  valueGt?: number
  valueLt?: number
  description?: string
  cursor?: string
  limit?: number
}

export interface SummaryFilters {
  typeId?: string
  groupId?: string
  classId?: string
  startDate?: Date
  endDate?: Date
  groupBy?: 'group' | 'class'
  groupPeriod?: 'month' | 'week' | 'year'
}

const DEFAULT_LIMIT = 50

export const transactionRepository = {
  async findMany(filters: TransactionFilters) {
    const limit = filters.limit ?? DEFAULT_LIMIT
    const where = buildWhere(filters)

    const items = await prisma.transaction.findMany({
      where,
      include: {
        class: { include: { group: true, type: true } },
        source: true,
      },
      orderBy: [{ date: 'desc' }, { id: 'asc' }],
      take: limit + 1,
      ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
    })

    const hasMore = items.length > limit
    const data = hasMore ? items.slice(0, limit) : items
    const nextCursor = hasMore ? data[data.length - 1]?.id : undefined

    return { data, nextCursor }
  },

  async findById(id: string) {
    return prisma.transaction.findUnique({
      where: { id },
      include: {
        class: { include: { group: true, type: true } },
        source: true,
      },
    })
  },

  async findForClassification(fromDate: Date, workspaceId: string) {
    return prisma.transaction.findMany({
      where: {
        date: { gte: fromDate },
        source: { workspaceId },
      },
      select: { id: true, date: true, description: true, amount: true },
      orderBy: { date: 'asc' },
    })
  },

  async checkDuplicate(
    date: Date,
    description: string,
    amount: Prisma.Decimal,
    sourceId: string,
  ): Promise<boolean> {
    const existing = await prisma.transaction.findFirst({
      where: { date, description, amount, sourceId },
    })
    return !!existing
  },

  async insertMany(
    rows: Array<{
      date: Date
      description: string
      amount: Prisma.Decimal
      sourceId: string
    }>,
  ) {
    return prisma.transaction.createMany({ data: rows })
  },

  async updateClass(id: string, classId: string) {
    return prisma.transaction.update({ where: { id }, data: { classId } })
  },

  async updateManyClasses(updates: Array<{ id: string; classId: string }>) {
    await prisma.$transaction(
      updates.map((u) => prisma.transaction.update({ where: { id: u.id }, data: { classId: u.classId } })),
    )
  },

  async getTotal(filters: { typeId?: string; startDate?: Date; endDate?: Date; workspaceId?: string }) {
    const result = await prisma.transaction.aggregate({
      where: {
        ...(filters.typeId ? { class: { typeId: filters.typeId } } : {}),
        ...(filters.startDate || filters.endDate
          ? {
              date: {
                ...(filters.startDate ? { gte: filters.startDate } : {}),
                ...(filters.endDate ? { lte: filters.endDate } : {}),
              },
            }
          : {}),
        ...(filters.workspaceId ? { source: { workspaceId: filters.workspaceId } } : {}),
      },
      _sum: { amount: true },
      _count: true,
    })
    return { sum: result._sum.amount?.toFixed(2) ?? '0.00', count: result._count }
  },

  async getSummaryByMonth(filters: SummaryFilters & { workspaceId?: string }) {
    const where = buildSummaryWhere(filters)
    const rows = await prisma.$queryRaw<
      Array<{ period: string; group_name: string; class_name: string; total: string; tx_count: number }>
    >`
      SELECT
        TO_CHAR(t.date, 'YYYY-MM') as period,
        g.name as group_name,
        c.name as class_name,
        SUM(t.amount)::text as total,
        COUNT(t.id)::int as tx_count
      FROM "Transaction" t
      JOIN "TransactionClass" c ON t."classId" = c.id
      JOIN "TransactionGroup" g ON c."groupId" = g.id
      JOIN "TransactionType" ty ON c."typeId" = ty.id
      JOIN "TransactionSource" s ON t."sourceId" = s.id
      WHERE 1=1
        ${filters.workspaceId ? Prisma.sql`AND s."workspaceId" = ${filters.workspaceId}` : Prisma.empty}
        ${filters.typeId ? Prisma.sql`AND c."typeId" = ${filters.typeId}` : Prisma.empty}
        ${filters.groupId ? Prisma.sql`AND c."groupId" = ${filters.groupId}` : Prisma.empty}
        ${filters.classId ? Prisma.sql`AND t."classId" = ${filters.classId}` : Prisma.empty}
        ${filters.startDate ? Prisma.sql`AND t.date >= ${filters.startDate}` : Prisma.empty}
        ${filters.endDate ? Prisma.sql`AND t.date <= ${filters.endDate}` : Prisma.empty}
      GROUP BY period, group_name, class_name
      ORDER BY period ASC, group_name ASC, class_name ASC
    `
    return rows
  },

  async getEarliestDate(sourceId: string): Promise<Date | null> {
    const result = await prisma.transaction.findFirst({
      where: { sourceId },
      orderBy: { date: 'asc' },
      select: { date: true },
    })
    return result?.date ?? null
  },
}

function buildWhere(filters: TransactionFilters) {
  return {
    ...(filters.sourceId ? { sourceId: filters.sourceId } : {}),
    ...(filters.classId ? { classId: filters.classId } : {}),
    ...(filters.groupId ? { class: { groupId: filters.groupId } } : {}),
    ...(filters.typeId ? { class: { typeId: filters.typeId } } : {}),
    ...(filters.startDate || filters.endDate
      ? {
          date: {
            ...(filters.startDate ? { gte: filters.startDate } : {}),
            ...(filters.endDate ? { lte: filters.endDate } : {}),
          },
        }
      : {}),
    ...(filters.valueGt !== undefined ? { amount: { gt: new Prisma.Decimal(filters.valueGt) } } : {}),
    ...(filters.valueLt !== undefined ? { amount: { lt: new Prisma.Decimal(filters.valueLt) } } : {}),
    ...(filters.description
      ? { description: { contains: filters.description, mode: 'insensitive' as const } }
      : {}),
    ...(filters.workspaceId ? { source: { workspaceId: filters.workspaceId } } : {}),
  }
}

function buildSummaryWhere(filters: SummaryFilters) {
  return {
    ...(filters.typeId ? { class: { typeId: filters.typeId } } : {}),
    ...(filters.groupId ? { class: { groupId: filters.groupId } } : {}),
    ...(filters.classId ? { classId: filters.classId } : {}),
    ...(filters.startDate || filters.endDate
      ? {
          date: {
            ...(filters.startDate ? { gte: filters.startDate } : {}),
            ...(filters.endDate ? { lte: filters.endDate } : {}),
          },
        }
      : {}),
  }
}
