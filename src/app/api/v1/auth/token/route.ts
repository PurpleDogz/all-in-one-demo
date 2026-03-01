import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/services/authService'
import { LoginDto } from '@/dtos/auth.dto'
import { apiError } from '@/lib/apiMiddleware'
import { workspaceRepository } from '@/repositories/workspaceRepository'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const input = LoginDto.parse(body)
    const { accessToken, refreshToken, user } = await authService.login(input.name, input.password)

    const firstMembership = await workspaceRepository.findFirstForUser(user.id)

    const isMobile = req.nextUrl.searchParams.get('client') === 'mobile'

    const response = NextResponse.json({
      accessToken,
      user,
      workspaceId: firstMembership?.workspaceId ?? null,
      workspaceName: firstMembership?.workspace.name ?? null,
      ...(isMobile ? { refreshToken } : {}),
    })

    if (!isMobile) {
      response.cookies.set('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60,
        path: '/api/v1/auth',
      })
    }

    return response
  } catch (err) {
    return apiError(err)
  }
}
