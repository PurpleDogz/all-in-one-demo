import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/services/authService'
import { apiError } from '@/lib/apiMiddleware'

export async function POST(req: NextRequest) {
  try {
    const cookieToken = req.cookies.get('refreshToken')?.value
    const body = await req.json().catch(() => ({}))
    const rawToken = cookieToken ?? body.refreshToken

    if (rawToken) {
      await authService.logout(rawToken)
    }

    const response = NextResponse.json({ ok: true })
    response.cookies.delete('refreshToken')
    return response
  } catch (err) {
    return apiError(err)
  }
}
