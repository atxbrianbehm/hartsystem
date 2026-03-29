# Hart System Full Stack

PRD-aligned full-stack scaffold for the FieldOps Asset Dashboard.

## Stack

- Frontend: React + TypeScript + Vite
- Backend: Node.js + Express + TypeScript
- Database: PostgreSQL
- Auth: JWT + role-based access control

## Quick Start

1. Copy env values: `cp .env.example .env`
2. Install packages: `npm install`
3. Start PostgreSQL: `npm run db:up`
4. Create and seed schema: `npm run db:migrate`
5. Run API: `npm run dev -w @hartsystem/api`
6. Run web: `npm run dev -w @hartsystem/web`

For a one-command local start once Docker is installed:

`npm run dev:stack`

On Windows, the repo also includes a bootstrap script that can install missing Docker/PostgreSQL tooling with `winget`, start Docker Desktop, bring up Postgres, run migrations, and launch the app:

`npm run bootstrap:windows`

## Local Login

- Admin: `admin@fieldops.local` / `Password123!`

## Repo Layout

- `apps/api`: API routes, auth/RBAC middleware, business logic
- `apps/web`: role-aware dashboard UI and CRUD workflows
- `db/migrations`: schema and seed SQL
- `docs-api.md`: endpoint reference
- `scripts/import_survey_asset_tracker.py`: normalizes the Excel workbook into dashboard-friendly JSON
- `data/sampleEquipmentData.json`: generated Retool sample asset state
- `data/sampleSiteCatalog.json`: generated site inventory summary

## Current Scope

- Implemented: auth, `users/me`, sites API, asset CRUD, scan lookup endpoint, calibration status calculation, depreciation/current value, replacement recommendation flag.
- Next: camera barcode integration (`Html5-QRCode`), photo uploads, audit log writes, firmware source sync, pagination, automated tests.

## Workbook Import

`Survey Asset Tracker.xlsx` is the source of truth for local business data. Database setup imports workbook-derived sites/assets instead of demo seed rows.

To regenerate the Retool sample JSON from `Survey Asset Tracker.xlsx`:

```bash
python3 scripts/import_survey_asset_tracker.py \
  "Survey Asset Tracker.xlsx" \
  --equipment-out data/sampleEquipmentData.json \
  --sites-out data/sampleSiteCatalog.json \
  --summary-out -
```

## Database Helpers

- `npm run db:up`: starts local Postgres via Docker Compose
- `npm run db:migrate`: applies schema/bootstrap auth migrations, then imports workbook-backed sites/assets into `DATABASE_URL`
- `npm run db:reset`: drops and recreates the public schema, then reapplies migrations
