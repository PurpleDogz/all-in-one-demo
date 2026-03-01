import { NextRequest, NextResponse } from 'next/server'
import { classificationService } from '@/services/classificationService'
import { apiError } from '@/lib/apiMiddleware'
import { AuthError } from '@/lib/errors'

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get('x-internal-secret')
    if (!secret || secret !== process.env.INTERNAL_JOB_SECRET) {
      throw new AuthError('Invalid internal secret')
    }

    const body = await req.json().catch(() => ({}))
    const fromDate = body.fromDate ? new Date(body.fromDate) : new Date('2000-01-01')
    const { workspaceId } = body

    if (!workspaceId || typeof workspaceId !== 'string') {
      return NextResponse.json({ error: { message: 'workspaceId is required in request body' } }, { status: 400 })
    }

    const result = await classificationService.reclassify(fromDate, workspaceId)
    return NextResponse.json(result)
  } catch (err) {
    return apiError(err)
  }
}
