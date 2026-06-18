// ============================================
// PAYMENTS TAB - Payment Management
// ============================================

let payableOrdersCache = [];
let lastPaymentsCache = [];
let lastOrdersCache = [];
let paymentsCharts = {
    receivedPending: null,
    revenueTrend: null,
    testsByCategory: null,
};

function escapePaymentHtml(text) {
    const div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
}

function fmtMoney(n) {
    const v = Number(n || 0) || 0;
    if (typeof window.formatLabCurrency === 'function') {
        return window.formatLabCurrency(v);
    }
    return `$${v.toFixed(2)}`;
}

function normalizeList(data) {
    return Array.isArray(data) ? data : (data?.results || data?.data || []);
}

function getOrderKeys(order) {
    return [order?.id, order?.uuid, order?.order_id, order?.order_number].filter(Boolean).map(String);
}

function getPaymentOrderKey(payment) {
    return String(payment?.test_order || payment?.test_order_id || payment?.order_id || '');
}

function getOrderAmount(order) {
    return Number.parseFloat(order?.total_amount || order?.amount || order?.price || 0) || 0;
}

function isPaymentCompleted(payment) {
    return String(payment?.status || 'completed').toLowerCase() === 'completed';
}

async function fetchPaymentContext() {
    const [paymentsResp, ordersResp, lookup] = await Promise.all([
        authenticatedFetch(`${API_BASE_URL}/payments/?limit=1000`),
        authenticatedFetch(`${API_BASE_URL}/test-orders/?ordering=-created_at&limit=1000`),
        getPatientsLookup()
    ]);

    if (!paymentsResp.ok) throw new Error('Failed to fetch payments');
    if (!ordersResp.ok) throw new Error('Failed to fetch test orders for payments');

    const payments = normalizeList(await paymentsResp.json());
    const testOrders = normalizeList(await ordersResp.json());
    return { payments, testOrders, lookup };
}

// Use shared resolvers - async helper
async function resolveTestOrderDisplay(testOrder, lookup = null) {
    if (!testOrder) return { id: '', patient: 'Unknown', test: 'Unknown' };
    const id = testOrder.order_id || testOrder.order_number || testOrder.id || testOrder.uuid || '';
    const patient = await resolvePatientName(testOrder, lookup);
    const test = await resolveTestType(testOrder);
    return { id, patient, test };
}

async function loadPaymentsTable() {
    try {
        const { payments, testOrders, lookup } = await fetchPaymentContext();
        lastPaymentsCache = payments;
        lastOrdersCache = testOrders;
        const tbody = document.getElementById('paymentsTableBody');
        if (!tbody) return payments;

        if (payments.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted">
                        <i class="fas fa-inbox fa-2x mb-2"></i>
                        <div>No payments found</div>
                    </td>
                </tr>
            `;
            updatePaymentsStatistics(payments, testOrders);
            return payments;
        }

        const ordersByKey = new Map();
        testOrders.forEach(order => getOrderKeys(order).forEach(key => ordersByKey.set(key, order)));

        // Resolve all payments with async lookup
        const resolvedPayments = await Promise.all(payments.map(async pay => {
            const testOrder = ordersByKey.get(getPaymentOrderKey(pay));
            const fallbackOrder = {
                order_id: pay.order_id,
                patient_name: pay.patient_name,
                test_name: pay.test_name,
            };
            const { id, patient, test } = await resolveTestOrderDisplay(testOrder || fallbackOrder, lookup);
            const amount = parseFloat(pay.amount || 0);
            const date = pay.payment_date || pay.created_at || pay.date;
            const method = pay.payment_method || pay.method || '—';
            const status = (pay.status || 'completed').toLowerCase();
            return { pay, id, patient, test, amount, date, method, status };
        }));
        
        const rows = resolvedPayments.map(({ pay, id, patient, test, amount, date, method, status }) => {
            return `
                <tr>
                    <td>#${escapePaymentHtml(pay.payment_id || pay.id || '')}</td>
                    <td>#${escapePaymentHtml(id || pay.order_id || '')}</td>
                    <td>${escapePaymentHtml(patient)}</td>
                    <td>${escapePaymentHtml(test)}</td>
                    <td>${escapePaymentHtml(fmtMoney(amount))}</td>
                    <td>${date ? new Date(date).toLocaleDateString() : 'N/A'}</td>
                    <td>${escapePaymentHtml(method)}</td>
                    <td><span class="badge bg-${status === 'completed' ? 'success' : status === 'refunded' ? 'secondary' : 'warning'}">${escapePaymentHtml(status)}</span></td>
                </tr>
            `;
        }).join('');
        
        tbody.innerHTML = rows;
        updatePaymentsStatistics(payments, testOrders);
        return payments;
    } catch (e) {
        console.error('Error loading payments:', e);
        showNotification('Error loading payments: ' + e.message, 'danger');
    }
}

function getPayableOrders(testOrders, payments) {
    const paidByOrder = new Map();
    payments.forEach(payment => {
        if (!isPaymentCompleted(payment)) return;
        const key = getPaymentOrderKey(payment);
        if (!key) return;
        paidByOrder.set(key, (paidByOrder.get(key) || 0) + (Number.parseFloat(payment.amount || 0) || 0));
    });

    return testOrders.map(order => {
        const total = getOrderAmount(order);
        const paid = getOrderKeys(order).reduce((sum, key) => sum + (paidByOrder.get(key) || 0), 0);
        return { order, total, paid, due: Math.max(0, total - paid) };
    }).filter(item => item.total > 0 && item.due > 0 && String(item.order.status || '').toLowerCase() !== 'archived');
}

function updatePaymentsStatistics(payments, testOrders = []) {
    const rangeEl = document.getElementById('paymentsRange');
    const range = String(rangeEl?.value || 'month').toLowerCase();
    const now = new Date();

    function startOfRange() {
        // Rolling windows are easier to understand and match "weekly/yearly report" expectations.
        const d = new Date(now);
        const days = range === 'year' ? 365 : (range === 'week' ? 7 : 30);
        d.setDate(d.getDate() - days);
        return d;
    }

    const start = startOfRange();

    const inRange = (iso) => {
        if (!iso) return false;
        const dt = new Date(iso);
        return !Number.isNaN(dt.getTime()) && dt >= start && dt <= now;
    };

    const completedPayments = payments.filter(p => isPaymentCompleted(p) && inRange(p.payment_date || p.created_at || p.date));
    const receivedAmount = completedPayments.reduce((sum, p) => sum + (parseFloat(p.amount || 0) || 0), 0);

    // Orders in range: use created_at/order_date
    const ordersInRange = testOrders.filter(o => inRange(o.created_at || o.order_date));
    const totalBilled = ordersInRange.reduce((sum, o) => sum + getOrderAmount(o), 0);

    // Pending due across orders in range (based on total_amount - ALL paid payments, not only in-range).
    const payable = getPayableOrders(ordersInRange, payments);
    const pendingDue = payable.reduce((sum, x) => sum + (x.due || 0), 0);

    // Tests done: prefer completed_at timestamps when available, otherwise fall back to status.
    const testsDone = ordersInRange.reduce((sum, o) => {
        const items = Array.isArray(o.items) ? o.items : [];
        const done = items.filter(it => {
            const completedAt = it.completed_at || it.completedAt;
            if (completedAt) return inRange(completedAt);
            return String(it.status || '').toLowerCase() === 'completed';
        }).length;
        return sum + done;
    }, 0);

    const receivedEl = document.getElementById('paymentsReceivedAmount');
    const receivedCountEl = document.getElementById('paymentsReceivedCount');
    const pendingDueEl = document.getElementById('paymentsPendingDue');
    const pendingOrdersEl = document.getElementById('paymentsPendingOrders');
    const testsDoneEl = document.getElementById('paymentsTestsDone');
    const ordersCountEl = document.getElementById('paymentsOrdersCount');
    const billedEl = document.getElementById('paymentsTotalBilled');

    if (receivedEl) receivedEl.textContent = fmtMoney(receivedAmount);
    if (receivedCountEl) receivedCountEl.textContent = String(completedPayments.length);
    if (pendingDueEl) pendingDueEl.textContent = fmtMoney(pendingDue);
    if (pendingOrdersEl) pendingOrdersEl.textContent = String(payable.length);
    if (testsDoneEl) testsDoneEl.textContent = String(testsDone);
    if (ordersCountEl) ordersCountEl.textContent = String(ordersInRange.length);
    if (billedEl) billedEl.textContent = fmtMoney(totalBilled);

    // Update charts
    try { renderPaymentsCharts({ payments, testOrders, start, now, range }); } catch (_) {}
}

function buildRangeWindow(range, now) {
    const days = range === 'year' ? 365 : (range === 'week' ? 7 : 30);
    const start = new Date(now);
    start.setDate(start.getDate() - days);
    return { start, days };
}

function renderPaymentsCharts({ payments, testOrders, start, now }) {
    if (typeof window.Chart === 'undefined') return;
    const inRange = (iso) => {
        if (!iso) return false;
        const dt = new Date(iso);
        return !Number.isNaN(dt.getTime()) && dt >= start && dt <= now;
    };

    // Chart 1: Received vs Pending Due
    const completedPayments = payments.filter(p => isPaymentCompleted(p) && inRange(p.payment_date || p.created_at || p.date));
    const receivedAmount = completedPayments.reduce((sum, p) => sum + (parseFloat(p.amount || 0) || 0), 0);
    const ordersInRange = testOrders.filter(o => inRange(o.created_at || o.order_date));
    const payable = getPayableOrders(ordersInRange, payments);
    const pendingDue = payable.reduce((sum, x) => sum + (x.due || 0), 0);

    const c1 = document.getElementById('paymentsChartReceivedPending');
    if (c1) {
        paymentsCharts.receivedPending?.destroy?.();
        paymentsCharts.receivedPending = new Chart(c1, {
            type: 'doughnut',
            data: {
                labels: ['Received', 'Pending Due'],
                datasets: [{
                    data: [receivedAmount, pendingDue],
                    backgroundColor: ['#10b981', '#f59e0b'],
                    borderWidth: 0,
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `${ctx.label}: ${fmtMoney(ctx.parsed)}`
                        }
                    }
                },
                cutout: '68%',
            }
        });
    }

    // Chart 2: Revenue trend (sum received per day)
    const byDay = new Map();
    completedPayments.forEach(p => {
        const dt = new Date(p.payment_date || p.created_at || p.date);
        if (Number.isNaN(dt.getTime())) return;
        const key = dt.toISOString().slice(0, 10); // YYYY-MM-DD
        byDay.set(key, (byDay.get(key) || 0) + (parseFloat(p.amount || 0) || 0));
    });
    const daysList = [];
    const cur = new Date(start);
    cur.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(0, 0, 0, 0);
    while (cur <= end) {
        daysList.push(cur.toISOString().slice(0, 10));
        cur.setDate(cur.getDate() + 1);
    }
    const trendValues = daysList.map(k => byDay.get(k) || 0);

    const c2 = document.getElementById('paymentsChartRevenueTrend');
    if (c2) {
        paymentsCharts.revenueTrend?.destroy?.();
        paymentsCharts.revenueTrend = new Chart(c2, {
            type: 'line',
            data: {
                labels: daysList.map(d => d.slice(5)), // MM-DD
                datasets: [{
                    label: 'Received',
                    data: trendValues,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37,99,235,0.15)',
                    fill: true,
                    tension: 0.35,
                    pointRadius: 1.5,
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: { label: (ctx) => fmtMoney(ctx.parsed.y) }
                    }
                },
                scales: {
                    y: {
                        ticks: { callback: (v) => fmtMoney(v) }
                    }
                }
            }
        });
    }

    // Chart 3: Tests by category (count of order items)
    const catCounts = new Map();
    ordersInRange.forEach(o => {
        const items = Array.isArray(o.items) ? o.items : [];
        items.forEach(it => {
            const test = it.test || it.lab_test || {};
            const cat = test.category?.name || test.category_name || it.category_name || 'Uncategorized';
            const key = String(cat || 'Uncategorized');
            catCounts.set(key, (catCounts.get(key) || 0) + 1);
        });
    });
    const catLabels = [...catCounts.keys()].sort((a, b) => (catCounts.get(b) || 0) - (catCounts.get(a) || 0)).slice(0, 10);
    const catVals = catLabels.map(l => catCounts.get(l) || 0);

    const c3 = document.getElementById('paymentsChartTestsByCategory');
    if (c3) {
        paymentsCharts.testsByCategory?.destroy?.();
        paymentsCharts.testsByCategory = new Chart(c3, {
            type: 'bar',
            data: {
                labels: catLabels,
                datasets: [{
                    label: 'Tests',
                    data: catVals,
                    backgroundColor: 'rgba(139,92,246,0.85)',
                    borderRadius: 8,
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { maxRotation: 0, autoSkip: true } },
                    y: { beginAtZero: true, ticks: { precision: 0 } }
                }
            }
        });
    }
}

function printFinancialReport() {
    const rangeEl = document.getElementById('paymentsRange');
    const range = String(rangeEl?.value || 'month').toLowerCase();
    const now = new Date();
    const { start, days } = buildRangeWindow(range, now);

    const inRange = (iso) => {
        if (!iso) return false;
        const dt = new Date(iso);
        return !Number.isNaN(dt.getTime()) && dt >= start && dt <= now;
    };

    const payments = Array.isArray(lastPaymentsCache) ? lastPaymentsCache : [];
    const orders = Array.isArray(lastOrdersCache) ? lastOrdersCache : [];

    const completedPayments = payments.filter(p => isPaymentCompleted(p) && inRange(p.payment_date || p.created_at || p.date));
    const receivedAmount = completedPayments.reduce((sum, p) => sum + (parseFloat(p.amount || 0) || 0), 0);

    const ordersInRange = orders.filter(o => inRange(o.created_at || o.order_date));
    const totalBilled = ordersInRange.reduce((sum, o) => sum + getOrderAmount(o), 0);
    const payable = getPayableOrders(ordersInRange, payments);
    const pendingDue = payable.reduce((sum, x) => sum + (x.due || 0), 0);

    // Chart images for printing (if charts exist)
    const img1 = paymentsCharts.receivedPending?.toBase64Image?.() || '';
    const img2 = paymentsCharts.revenueTrend?.toBase64Image?.() || '';
    const img3 = paymentsCharts.testsByCategory?.toBase64Image?.() || '';

    const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Financial Report</title>
  <style>
    body{font-family:Arial,sans-serif;margin:20px;color:#0f172a}
    .header{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;margin-bottom:16px}
    .muted{color:#64748b;font-size:12px}
    .cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:14px 0 18px}
    .card{border:1px solid #e2e8f0;border-radius:12px;padding:12px}
    .card h3{margin:0;font-size:12px;color:#475569;text-transform:uppercase;letter-spacing:.04em}
    .card .val{font-size:20px;font-weight:800;margin-top:6px}
    table{width:100%;border-collapse:collapse}
    th,td{border:1px solid #e2e8f0;padding:8px;font-size:12px;text-align:left;vertical-align:top}
    th{background:#f8fafc}
    .right{text-align:right}
    @media print { .no-print{display:none} }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div style="font-size:18px;font-weight:800">Financial Report</div>
      <div class="muted">Range: last ${days} days (${start.toLocaleDateString()} → ${now.toLocaleDateString()})</div>
    </div>
    <div class="no-print">
      <button onclick="window.print()">Print</button>
    </div>
  </div>

  <div class="cards">
    <div class="card"><h3>Received</h3><div class="val">${fmtMoney(receivedAmount)}</div><div class="muted">${completedPayments.length} payments</div></div>
    <div class="card"><h3>Pending Due</h3><div class="val">${fmtMoney(pendingDue)}</div><div class="muted">${payable.length} orders</div></div>
    <div class="card"><h3>Orders</h3><div class="val">${ordersInRange.length}</div><div class="muted">Created in range</div></div>
    <div class="card"><h3>Total Billed</h3><div class="val">${fmtMoney(totalBilled)}</div><div class="muted">Orders amount</div></div>
  </div>

  <h3 style="margin:16px 0 8px">Charts</h3>
  <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px">
    <div class="card">${img1 ? `<img src="${img1}" style="width:100%;height:auto"/>` : '<div class="muted">Chart unavailable</div>'}</div>
    <div class="card">${img2 ? `<img src="${img2}" style="width:100%;height:auto"/>` : '<div class="muted">Chart unavailable</div>'}</div>
  </div>
  <div style="margin-top:12px" class="card">
    ${img3 ? `<img src="${img3}" style="width:100%;height:auto"/>` : '<div class="muted">Chart unavailable</div>'}
  </div>

  <h3 style="margin:0 0 8px">Payments (completed, in range)</h3>
  <table>
    <thead>
      <tr>
        <th>Payment ID</th>
        <th>Order</th>
        <th>Amount</th>
        <th>Date</th>
        <th>Method</th>
      </tr>
    </thead>
    <tbody>
      ${completedPayments.map(p => `
        <tr>
          <td>${escapePaymentHtml(p.payment_id || p.id || '')}</td>
          <td>${escapePaymentHtml(p.order_id || p.test_order || p.test_order_id || '')}</td>
          <td class="right">${fmtMoney(parseFloat(p.amount||0)||0)}</td>
          <td>${escapePaymentHtml((p.payment_date||p.created_at||p.date||'') ? new Date(p.payment_date||p.created_at||p.date).toLocaleDateString() : '')}</td>
          <td>${escapePaymentHtml(p.payment_method || p.method || '')}</td>
        </tr>
      `).join('') || `<tr><td colspan="5" class="muted">No completed payments in this range.</td></tr>`}
    </tbody>
  </table>
</body>
</html>`;

    const w = window.open('', '_blank');
    if (!w) return showNotification('Pop-up blocked. Allow pop-ups to print.', 'warning');
    w.document.open();
    w.document.write(html);
    w.document.close();
}

async function populatePaymentModal() {
    const form = document.getElementById('paymentForm');
    if (!form) return;

    const testSelect = form.elements['testId'];
    const amountInput = form.elements['amount'];
    const suggestedPrice = document.getElementById('suggestedPrice');
    if (!testSelect) return;

    testSelect.innerHTML = '<option value="">Select Patient / Test To Pay</option>';
    payableOrdersCache = [];

    try {
        const { payments, testOrders, lookup } = await fetchPaymentContext();
        const payable = getPayableOrders(testOrders, payments);

        if (!payable.length) {
            testSelect.innerHTML = '<option value="">No unpaid patient tests found</option>';
            testSelect.disabled = true;
            if (amountInput) amountInput.value = '';
            if (suggestedPrice) suggestedPrice.textContent = fmtMoney(0);
            return;
        }

        testSelect.disabled = false;
        payableOrdersCache = await Promise.all(payable.map(async item => {
            const { id, patient, test } = await resolveTestOrderDisplay(item.order, lookup);
            return { ...item, id, patient, test };
        }));

        payableOrdersCache.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item.id || item.order.id || item.order.uuid;
            opt.dataset.amount = item.due.toFixed(2);
            opt.textContent = `${item.patient} - ${item.test} - #${item.id} - Due ${fmtMoney(item.due)}`;
            testSelect.appendChild(opt);
        });

        if (amountInput) amountInput.value = '';
        if (suggestedPrice) suggestedPrice.textContent = fmtMoney(0);
    } catch (e) {
        console.error('populatePaymentModal error:', e);
        testSelect.innerHTML = '<option value="">Failed to load unpaid patients/tests</option>';
        testSelect.disabled = true;
        showNotification('Failed to load unpaid patients/tests: ' + e.message, 'danger');
    }
}

function handlePaymentOrderChange() {
    const form = document.getElementById('paymentForm');
    if (!form) return;
    const selected = form.elements['testId']?.selectedOptions?.[0];
    const due = selected?.dataset?.amount || '';
    if (form.elements['amount']) form.elements['amount'].value = due;
    const suggestedPrice = document.getElementById('suggestedPrice');
    if (suggestedPrice) suggestedPrice.textContent = due ? fmtMoney(Number.parseFloat(due)) : fmtMoney(0);
}

// Process new payment (from modal)
async function submitPayment() {
    try {
        const form = document.getElementById('paymentForm');
        if (!form) {
            showNotification('Payment form not found', 'danger');
            return;
        }
        const fd = new FormData(form);
        const testOrder = fd.get('testId');
        const amount = parseFloat(fd.get('amount') || '0');
        const paymentMethod = fd.get('paymentMethod');

        if (!testOrder) return showNotification('Select a patient/test to pay', 'warning');
        if (!amount || amount <= 0) return showNotification('Enter a valid payment amount', 'warning');
        if (!paymentMethod) return showNotification('Select a payment method', 'warning');

        const payload = {
            test_order: testOrder,
            amount,
            payment_method: paymentMethod,
            status: 'completed',
            notes: fd.get('notes') || ''
        };
        const resp = await authenticatedFetch(`${API_BASE_URL}/payments/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!resp.ok) throw new Error(await resp.text());
        showNotification('Payment processed successfully', 'success');
        try { bootstrap.Modal.getInstance(document.getElementById('paymentModal'))?.hide(); } catch (_) {}
        
        // Refresh payments and related tabs
        await loadPaymentsTable();
        await populatePaymentModal();
        // Refresh dashboard stats (may include payment totals)
        if (typeof window.loadDashboardStats === 'function') {
            try { await window.loadDashboardStats(); } catch (_) {}
        }
    } catch (e) {
        console.error('submitPayment error:', e);
        showNotification('Error processing payment: ' + e.message, 'danger');
    }
}

function wirePaymentModal() {
    const modal = document.getElementById('paymentModal');
    const form = document.getElementById('paymentForm');
    if (!modal || !form || modal.dataset.paymentWired === 'true') return;

    modal.dataset.paymentWired = 'true';
    modal.addEventListener('show.bs.modal', populatePaymentModal);
    form.elements['testId']?.addEventListener('change', handlePaymentOrderChange);
}

// Export
window.loadPaymentsTable = loadPaymentsTable;
window.submitPayment = submitPayment;
window.updatePaymentsStatistics = updatePaymentsStatistics;
window.populatePaymentModal = populatePaymentModal;
window.printFinancialReport = printFinancialReport;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wirePaymentModal);
} else {
    wirePaymentModal();
}

// Recompute stats when range changes (uses last cached data)
document.addEventListener('change', (e) => {
    const el = e.target?.closest?.('#paymentsRange');
    if (!el) return;
    updatePaymentsStatistics(lastPaymentsCache, lastOrdersCache);
});

window.addEventListener('lab:settings-updated', () => {
    try {
        updatePaymentsStatistics(lastPaymentsCache, lastOrdersCache);
        loadPaymentsTable();
    } catch (_) {}
});

