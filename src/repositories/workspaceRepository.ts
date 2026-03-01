import { prisma } from '@/lib/prisma'
import { WorkspaceRole } from '@prisma/client'

export const workspaceRepository = {
  async findById(id: string) {
    return prisma.workspace.findUnique({ where: { id } })
  },

  async findByName(name: string) {
    return prisma.workspace.findUnique({ where: { name } })
  },

  async findAll() {
    return prisma.workspace.findMany({ orderBy: { name: 'asc' } })
  },

  async create(name: string) {
    return prisma.workspace.create({ data: { name } })
  },

  async findFirstForUser(userId: string) {
    return prisma.workspaceMember.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: { workspaceId: true, role: true, workspace: { select: { name: true } } },
    })
  },

  async findMembership(workspaceId: string, userId: string) {
    return prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    })
  },

  async findMembers(workspaceId: string) {
    return prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: { select: { id: true, name: true, type: true } } },
      orderBy: { createdAt: 'asc' },
    })
  },

  async addMember(workspaceId: string, userId: string, role: WorkspaceRole) {
    return prisma.workspaceMember.create({ data: { workspaceId, userId, role } })
  },

  async updateMemberRole(workspaceId: string, userId: string, role: WorkspaceRole) {
    return prisma.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId, userId } },
      data: { role },
    })
  },

  async removeMember(workspaceId: string, userId: string) {
    return prisma.workspaceMember.delete({
      where: { workspaceId_userId: { workspaceId, userId } },
    })
  },
}
