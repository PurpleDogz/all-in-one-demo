import { NextRequest, NextResponse } from 'next/server'
import { withAuth, apiError } from '@/lib/apiMiddleware'
import { groupRepository, typeRepository } from '@/repositories/classRepository'
import { workspaceRepository } from '@/repositories/workspaceRepository'

export const GET = withAuth(async (req, user) => {
  try {
    const workspaceId = req.headers.get('x-workspace-id')
    if (!workspaceId) return NextResponse.json({ error: { message: 'X-Workspace-Id header required' } }, { status: 400 })
    if (!(await workspaceRepository.findMembership(workspaceId, user.sub))) return NextResponse.json({ error: { message: 'Forbidden' } }, { status: 403 })

    const typeParam = req.nextUrl.searchParams.get('t_type')
    const typeRecord = typeParam ? await typeRepository.findByName(typeParam, workspaceId) : null
    const groups = await groupRepository.findAll({ workspaceId, ...(typeRecord ? { typeId: typeRecord.id } : {}) })
    return NextResponse.json({ data: groups })
  } catch (err) {
    return apiError(err)
  }
})
