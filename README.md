# currency-rates-github-pages

A small GitHub Pages demo for the workflow:

**Excel -> JSON -> GitHub repository -> GitHub Pages website**

The site is intentionally simple: no React, no build tools, no npm, and no external frameworks.

## Project Files

- `index.html` - page markup
- `style.css` - responsive styling
- `app.js` - loads JSON, calculates summary values, filters rows, and calculates spread
- `data/currency_rates.xlsx` - company-calculated Excel source data
- `data/currency_rates.json` - generated website data
- `scripts/prepare_currency_rates_workbook.py` - normalizes the source workbook
- `scripts/fetch_api_rates_to_excel.py` - fetches NBU and Minfin API rates
- `scripts/convert_excel_to_json.py` - Excel to JSON converter
- `README.md` - project instructions

## Prepare Excel Data

The source workbook contains company-calculated rates on the original sheet.
Before exporting JSON, normalize that sheet into the `currency_rates` sheet:

```bash
python scripts/prepare_currency_rates_workbook.py
```

The normalized sheet uses these columns:

```text
date, currency, currency_name, buy_rate, sell_rate, source, comment
```

For the current company-calculated source, the workbook contains one rate per
currency. The preparation script writes that value into both `buy_rate` and
`sell_rate` and explains this in the `comment` column.

## Convert Excel to JSON

Run the converter from the project root:

```bash
python scripts/convert_excel_to_json.py
```

The script reads:

```text
data/currency_rates.xlsx
```

and writes:

```text
data/currency_rates.json
```

## Planned API Sources

The next data layer can append external rates to the same normalized Excel
sheet before JSON export.

- NBU official exchange rates: use the National Bank of Ukraine JSON API by
  date, currency code, or date range.
- Minfin Mizhbank/interbank rates: use Minfin for Developers API. The API
  requires a private key, so keep it outside the repository.

All imported rows should still end up in:

```text
date, currency, currency_name, buy_rate, sell_rate, source, comment
```

Fetch NBU + Minfin interbank rates for USD and EUR:

```bash
set MINFIN_API_KEY=your_minfin_key_here
python scripts/fetch_api_rates_to_excel.py --date 2026-06-14 --currencies USD EUR
python scripts/convert_excel_to_json.py
```

Fetch only NBU rates, without a Minfin key:

```bash
python scripts/fetch_api_rates_to_excel.py --sources nbu --date 2026-06-14 --currencies USD EUR
python scripts/convert_excel_to_json.py
```

Minfin API examples documented by Minfin:

```text
https://api.minfin.com.ua/mb/[key]/
https://api.minfin.com.ua/mb/[key]/[YYYY-MM-DD]/
https://api.minfin.com.ua/mb/latest/[key]/?currency=[currency-code]
```

## Open Locally

Open `index.html` in a browser.

If your browser blocks loading local JSON files, start a small local server from the project root:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Push to GitHub

```bash
git init
git remote add origin https://github.com/apteka95video-source/Exchange-rate-website.git
git add .
git commit -m "Create currency rates GitHub Pages demo"
git branch -M main
git push -u origin main
```

If the repository is already initialized, skip `git init` and `git remote add origin`.

## Enable GitHub Pages

1. Open the GitHub repository.
2. Go to **Settings**.
3. Open **Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select the `main` branch and the `/root` folder.
6. Save the settings.

GitHub will publish the static website after the Pages workflow finishes.
