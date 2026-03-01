import { NextRequest, NextResponse } from 'next/server'
import { withAuth, apiError } from '@/lib/apiMiddleware'
import { userRepository } from '@/repositories/userRepository'
import { NotFoundError } from '@/lib/errors'

export const GET = withAuth(async (_req, user) => {
  try {
    const dbUser = await userRepository.findById(user.sub)
    if (!dbUser) throw new NotFoundError('User')
    return NextResponse.json({
      id: dbUser.id,
      name: dbUser.name,
      type: dbUser.type,
    })
  } catch (err) {
    return apiError(err)
  }
})
