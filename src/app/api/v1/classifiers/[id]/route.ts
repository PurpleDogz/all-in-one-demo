import { NextRequest, NextResponse } from 'next/server'
import { withAuth, apiError } from '@/lib/apiMiddleware'
import { classifierRepository } from '@/repositories/classifierRepository'
import { ClassifierRuleUpdateDto } from '@/dtos/classifier.dto'
import { NotFoundError } from '@/lib/errors'

export const PATCH = withAuth(async (req, _user, params) => {
  try {
    const id = params?.id
    if (!id) throw new NotFoundError('ClassifierRule')
    const body = await req.json()
    const input = ClassifierRuleUpdateDto.parse(body)
    const rule = await classifierRepository.update(id, input)
    return NextResponse.json(rule)
  } catch (err) {
    return apiError(err)
  }
})

export const DELETE = withAuth(async (_req, _user, params) => {
  try {
    const id = params?.id
    if (!id) throw new NotFoundError('ClassifierRule')
    await classifierRepository.delete(id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return apiError(err)
  }
})
