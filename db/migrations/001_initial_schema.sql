CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'field_user', 'viewer');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE calibration_status AS ENUM ('ok', 'warning', 'due_soon', 'overdue', 'never_calibrated');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE damage_status AS ENUM ('ok', 'reported', 'under_repair');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE asset_ownership AS ENUM ('owned', 'rental', 'rpo', 'unknown');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL,
  site_id UUID REFERENCES sites(id),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_number TEXT NOT NULL UNIQUE,
  part_number TEXT,
  serial_number TEXT,
  item_name TEXT NOT NULL,
  manufacturer TEXT,
  equipment_type TEXT NOT NULL,
  site_id UUID NOT NULL REFERENCES sites(id),
  ownership asset_ownership NOT NULL DEFAULT 'unknown',
  assigned_name TEXT,
  employee_number TEXT,
  vendor TEXT,
  firmware_version TEXT,
  latest_firmware_version TEXT,
  subscription_end_date DATE,
  last_calibration_date DATE,
  calibration_interval_days INTEGER NOT NULL DEFAULT 30,
  next_calibration_due DATE,
  calibration_status calibration_status NOT NULL DEFAULT 'never_calibrated',
  damage_status damage_status NOT NULL DEFAULT 'ok',
  damage_type TEXT,
  asset_notes TEXT,
  repair_notes TEXT,
  estimated_repair_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  replacement_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  acquired_date DATE,
  source_sheet_name TEXT,
  source_row_number INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  performed_by UUID REFERENCES users(id),
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO sites (name, code)
VALUES
  ('North Valley Site', 'NVS'),
  ('South Ridge Site', 'SRS'),
  ('East Plains Site', 'EPS')
ON CONFLICT DO NOTHING;
