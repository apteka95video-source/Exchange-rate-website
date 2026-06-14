const DATA_URL = "./data/currency_rates.json";

const state = {
  records: [],
  search: "",
  source: "",
};

const SOURCE_GROUPS = {
  excel: ["Міжбанк", "Company Excel"],
  nbu: ["НБУ API", "NBU API"],
};

const elements = {
  currencyCount: document.querySelector("#currencyCount"),
  sourceCount: document.querySelector("#sourceCount"),
  recordCount: document.querySelector("#recordCount"),
  latestDate: document.querySelector("#latestDate"),
  excelSourceCount: document.querySelector("#excelSourceCount"),
  nbuSourceCount: document.querySelector("#nbuSourceCount"),
  searchInput: document.querySelector("#searchInput"),
  sourceFilter: document.querySelector("#sourceFilter"),
  resetButton: document.querySelector("#resetButton"),
  comparisonTableBody: document.querySelector("#comparisonTableBody"),
  tableBody: document.querySelector("#ratesTableBody"),
  emptyState: document.querySelector("#emptyState"),
};

async function loadRates() {
  try {
    const response = await fetch(DATA_URL);

    if (!response.ok) {
      throw new Error(`Could not load ${DATA_URL}`);
    }

    const payload = await response.json();
    state.records = Array.isArray(payload.records) ? payload.records : [];
    populateSourceFilter(state.records);
    render();
  } catch (error) {
    elements.tableBody.innerHTML = "";
    elements.comparisonTableBody.innerHTML = "";
    elements.emptyState.hidden = false;
    elements.emptyState.textContent = "Currency data could not be loaded.";
    console.error(error);
  }
}

function populateSourceFilter(records) {
  elements.sourceFilter.innerHTML = '<option value="">All sources</option>';

  const sources = [...new Set(records.map((record) => record.source).filter(Boolean))].sort();

  for (const source of sources) {
    const option = document.createElement("option");
    option.value = source;
    option.textContent = source;
    elements.sourceFilter.append(option);
  }
}

function render() {
  const filteredRecords = state.records.filter(matchesFilters);

  renderSummary(filteredRecords);
  renderSourceCards(state.records);
  renderComparison(filteredRecords);
  renderTable(filteredRecords);

  elements.emptyState.hidden = filteredRecords.length > 0;
}

function matchesFilters(record) {
  const query = state.search.trim().toLowerCase();
  const currency = String(record.currency || "").toLowerCase();
  const currencyName = String(record.currency_name || "").toLowerCase();
  const matchesQuery = !query || currency.includes(query) || currencyName.includes(query);
  const matchesSource = !state.source || record.source === state.source;

  return matchesQuery && matchesSource;
}

function renderSummary(records) {
  const currencies = new Set(records.map((record) => record.currency).filter(Boolean));
  const sources = new Set(records.map((record) => record.source).filter(Boolean));
  const latestDate = records
    .map((record) => record.date)
    .filter(Boolean)
    .sort()
    .at(-1);

  elements.currencyCount.textContent = currencies.size;
  elements.sourceCount.textContent = sources.size;
  elements.recordCount.textContent = records.length;
  elements.latestDate.textContent = latestDate || "-";
}

function renderSourceCards(records) {
  elements.excelSourceCount.textContent = countBySourceGroup(records, SOURCE_GROUPS.excel);
  elements.nbuSourceCount.textContent = countBySourceGroup(records, SOURCE_GROUPS.nbu);
}

function countBySourceGroup(records, sourceNames) {
  return records.filter((record) => sourceNames.includes(record.source)).length;
}

function renderComparison(records) {
  elements.comparisonTableBody.innerHTML = "";

  const latestRecords = latestByCurrencyAndSource(records);
  const fragment = document.createDocumentFragment();

  for (const record of latestRecords) {
    const buyRate = Number(record.buy_rate);
    const sellRate = Number(record.sell_rate);
    const spread = sellRate - buyRate;
    const row = document.createElement("tr");

    row.innerHTML = `
      <td><strong>${escapeHtml(record.currency)}</strong></td>
      <td><span class="source-pill">${escapeHtml(record.source)}</span></td>
      <td>${escapeHtml(record.date)}</td>
      <td>${formatNumber(buyRate)}</td>
      <td>${formatNumber(sellRate)}</td>
      <td>${formatNumber(spread)}</td>
    `;

    fragment.append(row);
  }

  elements.comparisonTableBody.append(fragment);
}

function latestByCurrencyAndSource(records) {
  const latestRecords = new Map();

  for (const record of records) {
    const key = `${record.currency}|${record.source}`;
    const current = latestRecords.get(key);

    if (!current || String(record.date) > String(current.date)) {
      latestRecords.set(key, record);
    }
  }

  return [...latestRecords.values()].sort((a, b) => {
    const currencyOrder = String(a.currency).localeCompare(String(b.currency));

    if (currencyOrder !== 0) {
      return currencyOrder;
    }

    return sourceRank(a.source) - sourceRank(b.source);
  });
}

function sourceRank(source) {
  if (SOURCE_GROUPS.excel.includes(source)) {
    return 1;
  }

  if (SOURCE_GROUPS.nbu.includes(source)) {
    return 2;
  }

  return 3;
}

function renderTable(records) {
  elements.tableBody.innerHTML = "";

  const fragment = document.createDocumentFragment();

  for (const record of records) {
    const buyRate = Number(record.buy_rate);
    const sellRate = Number(record.sell_rate);
    const spread = sellRate - buyRate;
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${escapeHtml(record.date)}</td>
      <td><strong>${escapeHtml(record.currency)}</strong></td>
      <td>${escapeHtml(record.currency_name)}</td>
      <td>${formatNumber(buyRate)}</td>
      <td>${formatNumber(sellRate)}</td>
      <td>${formatNumber(spread)}</td>
      <td><span class="source-pill">${escapeHtml(record.source)}</span></td>
      <td>${escapeHtml(record.comment)}</td>
    `;

    fragment.append(row);
  }

  elements.tableBody.append(fragment);
}

function formatNumber(value) {
  if (!Number.isFinite(value)) {
    return "0.00";
  }

  return value.toFixed(2);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

elements.searchInput.addEventListener("input", (event) => {
  state.search = event.target.value;
  render();
});

elements.sourceFilter.addEventListener("change", (event) => {
  state.source = event.target.value;
  render();
});

elements.resetButton.addEventListener("click", () => {
  state.search = "";
  state.source = "";
  elements.searchInput.value = "";
  elements.sourceFilter.value = "";
  render();
});

loadRates();
