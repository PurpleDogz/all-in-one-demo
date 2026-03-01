.PHONY: help up down logs build dev install db-migrate db-migrate-dev db-seed db-studio db-reset lint typecheck test clean restore

COMPOSE       = docker compose
COMPOSE_DEV   = docker compose -f docker-compose.yml -f docker-compose.override.yml
NPM           = npm
NPM_RUN       = npm run

## ────────────────────────────────────────────────────────────────
##  Help
## ────────────────────────────────────────────────────────────────
help: ## Show this help
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n\nTargets:\n"} \
	/^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

## ────────────────────────────────────────────────────────────────
##  Docker Compose (production-like)
## ────────────────────────────────────────────────────────────────
up: ## Start all containers (production mode, detached)
	$(COMPOSE) up -d --build

down: ## Stop and remove containers
	$(COMPOSE) down

logs: ## Tail logs for all services
	$(COMPOSE) logs -f

build: ## Build the app Docker image
	$(COMPOSE) build app

restart: ## Restart the app container
	$(COMPOSE) restart app

## ────────────────────────────────────────────────────────────────
##  Local Development (docker-compose.override.yml)
## ────────────────────────────────────────────────────────────────
dev-up: ## Start containers with local dev overrides (mounts src)
	$(COMPOSE_DEV) up -d

dev-down: ## Stop dev containers
	$(COMPOSE_DEV) down

dev-logs: ## Tail dev container logs
	$(COMPOSE_DEV) logs -f

## ────────────────────────────────────────────────────────────────
##  Local (no Docker) — requires local npm + Postgres
## ────────────────────────────────────────────────────────────────
install: ## Install dependencies
	$(NPM) install

dev: ## Run Next.js dev server locally (tee output to ./data/log)
	@mkdir -p data
	$(NPM_RUN) dev 2>&1 | tee ./data/log/server.log

## ────────────────────────────────────────────────────────────────
##  Database
## ────────────────────────────────────────────────────────────────
db-migrate: ## Apply pending migrations (production)
	$(NPM_RUN) db:migrate

db-migrate-dev: ## Create and apply a new migration interactively
	$(NPM_RUN) db:migrate:dev

db-seed: ## Seed the database with defaults
	$(NPM_RUN) db:seed

db-studio: ## Open Prisma Studio in browser
	$(NPM_RUN) db:studio

db-reset: ## Drop and recreate the database, run migrations + seed (DESTRUCTIVE)
	@echo "WARNING: This will destroy all data. Press Ctrl-C within 5s to abort."
	@sleep 5
	$(NPM) exec -- prisma migrate reset --force

restore: ## Restore DB from backup: make restore FILE=/path/to/backup.sql.gz
	@test -n "$(FILE)" || (echo "Usage: make restore FILE=/path/to/backup.sql.gz" && exit 1)
	./scripts/restore.sh "$(FILE)"

## ────────────────────────────────────────────────────────────────
##  Quality — Lint / Typecheck
## ────────────────────────────────────────────────────────────────
lint: ## Run ESLint
	$(NPM_RUN) lint

lint-fix: ## Run ESLint and auto-fix
	$(NPM_RUN) lint -- --fix src

typecheck: ## Run TypeScript compiler check (no emit)
	$(NPM) exec -- tsc --noEmit

check: lint typecheck ## Run all quality checks (lint + typecheck)

## ────────────────────────────────────────────────────────────────
##  Build
## ────────────────────────────────────────────────────────────────
build-local: ## Build Next.js app locally
	$(NPM_RUN) build

## ────────────────────────────────────────────────────────────────
##  Utilities
## ────────────────────────────────────────────────────────────────
generate: ## Regenerate Prisma client
	$(NPM_RUN) db:generate

openapi: ## Regenerate OpenAPI spec
	$(NPM_RUN) openapi

clean: ## Remove .next build artefacts
	rm -rf .next out

env: ## Copy .env.example to .env (only if .env doesn't exist)
	@test -f .env && echo ".env already exists" || (cp .env.example .env && echo "Created .env from .env.example — fill in secrets before running")
