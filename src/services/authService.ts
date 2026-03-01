import bcrypt from 'bcryptjs'
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
  refreshTokenExpiry,
} from '@/lib/auth'
import { AuthError } from '@/lib/errors'
import { userRepository } from '@/repositories/userRepository'

export const authService = {
  async login(name: string, password: string) {
    const user = await userRepository.findByName(name)
    if (!user) throw new AuthError('Invalid credentials')

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) throw new AuthError('Invalid credentials')

    await userRepository.deleteExpiredRefreshTokens(user.id)

    const accessToken = signAccessToken({ sub: user.id, name: user.name, type: user.type })
    const { token: refreshToken, jti } = signRefreshToken(user.id)
    const tokenHash = hashToken(refreshToken)

    await userRepository.storeRefreshToken({
      userId: user.id,
      tokenHash,
      expiresAt: refreshTokenExpiry(),
    })

    return { accessToken, refreshToken, user: { id: user.id, name: user.name, type: user.type } }
  },

  async refresh(rawRefreshToken: string) {
    const payload = verifyRefreshToken(rawRefreshToken)
    const tokenHash = hashToken(rawRefreshToken)

    const stored = await userRepository.findRefreshToken(tokenHash)
    if (!stored || stored.expiresAt < new Date()) {
      throw new AuthError('Refresh token invalid or expired')
    }

    // Rotate: delete old token
    await userRepository.deleteRefreshToken(tokenHash)

    const user = await userRepository.findById(payload.sub)
    if (!user) throw new AuthError('User not found')

    const accessToken = signAccessToken({ sub: user.id, name: user.name, type: user.type })
    const { token: newRefreshToken } = signRefreshToken(user.id)
    const newHash = hashToken(newRefreshToken)

    await userRepository.storeRefreshToken({
      userId: user.id,
      tokenHash: newHash,
      expiresAt: refreshTokenExpiry(),
    })

    return { accessToken, refreshToken: newRefreshToken }
  },

  async logout(rawRefreshToken: string) {
    const tokenHash = hashToken(rawRefreshToken)
    await userRepository.deleteRefreshToken(tokenHash)
  },
}
