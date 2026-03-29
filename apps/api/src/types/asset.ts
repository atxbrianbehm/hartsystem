export type CalibrationStatus =
  | 'ok'
  | 'warning'
  | 'due_soon'
  | 'overdue'
  | 'never_calibrated';

export type DamageStatus = 'ok' | 'reported' | 'under_repair';
export type AssetOwnership = 'owned' | 'rental' | 'rpo' | 'unknown';

export type AssetRow = {
  id: string;
  asset_number: string;
  part_number: string | null;
  serial_number: string | null;
  item_name: string;
  manufacturer: string | null;
  equipment_type: string;
  site_id: string;
  site_name: string;
  ownership: AssetOwnership;
  assigned_name: string | null;
  employee_number: string | null;
  vendor: string | null;
  firmware_version: string | null;
  latest_firmware_version: string | null;
  subscription_end_date: string | Date | null;
  last_calibration_date: string | Date | null;
  calibration_interval_days: number;
  next_calibration_due: string | Date | null;
  calibration_status: CalibrationStatus;
  damage_status: DamageStatus;
  damage_type: string | null;
  asset_notes: string | null;
  repair_notes: string | null;
  estimated_repair_cost: string;
  cost: string;
  replacement_cost: string;
  acquired_date: string | Date | null;
  source_sheet_name: string | null;
  source_row_number: number | null;
  created_at: string;
  updated_at: string;
};
