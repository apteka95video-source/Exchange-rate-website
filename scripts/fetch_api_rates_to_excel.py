from __future__ import annotations

import argparse
import json
from datetime import UTC, date, datetime
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from openpyxl import load_workbook


ROOT_DIR = Path(__file__).resolve().parents[1]
EXCEL_PATH = ROOT_DIR / "data" / "currency_rates.xlsx"
DATA_SHEET = "currency_rates"
HEADERS = [
    "date",
    "currency",
    "currency_name",
    "buy_rate",
    "sell_rate",
    "source",
    "comment",
]
CURRENCY_NAMES = {
    "USD": "US Dollar",
    "EUR": "Euro",
    "PLN": "Polish Zloty",
}
API_SOURCE = "НБУ API"


def request_json(url: str) -> object:
    request = Request(url, headers={"User-Agent": "currency-rates-github-pages/1.0"})

    with urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def fetch_nbu_rate(rate_date: date, currency: str) -> dict[str, str | float] | None:
    query = urlencode(
        {
            "valcode": currency,
            "date": rate_date.strftime("%Y%m%d"),
            "json": "",
        }
    )
    url = f"https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?{query}"
    payload = request_json(url)

    if not isinstance(payload, list) or not payload:
        return None

    item = payload[0]
    rate = float(item["rate"])

    return {
        "date": rate_date.isoformat(),
        "currency": currency,
        "currency_name": CURRENCY_NAMES.get(currency, str(item.get("txt", currency))),
        "buy_rate": rate,
        "sell_rate": rate,
        "source": API_SOURCE,
        "comment": f"Official NBU exchange rate fetched at {datetime.now(UTC).date().isoformat()}",
    }


def remove_existing_nbu_rows(sheet) -> None:
    for row_index in range(sheet.max_row, 1, -1):
        if sheet.cell(row_index, 6).value == API_SOURCE:
            sheet.delete_rows(row_index)


def append_records(records: list[dict[str, str | float]]) -> None:
    workbook = load_workbook(EXCEL_PATH)

    if DATA_SHEET not in workbook.sheetnames:
        raise ValueError(f"Missing required sheet: {DATA_SHEET}")

    sheet = workbook[DATA_SHEET]
    headers = [cell.value for cell in sheet[1]][: len(HEADERS)]

    if headers != HEADERS:
        raise ValueError(f"Expected columns {HEADERS}, found {headers}")

    remove_existing_nbu_rows(sheet)

    for record in records:
        sheet.append([record[column] for column in HEADERS])

    workbook.save(EXCEL_PATH)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Fetch NBU exchange rates into Excel.")
    parser.add_argument(
        "--date",
        default=date.today().isoformat(),
        help="Rate date in YYYY-MM-DD format. Defaults to today.",
    )
    parser.add_argument(
        "--currencies",
        nargs="+",
        default=["USD", "EUR"],
        help="Currency codes to fetch. Defaults to USD EUR.",
    )
    return parser.parse_args()


def main() -> None:
    if not EXCEL_PATH.exists():
        raise FileNotFoundError(f"Missing Excel file: {EXCEL_PATH}")

    args = parse_args()
    rate_date = datetime.strptime(args.date, "%Y-%m-%d").date()
    currencies = [currency.upper() for currency in args.currencies]
    records = []

    for currency in currencies:
        nbu_record = fetch_nbu_rate(rate_date, currency)

        if nbu_record:
            records.append(nbu_record)

    append_records(records)
    print(f"Added {len(records)} NBU API records to {EXCEL_PATH}")


if __name__ == "__main__":
    main()
