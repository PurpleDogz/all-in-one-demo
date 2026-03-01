# Beem

A personal finance tracker with multi-workspace tenancy, transaction classification, and CSV import support.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| API (RPC) | tRPC v11 + TanStack Query v5 |
| API (REST) | Next.js Route Handlers (`/api/v1/`) |
| ORM | Prisma 5 (PostgreSQL 16) |
| Auth | JWT access + refresh tokens |
| UI | React 18, Tailwind CSS, shadcn/ui, AG Grid, Recharts |
| Runtime | Node.js 25, TypeScript 5 |

## Getting Started

### Prerequisites

- Node.js 25+
- PostgreSQL 16 (or use Docker)

### Local setup (no Docker)

```bash
# 1. Install dependencies
make install

# 2. Configure environment
make env           # copies .env.example → .env
#    then edit .env and fill in secrets

# 3. Apply DB migrations and seed
make db-migrate
make db-seed

# 4. Start the dev server
make dev           # http://localhost:3000
```

### Docker setup

```bash
make env           # copies .env.example → .env (fill in secrets)
make up            # builds and starts app + postgres
```

For local development with hot reload and mounted source:

```bash
make dev-up
```

## Environment Variables

Copy `.env.example` to `.env` and fill in the secrets:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Used by the Docker postgres container |
| `ACCESS_TOKEN_SECRET` | Secret for signing JWT access tokens |
| `REFRESH_TOKEN_SECRET` | Secret for signing JWT refresh tokens |
| `NEXT_PUBLIC_APP_URL` | Public base URL (e.g. `http://localhost:3000`) |

## Commands

### Development

| Command | Description |
|---|---|
| `make dev` | Start Next.js dev server (logs to `./data/log/server.log`) |
| `make install` | Install npm dependencies |
| `make build-local` | Build for production locally |
| `make lint` | Run ESLint |
| `make lint-fix` | Run ESLint with auto-fix |
| `make typecheck` | TypeScript type check (no emit) |
| `make check` | Run lint + typecheck |

### Database

| Command | Description |
|---|---|
| `make db-migrate` | Apply pending migrations (production) |
| `make db-migrate-dev` | Create and apply a new migration interactively |
| `make db-seed` | Seed default workspace, admin user, and taxonomy |
| `make db-studio` | Open Prisma Studio |
| `make db-reset` | Drop and recreate DB, run migrations + seed (**destructive**) |
| `make generate` | Regenerate Prisma client after schema changes |
| `make restore FILE=...` | Restore DB from a `.sql.gz` backup |

### Docker

| Command | Description |
|---|---|
| `make up` | Start all containers (production mode, detached) |
| `make down` | Stop and remove containers |
| `make logs` | Tail all container logs |
| `make restart` | Restart the app container |
| `make dev-up` | Start with dev overrides (source mounted) |
| `make dev-down` | Stop dev containers |

### Utilities

| Command | Description |
|---|---|
| `make env` | Copy `.env.example` → `.env` (only if `.env` doesn't exist) |
| `make openapi` | Regenerate OpenAPI spec |
| `make clean` | Remove `.next` build artifacts |

## Architecture

### Multi-Tenancy

All data is scoped to a `Workspace`. Users belong to workspaces via `WorkspaceMember` with roles: `viewer | maintainer | admin`.

Workspace context is passed per-request via the `X-Workspace-Id` HTTP header (not embedded in the JWT), allowing workspace switching without re-authentication.

### tRPC Procedure Hierarchy

```
publicProcedure
  └── protectedProcedure        (requires valid JWT)
        └── workspaceProcedure        (requires X-Workspace-Id + membership)
              ├── maintainerProcedure       (role != viewer)
              └── workspaceAdminProcedure   (role == admin)
```

### Data Model

```
Workspace
  ├── WorkspaceMember[]     (userId + role)
  ├── TransactionType[]
  ├── TransactionGroup[]
  ├── TransactionClass[]    → belongs to Type + Group
  │     └── ClassifierRule[]  (regex + optional value/date constraints)
  ├── TransactionSource[]
  │     └── Transaction[]   (date, description, amount, classId?)
  └── TransactionSourceFile[]
```

### Classification Engine

`classificationService.reclassify()` runs automatically:
- After every CSV file import
- Via the internal cron endpoint: `POST /api/v1/internal/reclassify`

## Project Structure

```
prisma/
  schema.prisma       # DB schema (source of truth)
  seed.ts             # Seeds workspace, admin user, taxonomy
src/
  app/
    api/
      trpc/[trpc]/    # tRPC route handler
      v1/             # REST API routes
    (auth)/login/     # Login page
    (dashboard)/      # Protected pages
  components/
    layout/           # Sidebar, TopBar
    shared/           # Shared UI components
    ui/               # shadcn/ui primitives
    charts/           # Recharts wrappers
    grids/            # AG Grid wrappers
  domain/             # Pure business types/logic
  dtos/               # Zod validation schemas
  lib/                # Auth, Prisma client, tRPC client, utilities
  repositories/       # Prisma data access layer
  services/           # Business logic (classification, import, transactions)
  trpc/
    index.ts          # Context and procedure definitions
    appRouter.ts      # Root router
    routers/          # Feature routers
```

## After Schema Changes

```bash
make generate        # Regenerate Prisma client
make db-migrate-dev  # Create + apply migration
make db-seed         # Re-seed if taxonomy data changed
```
