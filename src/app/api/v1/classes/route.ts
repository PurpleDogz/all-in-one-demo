import { NextRequest, NextResponse } from 'next/server'
import { withAuth, apiError } from '@/lib/apiMiddleware'
import { classRepository, typeRepository, groupRepository } from '@/repositories/classRepository'
import { workspaceRepository } from '@/repositories/workspaceRepository'

export const GET = withAuth(async (req, user) => {
  try {
    const workspaceId = req.headers.get('x-workspace-id')
    if (!workspaceId) return NextResponse.json({ error: { message: 'X-Workspace-Id header required' } }, { status: 400 })
    if (!(await workspaceRepository.findMembership(workspaceId, user.sub))) return NextResponse.json({ error: { message: 'Forbidden' } }, { status: 403 })

    const typeParam = req.nextUrl.searchParams.get('t_type')
    const groupParam = req.nextUrl.searchParams.get('t_group')

    const [typeRecord, groupRecord] = await Promise.all([
      typeParam ? typeRepository.findByName(typeParam, workspaceId) : null,
      groupParam ? groupRepository.findByName(groupParam, workspaceId) : null,
    ])

    const classes = await classRepository.findAll({
      workspaceId,
      typeId: typeRecord?.id,
      groupId: groupRecord?.id,
    })

    return NextResponse.json({ data: classes })
  } catch (err) {
    return apiError(err)
  }
})
