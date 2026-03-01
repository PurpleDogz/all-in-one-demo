import { NextRequest, NextResponse } from 'next/server'
import { withAuth, apiError } from '@/lib/apiMiddleware'
import { transactionService } from '@/services/transactionService'
import { TransactionSummaryQueryDto } from '@/dtos/transaction.dto'
import { classRepository, typeRepository, groupRepository } from '@/repositories/classRepository'
import { workspaceRepository } from '@/repositories/workspaceRepository'

export const GET = withAuth(async (req, user) => {
  try {
    const workspaceId = req.headers.get('x-workspace-id')
    if (!workspaceId) return NextResponse.json({ error: { message: 'X-Workspace-Id header required' } }, { status: 400 })
    if (!(await workspaceRepository.findMembership(workspaceId, user.sub))) return NextResponse.json({ error: { message: 'Forbidden' } }, { status: 403 })

    const sp = Object.fromEntries(req.nextUrl.searchParams.entries())
    const query = TransactionSummaryQueryDto.parse(sp)

    const [typeRecord, groupRecord, classRecord] = await Promise.all([
      query.t_type ? typeRepository.findByName(query.t_type, workspaceId) : null,
      query.t_group ? groupRepository.findByName(query.t_group, workspaceId) : null,
      query.t_class ? classRepository.findByName(query.t_class, workspaceId) : null,
    ])

    const rows = await transactionService.getSummary({
      workspaceId,
      period: query.period,
      typeId: typeRecord?.id,
      groupId: groupRecord?.id,
      classId: classRecord?.id,
      groupBy: query.group_by,
      groupPeriod: query.group_period,
    })

    return NextResponse.json({ data: rows })
  } catch (err) {
    return apiError(err)
  }
})
