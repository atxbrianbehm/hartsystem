-- Local bootstrap auth only. Business data should come from Survey Asset Tracker.xlsx.
INSERT INTO users (full_name, email, password_hash, role, site_id)
VALUES (
  'Local Admin',
  'admin@fieldops.local',
  crypt('Password123!', gen_salt('bf')),
  'admin',
  NULL
)
ON CONFLICT (email) DO UPDATE
SET
  full_name = EXCLUDED.full_name,
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  site_id = EXCLUDED.site_id,
  is_active = TRUE,
  updated_at = NOW();
