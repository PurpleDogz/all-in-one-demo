import { NextRequest, NextResponse } from 'next/server'
import { withAuth, apiError } from '@/lib/apiMiddleware'
import { transactionService } from '@/services/transactionService'
import { TransactionListQueryDto } from '@/dtos/transaction.dto'
import { workspaceRepository } from '@/repositories/workspaceRepository'

export const GET = withAuth(async (req, user) => {
  try {
    const workspaceId = req.headers.get('x-workspace-id')
    if (!workspaceId) return NextResponse.json({ error: { message: 'X-Workspace-Id header required' } }, { status: 400 })
    if (!(await workspaceRepository.findMembership(workspaceId, user.sub))) return NextResponse.json({ error: { message: 'Forbidden' } }, { status: 403 })

    const sp = Object.fromEntries(req.nextUrl.searchParams.entries())
    const query = TransactionListQueryDto.parse(sp)

    const result = await transactionService.list({
      workspaceId,
      startDate: query.start ? new Date(query.start) : undefined,
      endDate: query.end ? new Date(query.end) : undefined,
      typeId: query.t_type,
      groupId: query.t_group,
      classId: query.t_class,
      valueGt: query.value_gt,
      valueLt: query.value_lt,
      description: query.description,
      sourceId: query.source,
      cursor: query.cursor,
      limit: query.limit,
    })

    const data = result.data.map((tx) => ({
      id: tx.id,
      date: tx.date.toISOString().slice(0, 10),
      description: tx.description,
      amount: tx.amount.toFixed(2),
      sourceId: tx.sourceId,
      sourceName: tx.source.name,
      classId: tx.classId ?? null,
      className: tx.class?.name ?? null,
      groupId: tx.class?.groupId ?? null,
      groupName: tx.class?.group?.name ?? null,
      typeId: tx.class?.typeId ?? null,
      typeName: tx.class?.type?.name ?? null,
    }))

    return NextResponse.json({ data, nextCursor: result.nextCursor })
  } catch (err) {
    return apiError(err)
  }
})
