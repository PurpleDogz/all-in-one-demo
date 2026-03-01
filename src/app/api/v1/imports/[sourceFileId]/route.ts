import { NextRequest, NextResponse } from 'next/server'
import { withAuth, apiError } from '@/lib/apiMiddleware'
import { sourceFileRepository } from '@/repositories/sourceRepository'
import { NotFoundError } from '@/lib/errors'

export const GET = withAuth(async (_req, _user, params) => {
  try {
    const id = params?.sourceFileId
    if (!id) throw new NotFoundError('SourceFile')
    const file = await sourceFileRepository.findById(id)
    if (!file) throw new NotFoundError('SourceFile', id)
    return NextResponse.json(file)
  } catch (err) {
    return apiError(err)
  }
})
