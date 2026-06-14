# currency-rates-github-pages

Простий сайт для аналізу і відстеження курсів валют.

Проєкт показує workflow:

```text
Excel -> NBU API -> JSON -> GitHub repository -> GitHub Pages website
```

Сайт без React, Vite, npm та зовнішніх фреймворків.

## Що показує сайт

Сайт порівнює два джерела курсів:

- `Міжбанк` - ваші вручну або самостійно розраховані курси з Excel.
- `НБУ API` - офіційний курс НБУ, підтягнутий через API.

Дані для сайту лежать у:

```text
data/currency_rates.json
```

Сайт читає саме JSON-файл, тому після зміни Excel треба знову згенерувати JSON.

## Файли проєкту

- `index.html` - структура сторінки.
- `style.css` - дизайн.
- `app.js` - завантаження JSON, фільтри, таблиця, порівняння.
- `data/currency_rates.xlsx` - Excel-файл з курсами.
- `data/currency_rates.json` - згенеровані дані для сайту.
- `scripts/prepare_currency_rates_workbook.py` - нормалізує Excel-таблицю.
- `scripts/fetch_api_rates_to_excel.py` - додає курси НБУ.
- `scripts/convert_excel_to_json.py` - конвертує Excel у JSON.

## Як оновлювати дані з Excel

Так, Excel можна поповнювати новими вручну розрахованими курсами.

Поточний файл має оригінальний аркуш `Лист2`, де є дати та курси валют.
Після редагування Excel запустіть:

```bash
python scripts/prepare_currency_rates_workbook.py
python scripts/convert_excel_to_json.py
```

Перший скрипт створює/оновлює аркуш `currency_rates` з колонками:

```text
date, currency, currency_name, buy_rate, sell_rate, source, comment
```

Другий скрипт створює оновлений:

```text
data/currency_rates.json
```

Після цього сайт буде показувати оновлені дані після commit і push на GitHub.

## Як додати курс НБУ

Наприклад, додати офіційний курс НБУ для USD та EUR за конкретну дату:

```bash
python scripts/fetch_api_rates_to_excel.py --date 2026-06-05 --currencies USD EUR
python scripts/convert_excel_to_json.py
```

Скрипт додає рядки з джерелом `НБУ API`.

## Як запустити сайт локально

З кореня проєкту:

```bash
python -m http.server 8000
```

Потім відкрити:

```text
http://localhost:8000
```

## Як опублікувати оновлення

Після зміни Excel, JSON або коду:

```bash
git add .
git commit -m "Update currency rates"
git push
```

GitHub Pages автоматично оновить сайт після push.

## GitHub Pages

У репозиторії GitHub:

```text
Settings -> Pages
```

Налаштування:

```text
Source: Deploy from a branch
Branch: main
Folder: /root
```
