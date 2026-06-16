const DATA_URL = "./data/currency_rates.json";
const EXCEL_SOURCE = "Міжбанк";
const DISPLAY_LIMIT = 10;

const state = {
  records: [],
  excelRecords: [],
  filters: {
    currency: "",
    dateFrom: "",
    dateTo: "",
    dateSearch: "",
  },
  showAllRows: false,
  chart: null,
};

const elements = {
  excelUsdRate: document.querySelector("#excelUsdRate"),
  excelUsdDate: document.querySelector("#excelUsdDate"),
  excelEurRate: document.querySelector("#excelEurRate"),
  excelEurDate: document.querySelector("#excelEurDate"),
  nbuUsdRate: document.querySelector("#nbuUsdRate"),
  nbuUsdDate: document.querySelector("#nbuUsdDate"),
  nbuEurRate: document.querySelector("#nbuEurRate"),
  nbuEurDate: document.querySelector("#nbuEurDate"),
  currencyFilter: document.querySelector("#currencyFilter"),
  dateFrom: document.querySelector("#dateFrom"),
  dateTo: document.querySelector("#dateTo"),
  dateSearch: document.querySelector("#dateSearch"),
  dateLookupPanel: document.querySelector("#dateLookupPanel"),
  resetButton: document.querySelector("#resetButton"),
  chartSubtitle: document.querySelector("#chartSubtitle"),
  ratesChart: document.querySelector("#ratesChart"),
  calcAmount: document.querySelector("#calcAmount"),
  calcCurrency: document.querySelector("#calcCurrency"),
  calcDate: document.querySelector("#calcDate"),
  calcResult: document.querySelector("#calcResult"),
  calcRateInfo: document.querySelector("#calcRateInfo"),
  tableRangeInfo: document.querySelector("#tableRangeInfo"),
  toggleRowsButton: document.querySelector("#toggleRowsButton"),
  tableBody: document.querySelector("#ratesTableBody"),
  emptyState: document.querySelector("#emptyState"),
};

async function init() {
  try {
    const response = await fetch(DATA_URL);

    if (!response.ok) {
      throw new Error(`Could not load ${DATA_URL}`);
    }

    const payload = await response.json();
    state.records = normalizeRecords(payload.records || []);
    state.excelRecords = state.records.filter((record) => record.source === EXCEL_SOURCE);

    setDefaultDateInputs();
    renderDashboard();
    fetchLatestNbuRates();
  } catch (error) {
    elements.emptyState.hidden = false;
    elements.emptyState.textContent = "Не вдалося завантажити JSON з курсами.";
    console.error(error);
  }
}

function normalizeRecords(records) {
  return records
    .map((record, index) => ({
      rowNumber: index + 2,
      date: String(record.date || ""),
      currency: normalizeCurrency(record.currency),
      currencyName: String(record.currency_name || ""),
      rate: Number(record.buy_rate),
      source: String(record.source || ""),
      comment: String(record.comment || ""),
    }))
    .filter((record) => record.date && record.currency && Number.isFinite(record.rate));
}

function normalizeCurrency(currency) {
  const value = String(currency || "").toUpperCase();
  return value === "EURO" ? "EUR" : value;
}

function setDefaultDateInputs() {
  const dates = state.excelRecords.map((record) => record.date).sort();
  const latestDate = dates.at(-1) || "";

  elements.calcDate.value = latestDate;
}

function renderDashboard() {
  const filteredExcelRecords = getFilteredExcelRecords();

  renderLatestExcelCards();
  renderDateLookup();
  renderChart(filteredExcelRecords);
  renderCalculator();
  renderTable(filteredExcelRecords);
}

function getFilteredExcelRecords() {
  const normalizedDateSearch = normalizeDateSearch(state.filters.dateSearch);
  const rawDateSearch = state.filters.dateSearch.trim();
  const fallbackDate =
    normalizedDateSearch && !hasExcelDate(normalizedDateSearch) ? findNearestDate(normalizedDateSearch) : "";

  return state.excelRecords.filter((record) => {
    const matchesCurrency = !state.filters.currency || record.currency === state.filters.currency;
    const matchesFrom = !state.filters.dateFrom || record.date >= state.filters.dateFrom;
    const matchesTo = !state.filters.dateTo || record.date <= state.filters.dateTo;
    const matchesSearch =
      !rawDateSearch ||
      (fallbackDate ? record.date === fallbackDate : false) ||
      (normalizedDateSearch ? record.date === normalizedDateSearch : record.date.includes(rawDateSearch));

    return matchesCurrency && matchesFrom && matchesTo && matchesSearch;
  });
}

function hasExcelDate(date) {
  return state.excelRecords.some((record) => record.date === date);
}

function normalizeDateSearch(value) {
  const query = value.trim();

  if (!query) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(query)) {
    return query;
  }

  const dateParts = query.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);

  if (!dateParts) {
    return "";
  }

  const [, day, month, year] = dateParts;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function renderDateLookup() {
  const query = state.filters.dateSearch.trim();
  const normalizedDate = normalizeDateSearch(query);

  elements.dateLookupPanel.classList.remove("success", "warning");

  if (!query) {
    elements.dateLookupPanel.innerHTML = `
      <span>Пошук курсу</span>
      <strong>Введіть дату</strong>
      <small>Наприклад: 10.10.2022</small>
    `;
    return;
  }

  if (!normalizedDate) {
    elements.dateLookupPanel.classList.add("warning");
    elements.dateLookupPanel.innerHTML = `
      <span>Пошук курсу</span>
      <strong>Невірний формат дати</strong>
      <small>Введіть дату як 10.10.2022 або 2022-10-10.</small>
    `;
    return;
  }

  const recordsForDate = state.excelRecords.filter((record) => record.date === normalizedDate);

  if (recordsForDate.length) {
    elements.dateLookupPanel.classList.add("success");
    elements.dateLookupPanel.innerHTML = `
      <span>Курс з Excel на ${escapeHtml(formatDisplayDate(normalizedDate))}</span>
      <strong>${formatLookupRates(recordsForDate)}</strong>
      <small>Знайдено ${recordsForDate.length} запис(и). Курс також показано на графіку.</small>
    `;
    return;
  }

  const nearbyDates = findNearbyDates(normalizedDate);
  const suggestionButtons = renderSuggestionButtons(nearbyDates);

  elements.dateLookupPanel.classList.add("warning");
  elements.dateLookupPanel.innerHTML = `
    <span>На дату ${escapeHtml(formatDisplayDate(normalizedDate))} курсу немає</span>
    <strong>Оберіть найближчу дату з Excel:</strong>
    ${suggestionButtons || "<small>У Excel немає доступних дат.</small>"}
  `;
}

function renderSuggestionButtons({ previous, next }) {
  const suggestions = [];

  if (previous) {
    suggestions.push(renderSuggestionButton("Попередня дата", previous));
  }

  if (next && next !== previous) {
    suggestions.push(renderSuggestionButton("Наступна дата", next));
  }

  if (!suggestions.length) {
    return "";
  }

  return `<div class="date-suggestions">${suggestions.join("")}</div>`;
}

function renderSuggestionButton(label, date) {
  const records = state.excelRecords.filter((record) => record.date === date);

  return `
    <button class="date-suggestion" type="button" data-date="${escapeHtml(date)}">
      <span>${escapeHtml(label)}: ${escapeHtml(formatDisplayDate(date))}</span>
      <strong>${formatLookupRates(records)}</strong>
    </button>
  `;
}

function formatLookupRates(records) {
  const byCurrency = new Map();

  for (const record of records) {
    byCurrency.set(record.currency, record.rate);
  }

  const parts = [];

  if (byCurrency.has("USD")) {
    parts.push(`USD ${formatRate(byCurrency.get("USD"))}`);
  }

  if (byCurrency.has("EUR")) {
    parts.push(`EUR ${formatRate(byCurrency.get("EUR"))}`);
  }

  return parts.length ? parts.join(" / ") : "Немає USD або EUR";
}

function findNearestDate(targetDate) {
  const { previous, next } = findNearbyDates(targetDate);

  if (!previous) {
    return next || "";
  }

  if (!next) {
    return previous;
  }

  const targetTime = dateToTime(targetDate);
  const previousDiff = Math.abs(dateToTime(previous) - targetTime);
  const nextDiff = Math.abs(dateToTime(next) - targetTime);

  return previousDiff <= nextDiff ? previous : next;
}

function findNearbyDates(targetDate) {
  const dates = [...new Set(state.excelRecords.map((record) => record.date))].sort();
  let previous = "";
  let next = "";

  for (const date of dates) {
    if (date < targetDate) {
      previous = date;
    }

    if (date > targetDate) {
      next = date;
      break;
    }
  }

  return { previous, next };
}

function dateToTime(date) {
  return new Date(`${date}T00:00:00`).getTime();
}

function formatDisplayDate(date) {
  const [year, month, day] = date.split("-");
  return `${day}.${month}.${year}`;
}

function renderLatestExcelCards() {
  const usdRecord = getLatestRecord(state.excelRecords, "USD");
  const eurRecord = getLatestRecord(state.excelRecords, "EUR");

  setRateCard(elements.excelUsdRate, elements.excelUsdDate, usdRecord);
  setRateCard(elements.excelEurRate, elements.excelEurDate, eurRecord);
}

function getLatestRecord(records, currency) {
  return records
    .filter((record) => record.currency === currency)
    .sort((a, b) => a.date.localeCompare(b.date))
    .at(-1);
}

function setRateCard(rateElement, dateElement, record) {
  if (!record) {
    rateElement.textContent = "-";
    dateElement.textContent = "Дата: немає даних";
    return;
  }

  rateElement.textContent = formatRate(record.rate);
  dateElement.textContent = `Дата: ${record.date}`;
}

async function fetchLatestNbuRates() {
  await Promise.all([fetchNbuRate("USD"), fetchNbuRate("EUR")]);
}

async function fetchNbuRate(currency) {
  const today = new Date();
  const apiDate = formatApiDate(today);
  const displayDate = today.toISOString().slice(0, 10);
  const url = `https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode=${currency}&date=${apiDate}&json`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`NBU request failed for ${currency}`);
    }

    const payload = await response.json();
    const item = Array.isArray(payload) ? payload[0] : null;

    if (!item) {
      throw new Error(`NBU has no ${currency} data for ${displayDate}`);
    }

    const rate = Number(item.rate);
    const rateDate = String(item.exchangedate || displayDate).split(".").reverse().join("-");

    if (currency === "USD") {
      elements.nbuUsdRate.textContent = formatRate(rate);
      elements.nbuUsdDate.textContent = `Дата НБУ: ${rateDate}`;
    } else {
      elements.nbuEurRate.textContent = formatRate(rate);
      elements.nbuEurDate.textContent = `Дата НБУ: ${rateDate}`;
    }
  } catch (error) {
    if (currency === "USD") {
      elements.nbuUsdRate.textContent = "-";
      elements.nbuUsdDate.textContent = `НБУ недоступний: ${displayDate}`;
    } else {
      elements.nbuEurRate.textContent = "-";
      elements.nbuEurDate.textContent = `НБУ недоступний: ${displayDate}`;
    }

    console.error(error);
  }
}

function formatApiDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function renderChart(records) {
  const labels = [...new Set(records.map((record) => record.date))].sort();
  const chartLabels = labels.length === 1 ? [labels[0], `${labels[0]} `] : labels;
  const usdData = buildSeries(chartLabels, records, "USD");
  const eurData = buildSeries(chartLabels, records, "EUR");
  const selectedCurrency = state.filters.currency;

  elements.chartSubtitle.textContent = labels.length
    ? labels.length === 1
      ? `Курс на дату: ${formatDisplayDate(labels[0])}`
      : `Період: ${labels[0]} - ${labels.at(-1)}`
    : "Немає даних для графіка за обраними фільтрами.";

  const datasets = [];

  if (!selectedCurrency || selectedCurrency === "USD") {
    datasets.push({
      label: "USD з Excel",
      data: usdData,
      borderColor: "#22c55e",
      backgroundColor: "rgba(34, 197, 94, 0.12)",
      tension: labels.length === 1 ? 0 : 0.25,
      spanGaps: true,
      pointRadius: labels.length > 120 ? 0 : 3,
      borderWidth: labels.length === 1 ? 3 : 2,
    });
  }

  if (!selectedCurrency || selectedCurrency === "EUR") {
    datasets.push({
      label: "EUR з Excel",
      data: eurData,
      borderColor: "#f59e0b",
      backgroundColor: "rgba(245, 158, 11, 0.14)",
      tension: labels.length === 1 ? 0 : 0.25,
      spanGaps: true,
      pointRadius: labels.length > 120 ? 0 : 3,
      borderWidth: labels.length === 1 ? 3 : 2,
    });
  }

  const chartData = {
    labels: chartLabels,
    datasets,
  };

  if (state.chart) {
    state.chart.data = chartData;
    state.chart.update();
    return;
  }

  state.chart = new Chart(elements.ratesChart, {
    type: "line",
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: "index",
      },
      plugins: {
        legend: {
          labels: {
            color: "#cbd5e1",
            usePointStyle: true,
          },
        },
        tooltip: {
          callbacks: {
            label: (context) => `${context.dataset.label}: ${formatRate(context.parsed.y)}`,
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: "#94a3b8",
            maxTicksLimit: 9,
            callback: function tickLabel(value) {
              return String(this.getLabelForValue(value)).trim();
            },
          },
          grid: {
            color: "rgba(148, 163, 184, 0.12)",
          },
        },
        y: {
          ticks: {
            color: "#94a3b8",
          },
          grid: {
            color: "rgba(148, 163, 184, 0.12)",
          },
        },
      },
    },
  });
}

function buildSeries(labels, records, currency) {
  const byDate = new Map();

  for (const record of records) {
    if (record.currency === currency) {
      byDate.set(record.date, record.rate);
    }
  }

  return labels.map((label) => byDate.get(String(label).trim()) ?? null);
}

function renderCalculator() {
  const amount = Number(elements.calcAmount.value);
  const currency = elements.calcCurrency.value;
  const date = elements.calcDate.value;
  const record = state.excelRecords.find((item) => item.currency === currency && item.date === date);

  if (!Number.isFinite(amount) || amount <= 0) {
    elements.calcResult.textContent = "-";
    elements.calcRateInfo.textContent = "Введіть суму більше нуля.";
    return;
  }

  if (!record) {
    elements.calcResult.textContent = "-";
    elements.calcRateInfo.textContent = `Немає Excel-курсу ${currency} за ${date || "обрану дату"}.`;
    return;
  }

  const converted = amount / record.rate;
  elements.calcResult.textContent = `${formatAmount(converted)} ${currency}`;
  elements.calcRateInfo.textContent = `Курс Excel: ${formatRate(record.rate)} UAH за 1 ${currency}, дата ${record.date}.`;
}

function renderTable(records) {
  elements.tableBody.innerHTML = "";
  const searchedDate = normalizeDateSearch(state.filters.dateSearch);
  const highlightedDate = searchedDate && !hasExcelDate(searchedDate) ? findNearestDate(searchedDate) : searchedDate;

  const sortedRecords = [...records].sort((a, b) => {
    const dateOrder = b.date.localeCompare(a.date);
    return dateOrder || a.currency.localeCompare(b.currency);
  });
  const visibleRecords = state.showAllRows ? sortedRecords : sortedRecords.slice(0, DISPLAY_LIMIT);
  const fragment = document.createDocumentFragment();

  for (const record of visibleRecords) {
    const row = document.createElement("tr");
    const badgeClass = record.currency.toLowerCase();

    if (highlightedDate && record.date === highlightedDate) {
      row.classList.add("highlight-row");
    }

    row.innerHTML = `
      <td>${record.rowNumber}</td>
      <td>${escapeHtml(record.date)}</td>
      <td><span class="currency-badge ${badgeClass}">${escapeHtml(record.currency)}</span></td>
      <td>${formatRate(record.rate)}</td>
      <td><span class="source-pill">${escapeHtml(record.source)}</span></td>
      <td>${escapeHtml(record.comment)}</td>
    `;

    fragment.append(row);
  }

  elements.tableBody.append(fragment);
  elements.emptyState.hidden = sortedRecords.length > 0;

  if (!sortedRecords.length) {
    elements.tableRangeInfo.textContent = "Немає рядків за обраними фільтрами.";
  } else if (state.showAllRows) {
    elements.tableRangeInfo.textContent = `Показано всі ${sortedRecords.length} рядків з Excel за фільтрами.`;
  } else {
    const lastVisibleRow = visibleRecords.at(-1)?.rowNumber || "-";
    const firstVisibleRow = visibleRecords[0]?.rowNumber || "-";
    elements.tableRangeInfo.textContent = `Показано останні ${visibleRecords.length} рядків: Excel #${firstVisibleRow} - #${lastVisibleRow} з ${sortedRecords.length} знайдених.`;
  }

  elements.toggleRowsButton.textContent = state.showAllRows ? "Показати останні 10" : "Показати всі рядки";
  elements.toggleRowsButton.disabled = sortedRecords.length <= DISPLAY_LIMIT;
}

function formatRate(value) {
  if (!Number.isFinite(value)) {
    return "-";
  }

  return value.toFixed(4);
}

function formatAmount(value) {
  if (!Number.isFinite(value)) {
    return "-";
  }

  return new Intl.NumberFormat("uk-UA", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function selectSuggestedDate(date) {
  const displayDate = formatDisplayDate(date);
  state.filters.dateSearch = displayDate;
  state.showAllRows = false;
  elements.dateSearch.value = displayDate;
  renderDashboard();
}

elements.currencyFilter.addEventListener("change", (event) => {
  state.filters.currency = event.target.value;
  state.showAllRows = false;
  renderDashboard();
});

elements.dateFrom.addEventListener("change", (event) => {
  state.filters.dateFrom = event.target.value;
  state.showAllRows = false;
  renderDashboard();
});

elements.dateTo.addEventListener("change", (event) => {
  state.filters.dateTo = event.target.value;
  state.showAllRows = false;
  renderDashboard();
});

elements.dateSearch.addEventListener("input", (event) => {
  state.filters.dateSearch = event.target.value;
  state.showAllRows = false;
  renderDashboard();
});

elements.dateLookupPanel.addEventListener("click", (event) => {
  const button = event.target.closest("[data-date]");

  if (!button) {
    return;
  }

  selectSuggestedDate(button.dataset.date);
});

elements.resetButton.addEventListener("click", () => {
  state.filters.currency = "";
  state.filters.dateFrom = "";
  state.filters.dateTo = "";
  state.filters.dateSearch = "";
  state.showAllRows = false;
  elements.currencyFilter.value = "";
  elements.dateFrom.value = "";
  elements.dateTo.value = "";
  elements.dateSearch.value = "";
  renderDashboard();
});

elements.toggleRowsButton.addEventListener("click", () => {
  state.showAllRows = !state.showAllRows;
  renderTable(getFilteredExcelRecords());
});

elements.calcAmount.addEventListener("input", renderCalculator);
elements.calcCurrency.addEventListener("change", renderCalculator);
elements.calcDate.addEventListener("change", renderCalculator);

init();
