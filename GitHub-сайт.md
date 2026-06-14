**GitHub-сайт**


```text
Excel → JSON → GitHub repository → GitHub Pages → сайт з курсами валют
```

## Що саме робимо

Маленький проєкт:

```text
currency-rates-github-pages/
├── data/
│   ├── currency_rates.xlsx
│   └── currency_rates.json
├── scripts/
│   └── convert_excel_to_json.py
├── index.html
├── style.css
├── app.js
└── README.md
```

Тут навіть **React не потрібен**. Для демо краще зробити простий сайт:

- `index.html` — структура сторінки;
- `style.css` — дизайн;
- `app.js` — читає `data/currency_rates.json` і показує таблицю;
- `currency_rates.xlsx` — джерело даних;
- `currency_rates.json` — файл, який читає сайт.

GitHub Pages буде відкривати сайт прямо з репозиторію.

------

## Як це виглядає для презентації

### 1. Є Excel-файл

```text
data/currency_rates.xlsx
```

Наприклад:

| date       | currency | name         | buy   | sell  |
| ---------- | -------- | ------------ | ----- | ----- |
| 2026-06-09 | USD      | US Dollar    | 40.20 | 40.75 |
| 2026-06-09 | EUR      | Euro         | 43.50 | 44.10 |
| 2026-06-09 | PLN      | Polish Zloty | 10.10 | 10.45 |

------

### 2. Excel конвертується в JSON

Команда:

```bash
python scripts/convert_excel_to_json.py
```

Отримуємо:

```text
data/currency_rates.json
```

------

### 3. Сайт читає JSON

У `app.js` сайт бере дані:

```javascript
fetch('./data/currency_rates.json')
```

І показує:

```text
Currency Rates Dashboard

USD | US Dollar | Buy 40.20 | Sell 40.75 | Spread 0.55
EUR | Euro      | Buy 43.50 | Sell 44.10 | Spread 0.60
PLN | Zloty     | Buy 10.10 | Sell 10.45 | Spread 0.35
```

------

### 4. Пушимо все на GitHub

```bash
git init
git add .
git commit -m "Initial currency rates dashboard"
git branch -M main
git remote add origin https://github.com/USERNAME/currency-rates-github-pages.git
git push -u origin main
```

------

### 5. Вмикаємо GitHub Pages

На GitHub:

```text
Repository → Settings → Pages
```

Далі:

```text
Source: Deploy from a branch
Branch: main
Folder: /root
Save
```

Після цього GitHub дасть посилання типу:

```text
https://USERNAME.github.io/currency-rates-github-pages/
```

І це вже буде живий сайт.

------

## Готове завдання для Codex

Ось коротке завдання, яке можна дати Codex:

```text
Create a small GitHub Pages project called currency-rates-github-pages.

The project should demonstrate this workflow:

Excel → JSON → GitHub repository → GitHub Pages website.

Requirements:

1. Create a simple static website without React or build tools.
2. Use these files:
   - index.html
   - style.css
   - app.js
   - data/currency_rates.xlsx
   - data/currency_rates.json
   - scripts/convert_excel_to_json.py
   - README.md

3. The Excel file should contain demo currency rates with columns:
   - date
   - currency
   - currency_name
   - buy_rate
   - sell_rate
   - source
   - comment

4. Create a Python script that converts:
   data/currency_rates.xlsx
   into:
   data/currency_rates.json

5. The website should load data from:
   ./data/currency_rates.json

6. The page should display:
   - title: Currency Rates Dashboard
   - short workflow explanation: Excel → JSON → GitHub Pages
   - summary cards:
     - number of currencies
     - average buy rate
     - average sell rate
     - latest update date
   - table with:
     - date
     - currency
     - currency name
     - buy rate
     - sell rate
     - spread
     - source
     - comment

7. Calculate spread in JavaScript:
   spread = sell_rate - buy_rate

8. Add:
   - search by currency code or currency name
   - filter by source
   - reset filters button
   - empty state message when no records match

9. Keep the design clean, simple, responsive, and suitable for a live demo.

10. Add README.md with instructions:
   - how to run the Excel to JSON conversion
   - how to open the website locally
   - how to push to GitHub
   - how to enable GitHub Pages

11. Do not use external frameworks.
12. Do not use Vite, React, or npm.
13. Keep the project small and easy to explain during a presentation.
```

------

## Чому GitHub Pages тут краще для демо

Для маленького проєкту це ідеально:

```text
немає Vercel
немає build step
немає npm
немає React
немає зайвої магії
```

Просто:

```text
GitHub repo = код + дані
GitHub Pages = сайт
```

## Демонстраційний сценарій

Показуєш так:

```text
1. Відкриваю Excel.
2. Змінюю курс USD.
3. Запускаю Python-конвертацію.
4. Отримую оновлений JSON.
5. Роблю git commit.
6. Push на GitHub.
7. Оновлюю GitHub Pages сайт.
8. Бачу новий курс на сайті.
```

Головна фраза для презентації:

```text
Ми використовуємо GitHub не тільки як сховище коду, а як платформу для публікації маленького сайту, який показує дані з Excel.
```

Це дуже хороший маленький проєкт для демонстрації `Folder → Git → GitHub → GitHub Pages → Codex`.