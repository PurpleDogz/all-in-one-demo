import { z } from 'zod'
import { router, workspaceProcedure, workspaceAdminProcedure } from '../index'
import { workspaceService } from '@/services/workspaceService'
import { WorkspaceRole } from '@prisma/client'

const WorkspaceRoleEnum = z.enum(['viewer', 'maintainer', 'admin'])

export const workspacesRouter = router({
  listMembers: workspaceProcedure.query(async ({ ctx }) => {
    return workspaceService.listMembers(ctx.workspaceId)
  }),

  addMember: workspaceAdminProcedure
    .input(z.object({ userId: z.string(), role: WorkspaceRoleEnum }))
    .mutation(async ({ ctx, input }) => {
      return workspaceService.addMember(ctx.workspaceId, input.userId, input.role as WorkspaceRole)
    }),

  updateRole: workspaceAdminProcedure
    .input(z.object({ userId: z.string(), role: WorkspaceRoleEnum }))
    .mutation(async ({ ctx, input }) => {
      return workspaceService.updateRole(ctx.workspaceId, input.userId, input.role as WorkspaceRole)
    }),

  removeMember: workspaceAdminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return workspaceService.removeMember(ctx.workspaceId, input.userId)
    }),
})
