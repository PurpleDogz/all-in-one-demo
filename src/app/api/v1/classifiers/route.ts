import { NextRequest, NextResponse } from 'next/server'
import { withAuth, apiError } from '@/lib/apiMiddleware'
import { classifierRepository } from '@/repositories/classifierRepository'
import { ClassifierRuleCreateDto } from '@/dtos/classifier.dto'
import { workspaceRepository } from '@/repositories/workspaceRepository'

export const GET = withAuth(async (req, user) => {
  try {
    const workspaceId = req.headers.get('x-workspace-id')
    if (!workspaceId) return NextResponse.json({ error: { message: 'X-Workspace-Id header required' } }, { status: 400 })
    if (!(await workspaceRepository.findMembership(workspaceId, user.sub))) return NextResponse.json({ error: { message: 'Forbidden' } }, { status: 403 })

    const classId = req.nextUrl.searchParams.get('classId') ?? undefined
    const rules = await classifierRepository.findAll(workspaceId, classId)
    return NextResponse.json({ data: rules })
  } catch (err) {
    return apiError(err)
  }
})

export const POST = withAuth(async (req) => {
  try {
    const body = await req.json()
    const input = ClassifierRuleCreateDto.parse(body)
    const rule = await classifierRepository.create(input)
    return NextResponse.json(rule, { status: 201 })
  } catch (err) {
    return apiError(err)
  }
})
