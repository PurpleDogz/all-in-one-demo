import { NextRequest, NextResponse } from 'next/server'
import { withAuth, apiError } from '@/lib/apiMiddleware'
import { importService } from '@/services/importService'
import { sourceFileRepository } from '@/repositories/sourceRepository'
import { workspaceRepository } from '@/repositories/workspaceRepository'

function getWorkspaceId(req: NextRequest): string | null {
  return req.headers.get('x-workspace-id')
}

async function verifyMaintainer(workspaceId: string, userId: string) {
  const membership = await workspaceRepository.findMembership(workspaceId, userId)
  return membership && membership.role !== 'viewer' ? membership : null
}

export const POST = withAuth(async (req, user) => {
  try {
    const workspaceId = getWorkspaceId(req)
    if (!workspaceId) {
      return NextResponse.json({ error: { message: 'X-Workspace-Id header required' } }, { status: 400 })
    }
    if (!(await verifyMaintainer(workspaceId, user.sub))) {
      return NextResponse.json({ error: { message: 'Forbidden' } }, { status: 403 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: { message: 'No file uploaded' } }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const result = await importService.processUpload(file.name, buffer, workspaceId)

    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    return apiError(err)
  }
})

export const GET = withAuth(async (req, user) => {
  try {
    const workspaceId = getWorkspaceId(req)
    if (!workspaceId) {
      return NextResponse.json({ error: { message: 'X-Workspace-Id header required' } }, { status: 400 })
    }
    if (!(await workspaceRepository.findMembership(workspaceId, user.sub))) {
      return NextResponse.json({ error: { message: 'Forbidden' } }, { status: 403 })
    }

    const files = await sourceFileRepository.findAllForWorkspace(workspaceId)
    return NextResponse.json({ data: files })
  } catch (err) {
    return apiError(err)
  }
})
