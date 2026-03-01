import { z } from 'zod'
import { router, workspaceProcedure } from '../index'
import { classRepository } from '@/repositories/classRepository'

export const classesRouter = router({
  list: workspaceProcedure
    .input(z.object({ typeId: z.string().optional(), groupId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return classRepository.findAll({ workspaceId: ctx.workspaceId, ...input })
    }),
})
