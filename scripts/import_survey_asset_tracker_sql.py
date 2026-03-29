#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
from pathlib import Path

from import_survey_asset_tracker import build_payload


def sql_literal(value: object) -> str:
  if value is None:
    return "NULL"

  if isinstance(value, bool):
    return "TRUE" if value else "FALSE"

  if isinstance(value, (int, float)):
    return json.dumps(value)

  escaped = str(value).replace("'", "''")
  return f"'{escaped}'"


def text_or_none(value: object) -> str | None:
  if value is None:
    return None

  cleaned = str(value).strip()
  return cleaned or None


def calibration_status(last_calibrated_date: str | None) -> str:
  return "warning" if last_calibrated_date else "never_calibrated"


def normalize_ownership(value: str | None) -> str:
  if not value:
    return "unknown"

  lowered = value.strip().lower()
  if lowered == "owned":
    return "owned"
  if lowered == "rental":
    return "rental"
  if lowered == "rpo":
    return "rpo"
  return "unknown"


def emit_sql(workbook_path: Path) -> str:
  payload = build_payload(workbook_path)
  sites = payload["sites"]
  equipment = payload["equipment"]

  lines: list[str] = [
    "\\set ON_ERROR_STOP on",
    "BEGIN;",
    "",
    "-- Rebuild workbook-backed business data only.",
    "DELETE FROM assets;",
    "DELETE FROM sites;",
    "",
  ]

  for site in sites:
    site_code = text_or_none(site.get("siteCode"))
    site_label = text_or_none(site.get("siteLabel"))
    if not site_code or not site_label:
      continue

    lines.append(
      "INSERT INTO sites (name, code) "
      f"VALUES ({sql_literal(site_label)}, {sql_literal(site_code)}) "
      "ON CONFLICT (code) DO UPDATE "
      "SET name = EXCLUDED.name, updated_at = NOW();"
    )

  lines.append("")

  for asset in equipment:
    site_code = text_or_none(asset.get("siteCode"))
    asset_number = text_or_none(asset.get("assetNumber"))
    item_name = text_or_none(asset.get("itemName"))

    if not site_code or not asset_number or not item_name:
      continue

    part_number = text_or_none(asset.get("partNumber"))
    serial_number = text_or_none(asset.get("serialNumber"))
    equipment_type = text_or_none(asset.get("equipmentType")) or "Equipment"
    manufacturer = text_or_none(asset.get("manufacturer"))
    ownership = normalize_ownership(text_or_none(asset.get("ownership")))
    assigned_name = text_or_none(asset.get("assignedName"))
    employee_number = text_or_none(asset.get("employeeNumber"))
    vendor = text_or_none(asset.get("vendor"))
    firmware_version = text_or_none(asset.get("firmware"))
    subscription_end_date = text_or_none(asset.get("subscriptionEndDate"))
    last_calibrated_date = text_or_none(asset.get("lastCalibratedDate"))
    asset_notes = text_or_none(asset.get("notes"))
    cost = float(asset.get("cost") or 0)
    replacement_cost = float(asset.get("replacementCost") or cost or 0)
    acquired_date = text_or_none(asset.get("acquiredDate"))
    source_sheet_name = text_or_none(asset.get("sourceSheetName"))
    source_row_number = asset.get("sourceRowNumber")

    lines.append(
      "INSERT INTO assets ("
      "asset_number, part_number, serial_number, item_name, manufacturer, equipment_type, site_id, ownership, "
      "assigned_name, employee_number, vendor, firmware_version, latest_firmware_version, subscription_end_date, "
      "last_calibration_date, calibration_interval_days, next_calibration_due, calibration_status, "
      "damage_status, damage_type, asset_notes, repair_notes, estimated_repair_cost, cost, replacement_cost, acquired_date, "
      "source_sheet_name, source_row_number"
      ") VALUES ("
      f"{sql_literal(asset_number)}, "
      f"{sql_literal(part_number)}, "
      f"{sql_literal(serial_number)}, "
      f"{sql_literal(item_name)}, "
      f"{sql_literal(manufacturer)}, "
      f"{sql_literal(equipment_type)}, "
      f"(SELECT id FROM sites WHERE code = {sql_literal(site_code)}), "
      f"{sql_literal(ownership)}, "
      f"{sql_literal(assigned_name)}, "
      f"{sql_literal(employee_number)}, "
      f"{sql_literal(vendor)}, "
      f"{sql_literal(firmware_version)}, "
      f"{sql_literal(None)}, "
      f"{sql_literal(subscription_end_date)}, "
      f"{sql_literal(last_calibrated_date)}, "
      "30, "
      "NULL, "
      f"{sql_literal(calibration_status(last_calibrated_date))}, "
      f"{sql_literal('ok')}, "
      f"{sql_literal(None)}, "
      f"{sql_literal(asset_notes)}, "
      f"{sql_literal(None)}, "
      "0, "
      f"{sql_literal(cost)}, "
      f"{sql_literal(replacement_cost)}, "
      f"{sql_literal(acquired_date)}, "
      f"{sql_literal(source_sheet_name)}, "
      f"{sql_literal(source_row_number)}"
      ") "
      "ON CONFLICT (asset_number) DO UPDATE SET "
      "part_number = EXCLUDED.part_number, "
      "serial_number = EXCLUDED.serial_number, "
      "item_name = EXCLUDED.item_name, "
      "manufacturer = EXCLUDED.manufacturer, "
      "equipment_type = EXCLUDED.equipment_type, "
      "site_id = EXCLUDED.site_id, "
      "ownership = EXCLUDED.ownership, "
      "assigned_name = EXCLUDED.assigned_name, "
      "employee_number = EXCLUDED.employee_number, "
      "vendor = EXCLUDED.vendor, "
      "firmware_version = EXCLUDED.firmware_version, "
      "latest_firmware_version = EXCLUDED.latest_firmware_version, "
      "subscription_end_date = EXCLUDED.subscription_end_date, "
      "last_calibration_date = EXCLUDED.last_calibration_date, "
      "calibration_interval_days = EXCLUDED.calibration_interval_days, "
      "next_calibration_due = EXCLUDED.next_calibration_due, "
      "calibration_status = EXCLUDED.calibration_status, "
      "damage_status = EXCLUDED.damage_status, "
      "damage_type = EXCLUDED.damage_type, "
      "asset_notes = EXCLUDED.asset_notes, "
      "repair_notes = EXCLUDED.repair_notes, "
      "estimated_repair_cost = EXCLUDED.estimated_repair_cost, "
      "cost = EXCLUDED.cost, "
      "replacement_cost = EXCLUDED.replacement_cost, "
      "acquired_date = EXCLUDED.acquired_date, "
      "source_sheet_name = EXCLUDED.source_sheet_name, "
      "source_row_number = EXCLUDED.source_row_number, "
      "updated_at = NOW();"
    )

  lines.extend([
    "",
    "COMMIT;",
    "",
  ])
  return "\n".join(lines)


def main() -> None:
  parser = argparse.ArgumentParser(description="Emit SQL to load Survey Asset Tracker workbook data into Postgres.")
  parser.add_argument("workbook", nargs="?", default="Survey Asset Tracker.xlsx")
  parser.add_argument("--out", default="-")
  args = parser.parse_args()

  sql = emit_sql(Path(args.workbook))
  if args.out == "-":
    print(sql)
    return

  Path(args.out).write_text(sql, encoding="utf-8")


if __name__ == "__main__":
  main()
