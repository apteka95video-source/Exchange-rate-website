from __future__ import annotations

from datetime import date, datetime
from pathlib import Path

from openpyxl import load_workbook
from openpyxl.styles import Font, PatternFill
from openpyxl.worksheet.table import Table, TableStyleInfo


ROOT_DIR = Path(__file__).resolve().parents[1]
EXCEL_PATH = ROOT_DIR / "data" / "currency_rates.xlsx"
RAW_SHEET = "Лист2"
OUTPUT_SHEET = "currency_rates"
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
    "EURO": "Euro",
    "EUR": "Euro",
}


def format_date(value: object) -> str:
    if isinstance(value, datetime):
        return value.date().isoformat()

    if isinstance(value, date):
        return value.isoformat()

    return str(value)


def main() -> None:
    if not EXCEL_PATH.exists():
        raise FileNotFoundError(f"Missing Excel file: {EXCEL_PATH}")

    workbook = load_workbook(EXCEL_PATH)

    if RAW_SHEET not in workbook.sheetnames:
        raise ValueError(f"Missing source sheet: {RAW_SHEET}")

    if OUTPUT_SHEET in workbook.sheetnames:
        del workbook[OUTPUT_SHEET]

    raw_sheet = workbook[RAW_SHEET]
    output_sheet = workbook.create_sheet(OUTPUT_SHEET)
    source_name = raw_sheet["B1"].value or "Company calculated rate"
    currency_codes = [raw_sheet["B2"].value, raw_sheet["C2"].value]

    output_sheet.append(HEADERS)

    for row in raw_sheet.iter_rows(min_row=3, min_col=1, max_col=3, values_only=True):
        rate_date, usd_rate, euro_rate = row

        if not rate_date:
            continue

        for currency_code, rate in zip(currency_codes, [usd_rate, euro_rate]):
            if not currency_code or rate is None:
                continue

            normalized_code = "EUR" if str(currency_code).upper() == "EURO" else str(currency_code).upper()
            output_sheet.append(
                [
                    format_date(rate_date),
                    normalized_code,
                    CURRENCY_NAMES.get(str(currency_code).upper(), str(currency_code)),
                    float(rate),
                    float(rate),
                    str(source_name),
                    "Internal company calculated rate. Buy and sell are equal because the source table contains one rate.",
                ]
            )

    header_fill = PatternFill("solid", fgColor="0F766E")
    header_font = Font(color="FFFFFF", bold=True)

    for cell in output_sheet[1]:
        cell.fill = header_fill
        cell.font = header_font

    widths = [14, 12, 20, 12, 12, 18, 92]

    for index, width in enumerate(widths, start=1):
        output_sheet.column_dimensions[output_sheet.cell(1, index).column_letter].width = width

    output_sheet.freeze_panes = "A2"
    last_row = output_sheet.max_row

    if last_row > 1:
        table = Table(displayName="CurrencyRatesTable", ref=f"A1:G{last_row}")
        style = TableStyleInfo(name="TableStyleMedium4", showRowStripes=True)
        table.tableStyleInfo = style
        output_sheet.add_table(table)

    workbook.save(EXCEL_PATH)
    print(f"Prepared {last_row - 1} records in sheet '{OUTPUT_SHEET}'")


if __name__ == "__main__":
    main()
