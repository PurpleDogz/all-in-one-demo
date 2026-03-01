import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/services/authService'
import { apiError } from '@/lib/apiMiddleware'
import { AuthError } from '@/lib/errors'

export async function POST(req: NextRequest) {
  try {
    const cookieToken = req.cookies.get('refreshToken')?.value
    let rawToken = cookieToken

    if (!rawToken) {
      const body = await req.json().catch(() => ({}))
      rawToken = body.refreshToken
    }

    if (!rawToken) throw new AuthError('No refresh token provided')

    const { accessToken, refreshToken } = await authService.refresh(rawToken)

    const response = NextResponse.json({ accessToken })

    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60,
      path: '/api/v1/auth',
    })

    return response
  } catch (err) {
    return apiError(err)
  }
}
