import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { AuthError } from './errors'

const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET!
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET!

export interface AccessTokenPayload {
  sub: string
  name: string
  type: string
}

export interface RefreshTokenPayload {
  sub: string
  jti: string
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: '7d' })
}

export function signRefreshToken(userId: string): { token: string; jti: string } {
  const jti = crypto.randomUUID()
  const token = jwt.sign({ sub: userId, jti } satisfies RefreshTokenPayload, REFRESH_SECRET, {
    expiresIn: '30d',
  })
  return { token, jti }
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    return jwt.verify(token, ACCESS_SECRET) as AccessTokenPayload
  } catch {
    throw new AuthError('Invalid or expired access token')
  }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    return jwt.verify(token, REFRESH_SECRET) as RefreshTokenPayload
  } catch {
    throw new AuthError('Invalid or expired refresh token')
  }
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function refreshTokenExpiry(): Date {
  const d = new Date()
  d.setDate(d.getDate() + 30)
  return d
}

export function extractBearerToken(authHeader: string | null): string {
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AuthError('Missing or invalid Authorization header')
  }
  return authHeader.slice(7)
}
