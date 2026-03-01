import { z } from 'zod'
import { router, workspaceProcedure, maintainerProcedure } from '../index'
import { classifierRepository } from '@/repositories/classifierRepository'
import { classificationService } from '@/services/classificationService'
import { ClassifierRuleCreateDto, ClassifierRuleUpdateDto } from '@/dtos/classifier.dto'

export const classifiersRouter = router({
  list: workspaceProcedure
    .input(z.object({ classId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return classifierRepository.findAll(ctx.workspaceId, input?.classId)
    }),

  create: maintainerProcedure
    .input(ClassifierRuleCreateDto)
    .mutation(async ({ input }) => {
      return classifierRepository.create(input)
    }),

  update: maintainerProcedure
    .input(z.object({ id: z.string() }).merge(ClassifierRuleUpdateDto))
    .mutation(async ({ input }) => {
      const { id, ...data } = input
      return classifierRepository.update(id, data)
    }),

  delete: maintainerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return classifierRepository.delete(input.id)
    }),

  reclassify: maintainerProcedure
    .input(z.object({ fromDate: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const fromDate = input.fromDate ? new Date(input.fromDate) : new Date('2000-01-01')
      return classificationService.reclassify(fromDate, ctx.workspaceId)
    }),
})
