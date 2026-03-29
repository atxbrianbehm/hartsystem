#!/usr/bin/env python3

import argparse
import json
import re
import zipfile
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import xml.etree.ElementTree as ET

MAIN_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
PACKAGE_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
OFFICE_REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
NS = {"a": MAIN_NS, "p": PACKAGE_NS}


def excel_serial_to_date(value: str) -> Optional[str]:
  if not value:
    return None

  if re.fullmatch(r"\d+(\.\d+)?", value):
    serial = float(value)
    if serial <= 0:
      return None
    return (datetime(1899, 12, 30) + timedelta(days=serial)).date().isoformat()

  for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%m/%d/%y"):
    try:
      return datetime.strptime(value, fmt).date().isoformat()
    except ValueError:
      continue

  return None


def parse_money(value: str) -> float:
  cleaned = (value or "").replace("$", "").replace(",", "").strip()
  if not cleaned or cleaned.upper() == "N/A":
    return 0.0

  try:
    return float(cleaned)
  except ValueError:
    return 0.0


def clean_text(value: str) -> str:
  return (value or "").strip()


def parse_sheet_name(sheet_name: str) -> Tuple[str, str]:
  cleaned = sheet_name.strip()
  if "_" not in cleaned:
    return "", cleaned
  code, label = cleaned.split("_", 1)
  return code.strip(), label.strip()


def to_camel_case(value: str) -> str:
  parts = [part for part in re.split(r"[^A-Za-z0-9]+", value) if part]
  if not parts:
    return ""
  head = parts[0].lower()
  tail = "".join(part[:1].upper() + part[1:] for part in parts[1:])
  return head + tail


def infer_equipment_type(item_name: str) -> str:
  lower = item_name.lower()

  if any(token in lower for token in ("office", "business center", "site prep", "subscription", "license")):
    return "Software"
  if any(token in lower for token in ("fc-6400", "fc-6000", "tablet", "controller", "toughbook")):
    return "Data Collector"
  if any(token in lower for token in ("hiper", "gnss", "receiver")):
    return "GNSS"
  if any(token in lower for token in ("radio", "450 mhz", "satel", "antenna", "lmr", "tnc")):
    return "Radio"
  if any(token in lower for token in ("laptop", "monitor", "desktop", "dock")):
    return "Computer"
  if any(
    token in lower
    for token in (
      "charger",
      "battery",
      "rod",
      "pole",
      "bipod",
      "tripod",
      "tribrach",
      "kit",
      "cable",
      "adapter",
      "case",
      "bracket",
      "backpack",
      "prism",
      "bag",
      "locater",
      "locator",
      "detector",
      "hammer",
    )
  ):
    return "Accessory"
  return "Equipment"


def determine_ownership(row: Dict[str, str]) -> str:
  if clean_text(row.get("F", "")).upper() == "X":
    return "Owned"
  if clean_text(row.get("E", "")).upper() == "X":
    return "Rental"
  if clean_text(row.get("G", "")).upper() == "X":
    return "RPO"
  return ""


def normalize_row(sheet_name: str, row: Dict[str, str], row_number: int, asset_id: int) -> Optional[Dict[str, object]]:
  asset_number = clean_text(row.get("M", ""))
  if not asset_number:
    return None

  manufacturer = clean_text(row.get("A", ""))
  item_name = clean_text(row.get("B", ""))
  serial_number = clean_text(row.get("D", ""))

  # The first Armadillo software row is shifted one column to the right.
  if (not item_name or item_name.isdigit()) and "office" in manufacturer.lower():
    match = re.match(r"^([A-Za-z0-9/&+ -]+?)\s+(Office.+)$", manufacturer)
    if match:
      manufacturer = match.group(1).strip()
      item_name = match.group(2).strip()
      serial_number = clean_text(row.get("B", ""))

  if not item_name:
    return None

  site_code, site_label = parse_sheet_name(sheet_name)
  site_key = to_camel_case(site_label)
  last_calibrated_date = excel_serial_to_date(clean_text(row.get("J", "")))
  subscription_end_date = excel_serial_to_date(clean_text(row.get("H", "")))
  cost = parse_money(clean_text(row.get("K", "")))
  replacement_cost = parse_money(clean_text(row.get("L", ""))) or cost
  vendor = clean_text(row.get("O", "")) or manufacturer
  notes = clean_text(row.get("N", ""))
  ownership = determine_ownership(row)

  return {
    "id": asset_id,
    "sourceRowNumber": row_number,
    "site": site_key,
    "siteDisplayName": site_label,
    "sourceSheetName": sheet_name.strip(),
    "siteCode": site_code,
    "siteLabel": site_label,
    "equipmentType": infer_equipment_type(item_name),
    "itemName": item_name,
    "assetNumber": asset_number,
    "partNumber": clean_text(row.get("C", "")),
    "serialNumber": serial_number,
    "firmware": clean_text(row.get("I", "")),
    "assignedName": "",
    "employeeNumber": "",
    "calibration": "Yes" if last_calibrated_date else "No",
    "acquiredDate": None,
    "vendor": vendor,
    "manufacturer": manufacturer,
    "cost": cost,
    "replacementCost": replacement_cost,
    "lastCalibratedDate": last_calibrated_date,
    "subscriptionEndDate": subscription_end_date,
    "notes": notes,
    "ownership": ownership,
  }


def load_xlsx_rows(workbook_path: Path) -> List[Tuple[str, List[Dict[str, str]]]]:
  sheets: List[Tuple[str, List[Dict[str, str]]]] = []

  with zipfile.ZipFile(workbook_path) as archive:
    shared_strings: List[str] = []
    if "xl/sharedStrings.xml" in archive.namelist():
      shared_root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
      for shared_item in shared_root.findall("a:si", {"a": MAIN_NS}):
        shared_strings.append("".join(text.text or "" for text in shared_item.iterfind(".//a:t", {"a": MAIN_NS})))

    workbook_root = ET.fromstring(archive.read("xl/workbook.xml"))
    rels_root = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
    rel_map = {rel.attrib["Id"]: rel.attrib["Target"] for rel in rels_root.findall("p:Relationship", NS)}

    for sheet in workbook_root.find("a:sheets", {"a": MAIN_NS}):
      sheet_name = sheet.attrib["name"]
      if sheet_name.strip() == "2026 Purchase":
        continue

      relation_id = sheet.attrib[f"{{{OFFICE_REL_NS}}}id"]
      target = Path("xl") / rel_map[relation_id]
      worksheet_root = ET.fromstring(archive.read(str(target)))

      rows: List[Dict[str, str]] = []
      for row in worksheet_root.findall(".//a:sheetData/a:row", {"a": MAIN_NS}):
        values: Dict[str, str] = {}
        for cell in row.findall("a:c", {"a": MAIN_NS}):
          reference = cell.attrib["r"]
          column = re.match(r"[A-Z]+", reference).group(0)
          cell_type = cell.attrib.get("t")
          raw_value = cell.find("a:v", {"a": MAIN_NS})
          value = "" if raw_value is None else raw_value.text or ""

          if cell_type == "s" and value:
            value = shared_strings[int(value)]
          elif cell_type == "inlineStr":
            inline = cell.find("a:is", {"a": MAIN_NS})
            value = "".join(text.text or "" for text in inline.iterfind(".//a:t", {"a": MAIN_NS})) if inline is not None else ""

          values[column] = value

        rows.append(values)

      sheets.append((sheet_name.strip(), rows))

  return sheets


def build_payload(workbook_path: Path) -> Dict[str, object]:
  equipment: List[Dict[str, object]] = []
  sites: List[Dict[str, object]] = []

  asset_id = 1
  for sheet_name, rows in load_xlsx_rows(workbook_path):
    site_assets: List[Dict[str, object]] = []
    for index, row in enumerate(rows[1:], start=2):
      normalized = normalize_row(sheet_name, row, index, asset_id)
      if normalized is None:
        continue
      equipment.append(normalized)
      site_assets.append(normalized)
      asset_id += 1

    site_code, site_label = parse_sheet_name(sheet_name)
    site_key = to_camel_case(site_label)
    sites.append(
      {
        "site": site_key,
        "siteDisplayName": site_label,
        "sourceSheetName": sheet_name,
        "siteCode": site_code,
        "siteLabel": site_label,
        "assetCount": len(site_assets),
        "hasSampleData": len(site_assets) > 0,
      }
    )

  populated_site_names = {site["site"] for site in sites if site["hasSampleData"]}
  summary = {
    "generatedAt": date.today().isoformat(),
    "sourceFile": workbook_path.name,
    "siteCount": len(sites),
    "populatedSiteCount": len(populated_site_names),
    "assetCount": len(equipment),
    "populatedSites": sorted(populated_site_names),
  }

  return {"summary": summary, "sites": sites, "equipment": equipment}


def main() -> None:
  parser = argparse.ArgumentParser(description="Normalize Survey Asset Tracker workbook data for the Retool dashboard.")
  parser.add_argument("workbook", nargs="?", default="Survey Asset Tracker.xlsx")
  parser.add_argument("--equipment-out", default="-")
  parser.add_argument("--sites-out", default="-")
  parser.add_argument("--summary-out", default="-")
  args = parser.parse_args()

  payload = build_payload(Path(args.workbook))
  outputs = [
    (args.equipment_out, payload["equipment"]),
    (args.sites_out, payload["sites"]),
    (args.summary_out, payload["summary"]),
  ]

  seen_paths = set()
  for output_path, _data in outputs:
    if output_path == "-":
      continue
    if output_path in seen_paths:
      raise SystemExit("Output paths must be unique.")
    seen_paths.add(output_path)

  for output_path, data in outputs:
    if output_path == "-":
      print(json.dumps(data, indent=2))
      continue
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    Path(output_path).write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
  main()
