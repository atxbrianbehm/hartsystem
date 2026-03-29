#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATABASE_URL="${DATABASE_URL:-postgres://postgres:postgres@localhost:5432/hartsystem}"

run_psql_stdin() {
  if command -v psql >/dev/null 2>&1; then
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1
    return
  fi

  if ! docker compose ps --status running postgres >/dev/null 2>&1; then
    echo "Postgres is not running. Start it with 'npm run db:up' first." >&2
    exit 1
  fi

  docker compose exec -T postgres psql \
    -U postgres \
    -d hartsystem \
    -v ON_ERROR_STOP=1
}

run_psql_stdin <<'SQL'
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
SQL

bash "$ROOT_DIR/scripts/db_migrate.sh"

echo "Database reset complete for $DATABASE_URL"
