# Beem — Claude Code Instructions

## Project Overview

**Beem** is a personal finance tracker built with Next.js 14 (App Router), tRPC v11, Prisma 5, and PostgreSQL. It supports multi-workspace tenancy where each workspace owns its own taxonomy and transaction data.

For full architectural detail see [`plan/finance-tracker-architecture.md`](plan/finance-tracker-architecture.md).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| API (RPC) | tRPC v11 + TanStack Query v5 |
| API (REST) | Next.js Route Handlers under `src/app/api/v1/` |
| Database ORM | Prisma 5 (PostgreSQL) |
| Auth | JWT access + refresh tokens (bcryptjs, jsonwebtoken) |
| UI | React 18, Tailwind CSS, shadcn/ui, Radix UI, AG Grid, Recharts |
| Runtime | Node.js 25, TypeScript 5 |
| Package manager | npm (not pnpm — `packageManager` field in package.json is stale) |

---

## Key Commands

```bash
make dev          # Start Next.js dev server; output teed to ./data/log/server.log
make install      # npm install
make build-local  # npm run build
make lint         # ESLint
make typecheck    # tsc --noEmit
make check        # lint + typecheck
make db-migrate   # prisma migrate deploy (production)
make db-seed      # ts-node prisma/seed.ts
make db-studio    # Prisma Studio
make generate     # Regenerate Prisma client
make openapi      # Regenerate OpenAPI spec
make up / down    # Docker Compose (production mode)
make dev-up       # Docker Compose with dev override (src mounted)
```

---

## Log File Monitoring

The dev server logs to `./data/log/server.log` (via `make dev`).
**Regularly check this file for errors** after making changes to the server, API routes, or services.

```bash
tail -f ./data/log/server.log
```

---

## Architecture

### Multi-Tenancy

All data is scoped to a `Workspace`. Users belong to workspaces via `WorkspaceMember` with role `viewer | maintainer | admin`.

- **Workspace context** is passed via `X-Workspace-Id` HTTP header (not embedded in JWT, so users can switch workspaces without re-auth).
- tRPC context (`src/trpc/index.ts`) resolves the membership on each request.

### tRPC Procedure Hierarchy

```
publicProcedure
  └── protectedProcedure      (requires valid JWT)
        └── workspaceProcedure      (requires X-Workspace-Id + valid membership)
              ├── maintainerProcedure     (role != viewer)
              └── workspaceAdminProcedure (role == admin)
```

### REST API Authentication

All v1 REST routes use `withAuth()` from `src/lib/apiMiddleware.ts` (verifies JWT) plus manual `X-Workspace-Id` header extraction and membership check via `workspaceRepository.findMembership()`.

---

## Directory Structure

```
prisma/
  schema.prisma         # Single source of truth for DB schema
  seed.ts               # Seeds Default workspace, admin user, taxonomy
  data/                 # JSON seed data files
src/
  app/
    api/
      trpc/[trpc]/      # tRPC route handler
      v1/               # REST API routes (auth, imports, transactions, etc.)
    (auth)/login/       # Login page
    (dashboard)/        # Protected dashboard pages
  components/
    layout/             # Sidebar, TopBar
    shared/             # Shared UI components
    ui/                 # shadcn/ui primitives
    charts/             # Recharts wrappers
    grids/              # AG Grid wrappers
  domain/               # Pure business types/logic (no DB)
  dtos/                 # Zod schemas for request validation
  lib/                  # Auth, prisma client, tRPC client, utilities
  repositories/         # Prisma data access layer
  services/             # Business logic (classification, import, transaction, workspace)
  trpc/
    index.ts            # Context, procedures
    appRouter.ts        # Root router
    routers/            # Feature routers
```

---

## Data Model Summary

```
Workspace
  ├── WorkspaceMember[]   (userId + role)
  ├── TransactionType[]   @@unique([workspaceId, name])
  ├── TransactionGroup[]  @@unique([workspaceId, name])
  ├── TransactionClass[]  @@unique([workspaceId, name])  → belongs to Type + Group
  ├── TransactionSource[] @@unique([workspaceId, name])
  └── TransactionSourceFile[]

TransactionClass
  └── ClassifierRule[]    (regex + optional value/date constraints)

TransactionSource
  └── Transaction[]       (date, description, amount, classId?)
```

`ClassifierRule` and `Transaction` inherit workspace scope through their parent relations (no direct `workspaceId` column).

---

## Common Gotchas

### Windows / Node.js 25 issues
- **JSON imports in `seed.ts`** require `with { type: 'json' }` (ESM strict mode in Node 25).
- **`prisma migrate dev`** requires an interactive TTY — use `prisma db push --force-reset` for dev resets.
- **EPERM on `prisma generate`** (Windows DLL lock): delete `node_modules/.prisma/client/query_engine-windows.dll.node` first.
- **npm scripts with JSON args** fail on Windows CMD with single-quoted JSON — use `package.json` config sections (e.g., `"ts-node"`) instead of inline `--compiler-options`.

### Schema changes
After editing `prisma/schema.prisma`:
1. `make generate` — regenerate Prisma client
2. `make db-migrate-dev` (or `prisma db push` in dev) — apply to DB
3. Re-run `make db-seed` if taxonomy data needs refreshing

### Classification engine
`classificationService.reclassify(fromDate, workspaceId)` is called:
- After every file import (`importService.processUpload`)
- By the internal cron endpoint `POST /api/v1/internal/reclassify` (accepts `{ workspaceId }` in body)

---

## Environment Variables

Key variables (see `.env.example`):

```
DATABASE_URL=postgresql://...
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Copy with `make env` (only creates `.env` if it doesn't already exist).
