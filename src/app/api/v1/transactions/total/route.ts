import { NextRequest, NextResponse } from 'next/server'
import { withAuth, apiError } from '@/lib/apiMiddleware'
import { transactionService } from '@/services/transactionService'
import { TransactionTotalQueryDto } from '@/dtos/transaction.dto'
import { typeRepository } from '@/repositories/classRepository'
import { workspaceRepository } from '@/repositories/workspaceRepository'

export const GET = withAuth(async (req, user) => {
  try {
    const workspaceId = req.headers.get('x-workspace-id')
    if (!workspaceId) return NextResponse.json({ error: { message: 'X-Workspace-Id header required' } }, { status: 400 })
    if (!(await workspaceRepository.findMembership(workspaceId, user.sub))) return NextResponse.json({ error: { message: 'Forbidden' } }, { status: 403 })

    const sp = Object.fromEntries(req.nextUrl.searchParams.entries())
    const query = TransactionTotalQueryDto.parse(sp)

    const typeRecord = query.t_type ? await typeRepository.findByName(query.t_type, workspaceId) : null

    const result = await transactionService.getTotal({
      workspaceId,
      period: query.period,
      typeId: typeRecord?.id,
    })

    return NextResponse.json(result)
  } catch (err) {
    return apiError(err)
  }
})
