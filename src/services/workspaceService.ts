import { WorkspaceRole } from '@prisma/client'
import { workspaceRepository } from '@/repositories/workspaceRepository'
import { NotFoundError } from '@/lib/errors'

export const workspaceService = {
  async listMembers(workspaceId: string) {
    return workspaceRepository.findMembers(workspaceId)
  },

  async addMember(workspaceId: string, userId: string, role: WorkspaceRole) {
    return workspaceRepository.addMember(workspaceId, userId, role)
  },

  async updateRole(workspaceId: string, userId: string, role: WorkspaceRole) {
    const membership = await workspaceRepository.findMembership(workspaceId, userId)
    if (!membership) throw new NotFoundError('WorkspaceMember', `${workspaceId}/${userId}`)
    return workspaceRepository.updateMemberRole(workspaceId, userId, role)
  },

  async removeMember(workspaceId: string, userId: string) {
    const membership = await workspaceRepository.findMembership(workspaceId, userId)
    if (!membership) throw new NotFoundError('WorkspaceMember', `${workspaceId}/${userId}`)
    return workspaceRepository.removeMember(workspaceId, userId)
  },
}
