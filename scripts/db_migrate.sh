#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATABASE_URL="${DATABASE_URL:-postgres://postgres:postgres@localhost:5432/hartsystem}"
WORKBOOK_PATH="${WORKBOOK_PATH:-$ROOT_DIR/Survey Asset Tracker.xlsx}"

run_psql_file() {
  local sql_file="$1"

  if command -v psql >/dev/null 2>&1; then
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$sql_file"
    return
  fi

  if ! docker compose ps --status running postgres >/dev/null 2>&1; then
    echo "Postgres is not running. Start it with 'npm run db:up' first." >&2
    exit 1
  fi

  docker compose exec -T postgres psql \
    -U postgres \
    -d hartsystem \
    -v ON_ERROR_STOP=1 \
    -f - < "$sql_file"
}

run_psql_file "$ROOT_DIR/db/migrations/001_initial_schema.sql"
run_psql_file "$ROOT_DIR/db/migrations/002_seed_data.sql"

if [[ ! -f "$WORKBOOK_PATH" ]]; then
  echo "Workbook not found at $WORKBOOK_PATH" >&2
  exit 1
fi

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

python3 "$ROOT_DIR/scripts/import_survey_asset_tracker_sql.py" "$WORKBOOK_PATH" | run_psql_stdin

echo "Database migrations applied to $DATABASE_URL"
