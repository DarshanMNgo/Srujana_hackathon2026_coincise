const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];

const defaultState = {
  openingCash: 65000,
  monthlySales: 34000,
  receivableDays: 23,
  payroll: 14500,
  operatingExpenses: 7200,
  loanInstallment: 4000,
  supplierDues: 12000,
  emergencyFunding: 25000,
  paymentDelay: 15,
  unexpectedExpense: 8000,
  salesDrop: 12,
  supplierDelay: 8,
};

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function getInputs() {
  return {
    openingCash: Number(document.getElementById("openingCash").value || 0),
    monthlySales: Number(document.getElementById("monthlySales").value || 0),
    receivableDays: Number(document.getElementById("receivableDays").value || 0),
    payroll: Number(document.getElementById("payroll").value || 0),
    operatingExpenses: Number(document.getElementById("operatingExpenses").value || 0),
    loanInstallment: Number(document.getElementById("loanInstallment").value || 0),
    supplierDues: Number(document.getElementById("supplierDues").value || 0),
    emergencyFunding: Number(document.getElementById("emergencyFunding").value || 0),
    paymentDelay: Number(document.getElementById("paymentDelay").value || 0),
    unexpectedExpense: Number(document.getElementById("unexpectedExpense").value || 0),
    salesDrop: Number(document.getElementById("salesDrop").value || 0),
    supplierDelay: Number(document.getElementById("supplierDelay").value || 0),
  };
}

function syncRangeDisplays() {
  document.getElementById("paymentDelayValue").textContent = `${document.getElementById("paymentDelay").value} days`;
  document.getElementById("unexpectedExpenseValue").textContent = formatCurrency(Number(document.getElementById("unexpectedExpense").value));
  document.getElementById("salesDropValue").textContent = `${document.getElementById("salesDrop").value}%`;
  document.getElementById("supplierDelayValue").textContent = `${document.getElementById("supplierDelay").value} days`;
}

function buildForecast() {
  const data = getInputs();
  const months = [];
  let cashBalance = data.openingCash;
  let outstandingReceivables = data.monthlySales * (data.receivableDays / 30) * 0.75;
  let totalPayables = data.supplierDues * 1.2;

  for (let i = 0; i < monthNames.length; i += 1) {
    const seasonalTrend = 1 + i * 0.04;
    const adjustedSales = data.monthlySales * seasonalTrend * (1 - data.salesDrop / 100);
    const expectedCollections = adjustedSales * (1 - data.paymentDelay / 45);
    const actualCollections = expectedCollections + (i === 2 ? data.emergencyFunding * 0.25 : 0);
    const delayedPaymentImpact = (data.paymentDelay / 30) * adjustedSales * 0.32;
    const financingBoost = i === 3 ? data.emergencyFunding * 0.35 : 0;
    const receivablesIn = adjustedSales - delayedPaymentImpact;
    const cashIn = actualCollections + financingBoost;

    const delayedSupplierBenefit = data.supplierDelay * 900;
    const operatingOutflow = data.payroll + data.operatingExpenses + data.loanInstallment + data.supplierDues + data.unexpectedExpense * (i === 1 || i === 4 ? 1.4 : 1);
    const cashOut = operatingOutflow - delayedSupplierBenefit;

    outstandingReceivables = Math.max(0, outstandingReceivables + receivablesIn - actualCollections);
    totalPayables = Math.max(0, totalPayables + data.supplierDues * 0.9 - data.supplierDues * (data.supplierDelay / 30));

    cashBalance = cashBalance + cashIn - cashOut;

    months.push({
      month: monthNames[i],
      inflow: cashIn,
      outflow: cashOut,
      net: cashIn - cashOut,
      balance: cashBalance,
      receivables: outstandingReceivables,
      obligations: totalPayables,
    });
  }

  return { months, closingBalance: months[months.length - 1].balance, receivables: months[months.length - 1].receivables, obligations: months[months.length - 1].obligations };
}

function renderChart(months) {
  const container = document.getElementById("cashChart");
  const maxBalance = Math.max(...months.map((m) => Math.abs(m.balance)), 10000);

  container.innerHTML = "";
  const grid = document.createElement("div");
  grid.className = "chart-grid";

  const rail = document.createElement("div");
  rail.className = "chart-rail";

  months.forEach((month) => {
    const wrap = document.createElement("div");
    wrap.className = "bar-wrap";

    const bar = document.createElement("div");
    bar.className = "bar";
    const heightPercent = Math.max(18, (Math.abs(month.balance) / maxBalance) * 100);
    bar.style.height = `${Math.min(100, heightPercent)}%`;

    if (month.balance < 0) {
      bar.classList.add("danger");
    } else if (month.balance < 20000) {
      bar.classList.add("alert");
    }

    const value = document.createElement("span");
    value.className = "bar-value";
    value.textContent = formatCurrency(month.balance);

    const label = document.createElement("span");
    label.className = "bar-label";
    label.textContent = month.month;

    wrap.appendChild(value);
    wrap.appendChild(bar);
    wrap.appendChild(label);
    rail.appendChild(wrap);
  });

  grid.appendChild(rail);
  container.appendChild(grid);
}

function renderTable(months) {
  const tbody = document.getElementById("forecastTableBody");
  tbody.innerHTML = months
    .map(
      (month) => `
        <tr>
          <td>${month.month}</td>
          <td class="positive">${formatCurrency(month.inflow)}</td>
          <td class="negative">${formatCurrency(month.outflow)}</td>
          <td class="${month.net >= 0 ? "positive" : "negative"}">${formatCurrency(month.net)}</td>
          <td class="${month.balance >= 0 ? "neutral" : "negative"}">${formatCurrency(month.balance)}</td>
        </tr>
      `
    )
    .join("");
}

function renderRecommendations(months) {
  const list = document.getElementById("recommendationList");
  const problemMonths = months.filter((m) => m.balance < 0);
  const actions = [];

  if (problemMonths.length > 0) {
    const worst = problemMonths.reduce((min, curr) => (curr.balance < min.balance ? curr : min), problemMonths[0]);
    actions.push(`The tightest cash gap appears in ${worst.month}. Consider a short-term working capital facility or invoice discounting to cover the shortfall.`);
    actions.push("Accelerate receivables by sending reminders or offering small discounts for early payment to improve liquidity.");
    actions.push("Delay non-critical supplier payments by a few days or renegotiate their terms to smooth the cash profile.");
  } else {
    actions.push("Cash flow remains stable across the next 6 months. Keep a minimum operating reserve of 20% of monthly expenses for emergencies.");
    actions.push("Maintain a controlled sales-growth strategy and continue monitoring account receivable aging to avoid future bottlenecks.");
    actions.push("Use surplus cash to prepay a portion of debt and reduce interest exposure while keeping working capital safer.");
  }

  list.innerHTML = actions.map((action) => `<li>${action}</li>`).join("");
}

function renderSummary(months) {
  const currentBalance = months[months.length - 1].balance;
  const risk = currentBalance < 0 ? "High" : currentBalance < 20000 ? "Medium" : "Low";

  document.getElementById("availableCashValue").textContent = formatCurrency(currentBalance);
  document.getElementById("receivableValue").textContent = formatCurrency(months[months.length - 1].receivables);
  document.getElementById("obligationValue").textContent = formatCurrency(months[months.length - 1].obligations);
  document.getElementById("riskValue").textContent = risk;

  if (risk === "Low") {
    document.getElementById("cashTrend").textContent = "Healthy liquidity";
    document.getElementById("riskDetail").textContent = "No critical cash gaps forecast";
  } else if (risk === "Medium") {
    document.getElementById("cashTrend").textContent = "Watch cash buffer";
    document.getElementById("riskDetail").textContent = "A moderate gap may require action";
  } else {
    document.getElementById("cashTrend").textContent = "Liquidity stress";
    document.getElementById("riskDetail").textContent = "Urgent cash management required";
  }

  const bestMonth = months.reduce((best, month) => (month.balance > best.balance ? month : best), months[0]);
  document.getElementById("bestMonthLabel").textContent = `Best month: ${bestMonth.month}`;
}

function runForecast() {
  const forecast = buildForecast();
  renderChart(forecast.months);
  renderTable(forecast.months);
  renderRecommendations(forecast.months);
  renderSummary(forecast.months);
}

function setDefaultDemo() {
  Object.entries(defaultState).forEach(([key, value]) => {
    const element = document.getElementById(key);
    if (element) {
      element.value = value;
    }
  });
  syncRangeDisplays();
  runForecast();
}

function initialize() {
  [
    "paymentDelay",
    "unexpectedExpense",
    "salesDrop",
    "supplierDelay",
  ].forEach((id) => {
    document.getElementById(id).addEventListener("input", () => {
      syncRangeDisplays();
      runForecast();
    });
  });

  document.getElementById("resetDemoBtn").addEventListener("click", setDefaultDemo);
  document.getElementById("runForecastBtn").addEventListener("click", runForecast);

  [
    "openingCash",
    "monthlySales",
    "receivableDays",
    "payroll",
    "operatingExpenses",
    "loanInstallment",
    "supplierDues",
    "emergencyFunding",
  ].forEach((id) => {
    document.getElementById(id).addEventListener("input", runForecast);
  });

  syncRangeDisplays();
  runForecast();
}

initialize();
