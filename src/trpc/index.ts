import { initTRPC, TRPCError } from '@trpc/server'
import { verifyAccessToken } from '@/lib/auth'
import { workspaceRepository } from '@/repositories/workspaceRepository'
import { WorkspaceRole } from '@prisma/client'
import superjson from 'superjson'
import { ZodError } from 'zod'

export interface Context {
  userId?: string
  userName?: string
  userType?: string
  workspaceId?: string
  workspaceRole?: WorkspaceRole
}

export async function createContext(
  authHeader: string | null | undefined,
  workspaceIdHeader: string | null | undefined,
): Promise<Context> {
  if (!authHeader?.startsWith('Bearer ')) return {}
  try {
    const token = authHeader.slice(7)
    const payload = verifyAccessToken(token)
    const ctx: Context = { userId: payload.sub, userName: payload.name, userType: payload.type }

    if (workspaceIdHeader && payload.sub) {
      const membership = await workspaceRepository.findMembership(workspaceIdHeader, payload.sub)
      if (membership) {
        ctx.workspaceId = membership.workspaceId
        ctx.workspaceRole = membership.role
      }
    }

    return ctx
  } catch {
    return {}
  }
}

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    }
  },
})

export const router = t.router
export const publicProcedure = t.procedure

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return next({ ctx: { ...ctx, userId: ctx.userId, userName: ctx.userName!, userType: ctx.userType! } })
})

export const workspaceProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.workspaceId || !ctx.workspaceRole) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'No workspace selected or not a member' })
  }
  return next({ ctx: { ...ctx, workspaceId: ctx.workspaceId, workspaceRole: ctx.workspaceRole } })
})

export const maintainerProcedure = workspaceProcedure.use(({ ctx, next }) => {
  if (ctx.workspaceRole === 'viewer') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Viewer role cannot perform this action' })
  }
  return next({ ctx })
})

export const workspaceAdminProcedure = workspaceProcedure.use(({ ctx, next }) => {
  if (ctx.workspaceRole !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin role required' })
  }
  return next({ ctx })
})
