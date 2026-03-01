import { z } from 'zod'
import { router, workspaceProcedure } from '../index'
import { groupRepository } from '@/repositories/classRepository'

export const groupsRouter = router({
  list: workspaceProcedure
    .input(z.object({ typeId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return groupRepository.findAll({ workspaceId: ctx.workspaceId, ...input })
    }),
})
