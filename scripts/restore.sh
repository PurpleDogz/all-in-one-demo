#!/usr/bin/env bash
# Restore a PostgreSQL backup into the finance_db container.
# Usage: ./scripts/restore.sh /path/to/backup.sql.gz

set -euo pipefail

BACKUP_FILE="${1:-}"

if [[ -z "$BACKUP_FILE" ]]; then
  echo "Usage: $0 <backup-file.sql.gz>" >&2
  exit 1
fi

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "Error: backup file not found: $BACKUP_FILE" >&2
  exit 1
fi

# Load env from .env if present
if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

POSTGRES_USER="${POSTGRES_USER:-finance}"
POSTGRES_DB="${POSTGRES_DB:-finance}"
CONTAINER="${DB_CONTAINER:-finance-db-1}"

echo "Restoring ${BACKUP_FILE} to container ${CONTAINER} (db: ${POSTGRES_DB}, user: ${POSTGRES_USER})..."
gunzip -c "${BACKUP_FILE}" | docker exec -i "${CONTAINER}" psql -U "${POSTGRES_USER}" "${POSTGRES_DB}"
echo "Restore complete."
