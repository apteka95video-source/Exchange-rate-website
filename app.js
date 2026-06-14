const DATA_URL = "./data/currency_rates.json";
const EXCEL_SOURCE = "Міжбанк";
const NBU_SOURCE = "НБУ API";
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
  datasetStatus: document.querySelector("#datasetStatus"),
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
    elements.datasetStatus.textContent = "Помилка завантаження даних";
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
  elements.datasetStatus.textContent = `${state.excelRecords.length} Excel-записів`;
}

function renderDashboard() {
  const filteredExcelRecords = getFilteredExcelRecords();

  renderLatestExcelCards();
  renderChart(filteredExcelRecords);
  renderCalculator();
  renderTable(filteredExcelRecords);
}

function getFilteredExcelRecords() {
  const normalizedDateSearch = normalizeDateSearch(state.filters.dateSearch);
  const rawDateSearch = state.filters.dateSearch.trim();

  return state.excelRecords.filter((record) => {
    const matchesCurrency = !state.filters.currency || record.currency === state.filters.currency;
    const matchesFrom = !state.filters.dateFrom || record.date >= state.filters.dateFrom;
    const matchesTo = !state.filters.dateTo || record.date <= state.filters.dateTo;
    const matchesSearch =
      !rawDateSearch ||
      (normalizedDateSearch ? record.date === normalizedDateSearch : record.date.includes(rawDateSearch));

    return matchesCurrency && matchesFrom && matchesTo && matchesSearch;
  });
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
  const usdData = buildSeries(labels, records, "USD");
  const eurData = buildSeries(labels, records, "EUR");

  elements.chartSubtitle.textContent = labels.length
    ? `Період: ${labels[0]} - ${labels.at(-1)}`
    : "Немає даних для графіка за обраними фільтрами.";

  const chartData = {
    labels,
    datasets: [
      {
        label: "USD з Excel",
        data: usdData,
        borderColor: "#22c55e",
        backgroundColor: "rgba(34, 197, 94, 0.12)",
        tension: 0.25,
        spanGaps: true,
        pointRadius: labels.length > 120 ? 0 : 2,
      },
      {
        label: "EUR з Excel",
        data: eurData,
        borderColor: "#f59e0b",
        backgroundColor: "rgba(245, 158, 11, 0.14)",
        tension: 0.25,
        spanGaps: true,
        pointRadius: labels.length > 120 ? 0 : 2,
      },
    ],
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

  return labels.map((label) => byDate.get(label) ?? null);
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

  const sortedRecords = [...records].sort((a, b) => {
    const dateOrder = b.date.localeCompare(a.date);
    return dateOrder || a.currency.localeCompare(b.currency);
  });
  const visibleRecords = state.showAllRows ? sortedRecords : sortedRecords.slice(0, DISPLAY_LIMIT);
  const fragment = document.createDocumentFragment();

  for (const record of visibleRecords) {
    const row = document.createElement("tr");
    const badgeClass = record.currency.toLowerCase();

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
