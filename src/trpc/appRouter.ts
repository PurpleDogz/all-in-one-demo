import { router } from './index'
import { transactionsRouter } from './routers/transactions'
import { groupsRouter } from './routers/groups'
import { classesRouter } from './routers/classes'
import { classifiersRouter } from './routers/classifiers'
import { sourcesRouter } from './routers/sources'
import { workspacesRouter } from './routers/workspaces'

export const appRouter = router({
  transactions: transactionsRouter,
  groups: groupsRouter,
  classes: classesRouter,
  classifiers: classifiersRouter,
  sources: sourcesRouter,
  workspaces: workspacesRouter,
})

export type AppRouter = typeof appRouter
