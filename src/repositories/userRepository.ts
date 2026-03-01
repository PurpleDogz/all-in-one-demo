import { prisma } from '@/lib/prisma'

export const userRepository = {
  async findByName(name: string) {
    return prisma.user.findUnique({ where: { name } })
  },

  async findById(id: string) {
    return prisma.user.findUnique({ where: { id } })
  },

  async storeRefreshToken(data: { userId: string; tokenHash: string; expiresAt: Date }) {
    return prisma.refreshToken.create({ data })
  },

  async findRefreshToken(tokenHash: string) {
    return prisma.refreshToken.findUnique({ where: { tokenHash } })
  },

  async deleteRefreshToken(tokenHash: string) {
    return prisma.refreshToken.delete({ where: { tokenHash } }).catch(() => null)
  },

  async deleteExpiredRefreshTokens(userId: string) {
    return prisma.refreshToken.deleteMany({
      where: { userId, expiresAt: { lt: new Date() } },
    })
  },
}
