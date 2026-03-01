import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken, extractBearerToken, AccessTokenPayload } from './auth'
import { toApiError } from './errors'

export function apiError(err: unknown): NextResponse {
  const { message, code, status } = toApiError(err)
  return NextResponse.json({ error: { message, code } }, { status })
}

export function withAuth(
  handler: (req: NextRequest, user: AccessTokenPayload, params?: Record<string, string>) => Promise<NextResponse>,
) {
  return async (req: NextRequest, context?: { params?: Promise<Record<string, string>> }): Promise<NextResponse> => {
    try {
      const token = extractBearerToken(req.headers.get('authorization'))
      const user = verifyAccessToken(token)
      const params = context?.params ? await context.params : undefined
      return await handler(req, user, params)
    } catch (err) {
      return apiError(err)
    }
  }
}
