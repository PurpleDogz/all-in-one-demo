import { NextRequest, NextResponse } from 'next/server'
import { withAuth, apiError } from '@/lib/apiMiddleware'
import { sourceRepository } from '@/repositories/sourceRepository'
import { workspaceRepository } from '@/repositories/workspaceRepository'

export const GET = withAuth(async (req, user) => {
  try {
    const workspaceId = req.headers.get('x-workspace-id')
    if (!workspaceId) return NextResponse.json({ error: { message: 'X-Workspace-Id header required' } }, { status: 400 })
    if (!(await workspaceRepository.findMembership(workspaceId, user.sub))) return NextResponse.json({ error: { message: 'Forbidden' } }, { status: 403 })

    const sources = await sourceRepository.findAllForWorkspace(workspaceId)
    return NextResponse.json({ data: sources })
  } catch (err) {
    return apiError(err)
  }
})

export const POST = withAuth(async (req, user) => {
  try {
    const workspaceId = req.headers.get('x-workspace-id')
    if (!workspaceId) return NextResponse.json({ error: { message: 'X-Workspace-Id header required' } }, { status: 400 })
    const membership = await workspaceRepository.findMembership(workspaceId, user.sub)
    if (!membership || membership.role === 'viewer') return NextResponse.json({ error: { message: 'Forbidden' } }, { status: 403 })

    const body = await req.json()
    const source = await sourceRepository.create({
      name: body.name,
      type: body.type ?? 'file',
      workspaceId,
    })
    return NextResponse.json(source, { status: 201 })
  } catch (err) {
    return apiError(err)
  }
})
