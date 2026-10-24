# COINCISE Demo

A lightweight cash-flow planning dashboard for small businesses.

## What this app does

This app helps business owners:
- see current liquidity and projected cash position
- compare expected revenue vs actual cash received
- track receivables and due obligations
- simulate negative scenarios such as delayed customer payments, sales drops, and surprise expenses
- forecast months of possible financial stress and suggest corrective actions

## Features included

- Business input panel for opening cash, revenue, payroll, operating expenses, supplier dues, and loan payments
- Scenario simulator for payment delays, sales reduction, unexpected spending, and supplier-term shifts
- Liquidity dashboard showing forecasted monthly balances
- Forecast table for expected inflow, outflow, net cash, and month-end balance
- Action recommendations for funding gaps or stress periods

## How to run

Option 1: Simple local server

```bash
cd <project-folder>
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

Option 2: Open the HTML file directly

Open `index.html` in a browser.

## Hackathon demo storyline

Use the demo with these default values:
- Opening cash reserve: ₹65,000
- Monthly revenue: ₹34,000
- Receivable days: 23
- Payroll: ₹14,500
- Operating expense: ₹7,200
- Loan installment: ₹4,000
- Supplier dues: ₹12,000
- Payment delay: 15 days
- Sales drop: 12%
- Unexpected expense: ₹8,000

The dashboard will show whether the business is healthy or under stress and recommend actions such as:
- collecting receivables faster
- delaying non-critical supplier payments
- arranging a short-term working capital facility
- reducing discretionary spending

## Demo explanation for judges

The solution demonstrates a practical cash-flow management page tailored for small businesses. It combines real-world financing concerns with a simple, business-friendly interface and gives owners a quick understanding of:
- current cash position
- receivables still waiting to be collected
- obligations due soon
- months where the business may face shortages
- corrective actions to stabilize finances

This is ideal for a 30-minute hackathon prototype because it is fast to use, visually clear, and directly aligned with the problem statement.
