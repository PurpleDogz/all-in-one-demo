import { router, workspaceProcedure } from '../index'
import { sourceRepository, sourceFileRepository } from '@/repositories/sourceRepository'

export const sourcesRouter = router({
  list: workspaceProcedure.query(async ({ ctx }) => {
    return sourceRepository.findAllForWorkspace(ctx.workspaceId)
  }),

  imports: workspaceProcedure.query(async ({ ctx }) => {
    return sourceFileRepository.findAllForWorkspace(ctx.workspaceId)
  }),
})
