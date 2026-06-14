from __future__ import annotations

import json
from datetime import UTC, date, datetime
from pathlib import Path

from openpyxl import load_workbook


ROOT_DIR = Path(__file__).resolve().parents[1]
EXCEL_PATH = ROOT_DIR / "data" / "currency_rates.xlsx"
JSON_PATH = ROOT_DIR / "data" / "currency_rates.json"
DATA_SHEET = "currency_rates"
EXPECTED_COLUMNS = [
    "date",
    "currency",
    "currency_name",
    "buy_rate",
    "sell_rate",
    "source",
    "comment",
]


def format_date(value: object) -> str:
    if isinstance(value, datetime):
        return value.date().isoformat()

    if isinstance(value, date):
        return value.isoformat()

    return str(value)


def normalize_record(row: tuple[object, ...]) -> dict[str, str | float]:
    record = dict(zip(EXPECTED_COLUMNS, row))

    return {
        "date": format_date(record["date"]),
        "currency": str(record["currency"]),
        "currency_name": str(record["currency_name"]),
        "buy_rate": float(record["buy_rate"]),
        "sell_rate": float(record["sell_rate"]),
        "source": str(record["source"]),
        "comment": str(record["comment"] or ""),
    }


def main() -> None:
    if not EXCEL_PATH.exists():
        raise FileNotFoundError(f"Missing Excel file: {EXCEL_PATH}")

    workbook = load_workbook(EXCEL_PATH, data_only=True)

    if DATA_SHEET not in workbook.sheetnames:
        raise ValueError(f"Missing required sheet: {DATA_SHEET}")

    sheet = workbook[DATA_SHEET]
    headers = [cell.value for cell in sheet[1]]

    if headers[: len(EXPECTED_COLUMNS)] != EXPECTED_COLUMNS:
        raise ValueError(f"Expected columns {EXPECTED_COLUMNS}, found {headers}")

    records = []

    for row in sheet.iter_rows(min_row=2, max_col=len(EXPECTED_COLUMNS), values_only=True):
        if not any(value is not None for value in row):
            continue

        records.append(normalize_record(row))

    payload = {
        "source": "data/currency_rates.xlsx",
        "sheet": DATA_SHEET,
        "generated_at": datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "records": records,
    }

    JSON_PATH.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Converted {len(records)} records to {JSON_PATH}")


if __name__ == "__main__":
    main()
