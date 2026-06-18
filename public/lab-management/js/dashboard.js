// ============================================
// DASHBOARD TAB - Dashboard Statistics & Recent Tests
// ============================================

let dashboardCharts = { finance: null, orders: null };

function fmtMoney(n) {
    const v = Number(n || 0) || 0;
    if (typeof window.formatLabCurrency === 'function') {
        return window.formatLabCurrency(v);
    }
    return `$${v.toFixed(2)}`;
}

function normalizeListResp(data) {
    return Array.isArray(data) ? data : (data?.results || data?.data || []);
}

function isPaymentDone(payment) {
    return String(payment?.status || 'completed').toLowerCase() === 'completed';
}

function getOrderKeysDash(order) {
    return [order?.id, order?.uuid, order?.order_id, order?.order_number].filter(Boolean).map(String);
}

function getPaymentOrderKeyDash(payment) {
    return String(payment?.test_order || payment?.test_order_id || payment?.order_id || '');
}

function getOrderAmountDash(order) {
    return Number.parseFloat(order?.total_amount || order?.amount || order?.price || 0) || 0;
}

function getPayableOrdersDash(testOrders, payments) {
    const paidByOrder = new Map();
    payments.forEach(payment => {
        if (!isPaymentDone(payment)) return;
        const key = getPaymentOrderKeyDash(payment);
        if (!key) return;
        paidByOrder.set(key, (paidByOrder.get(key) || 0) + (Number.parseFloat(payment.amount || 0) || 0));
    });
    return testOrders.map(order => {
        const total = getOrderAmountDash(order);
        const paid = getOrderKeysDash(order).reduce((sum, key) => sum + (paidByOrder.get(key) || 0), 0);
        return { order, total, paid, due: Math.max(0, total - paid) };
    }).filter(item => item.total > 0 && item.due > 0 && String(item.order.status || '').toLowerCase() !== 'archived');
}

async function loadDashboardFinancialSummary() {
    try {
        const [pr, or] = await Promise.all([
            authenticatedFetch(`${API_BASE_URL}/payments/?limit=1000`),
            authenticatedFetch(`${API_BASE_URL}/test-orders/?ordering=-created_at&limit=1000`),
        ]);
        if (!pr.ok || !or.ok) return;
        const payments = normalizeListResp(await pr.json());
        const testOrders = normalizeListResp(await or.json());
        const now = new Date();
        const start = new Date(now);
        start.setDate(start.getDate() - 30);
        const inRange = (iso) => {
            if (!iso) return false;
            const dt = new Date(iso);
            return !Number.isNaN(dt.getTime()) && dt >= start && dt <= now;
        };
        const completedPayments = payments.filter(p => isPaymentDone(p) && inRange(p.payment_date || p.created_at || p.date));
        const received = completedPayments.reduce((s, p) => s + (parseFloat(p.amount || 0) || 0), 0);
        const ordersInRange = testOrders.filter(o => inRange(o.created_at || o.order_date));
        const payable = getPayableOrdersDash(ordersInRange, payments);
        const pendingDue = payable.reduce((s, x) => s + (x.due || 0), 0);

        const elR = document.getElementById('dashboardReceived30d');
        const elP = document.getElementById('dashboardPendingDue');
        if (elR) elR.textContent = fmtMoney(received);
        if (elP) elP.textContent = fmtMoney(pendingDue);

        if (typeof window.Chart === 'undefined') return;
        const canvas = document.getElementById('dashboardChartFinance');
        if (!canvas) return;
        dashboardCharts.finance?.destroy?.();
        dashboardCharts.finance = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: ['Received (30d)', 'Pending due'],
                datasets: [{
                    data: [received, pendingDue],
                    backgroundColor: ['#10b981', '#f59e0b'],
                    borderWidth: 0,
                }],
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `${ctx.label}: ${fmtMoney(ctx.parsed)}`,
                        },
                    },
                },
                cutout: '68%',
            },
        });
    } catch (e) {
        console.warn('loadDashboardFinancialSummary:', e);
    }
}

function renderDashboardOrdersChart(stats) {
    if (typeof window.Chart === 'undefined') return;
    const canvas = document.getElementById('dashboardChartOrders');
    if (!canvas) return;
    const p = stats.pendingTests || 0;
    const ip = stats.inProgressOrders || 0;
    const c = stats.completedTests || 0;
    dashboardCharts.orders?.destroy?.();
    dashboardCharts.orders = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: ['Pending', 'In progress', 'Completed'],
            datasets: [{
                label: 'Orders',
                data: [p, ip, c],
                backgroundColor: ['#f59e0b', '#3b82f6', '#10b981'],
                borderRadius: 8,
            }],
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { precision: 0 } },
            },
        },
    });
}

function goToAppTab(tabId) {
    try {
        const el = document.querySelector(`a[data-bs-toggle="tab"][href="#${tabId}"]`);
        if (el && window.bootstrap?.Tab) {
            window.bootstrap.Tab.getOrCreateInstance(el).show();
        }
    } catch (e) {
        console.warn('goToAppTab:', e);
    }
}

function openDashboardViewAll() {
    goToAppTab('lab-tests');
}

// Get dashboard statistics from API (Django)
// Uses centralized API endpoint function from api-endpoints.js
async function getDashboardStats() {
    try {
        // Use centralized API function if available (from api-endpoints.js)
        let data;
        if (typeof window.getDashboardStats === 'function') {
            // api-endpoints.js exports getDashboardStats, but we need the raw response
            // So we use authenticatedFetch directly or call the API function
            const response = await authenticatedFetch(`${API_BASE_URL}/dashboard-stats/`);
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to fetch dashboard stats');
            }
            data = await response.json();
        } else {
            // Fallback to direct fetch
            const response = await authenticatedFetch(`${API_BASE_URL}/dashboard-stats/`);
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to fetch dashboard stats');
            }
            data = await response.json();
        }
        // Normalize Django response to frontend shape
        if (data && data.status === 'success' && data.data) {
            console.log('📊 Dashboard stats raw data:', data.data);
            const stats = {
                totalTests: data.data.total_test_orders || 0,
                pendingTests: data.data.pending_tests || 0,
                todayPatients: data.data.today_appointments || 0,
                completedTests: data.data.completed_test_orders ?? data.data.completed_tests ?? 0,
                totalPatients: data.data.total_patients || 0,
                recentPatients: data.data.recent_patients || 0,
                inProgressOrders: data.data.in_progress_test_orders || 0,
                totalLabTestsCatalog: data.data.total_lab_tests || 0,
                lastUpdated: data.data.last_updated || null,
            };
            console.log('📊 Normalized dashboard stats:', stats);
            
            // Also fetch actual patient count for verification
            try {
                const patients = await getPatients(true); // Force refresh to get actual count
                console.log(`✅ Actual patient count from backend: ${patients.length}`);
                console.log(`📋 Patient IDs: ${patients.slice(0, 5).map(p => p.id || p.uuid || p.patient_id).join(', ')}${patients.length > 5 ? '...' : ''}`);
                if (patients.length > 0 && !stats.todayPatients) {
                    console.log(`ℹ️ Note: "Today's Patients" shows appointments for today (${stats.todayPatients}), but there are ${patients.length} total patients in the system`);
                }
                if (stats.completedTests > 0) {
                    console.log(`ℹ️ Note: "Completed Tests" shows ${stats.completedTests} completed tests, NOT ${stats.completedTests} patients`);
                }
            } catch (e) {
                console.warn('Could not verify patient count:', e);
            }
            
            return stats;
        }
        // If already in desired shape, return as-is
        return data;
    } catch (error) {
        console.error('Error getting dashboard stats:', error);
        showNotification(error.message, 'danger');
        throw error;
    }
}

// Load dashboard statistics
async function loadDashboardStats() {
    try {
        console.log('Loading dashboard stats from API...');
        const stats = await getDashboardStats();
        console.log('Dashboard stats received:', stats);
        
        if (stats) {
            updateDashboardStats(stats);
            console.log('Dashboard stats updated in UI');
            await loadDashboardFinancialSummary();
        } else {
            console.warn('No stats data received, using fallback values');
            updateDashboardStats({
                totalTests: 0,
                pendingTests: 0,
                todayPatients: 0,
                completedTests: 0,
                totalPatients: 0,
                recentPatients: 0,
                inProgressOrders: 0,
                lastUpdated: null,
            });
            await loadDashboardFinancialSummary();
        }
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        showNotification('Error loading dashboard statistics: ' + error.message, 'danger');
        
        // Set fallback values
        updateDashboardStats({
            totalTests: 0,
            pendingTests: 0,
            todayPatients: 0,
            completedTests: 0,
            totalPatients: 0,
            recentPatients: 0,
            inProgressOrders: 0,
            lastUpdated: null,
        });
        await loadDashboardFinancialSummary();
    }
}

// Update dashboard statistics UI
function updateDashboardStats(stats) {
    try {
        // Ensure stats is an object
        if (!stats || typeof stats !== 'object') {
            console.warn('Invalid stats data provided:', stats);
            stats = {
                totalTests: 0,
                pendingTests: 0,
                todayPatients: 0,
                completedTests: 0,
                totalPatients: 0,
                recentPatients: 0,
                inProgressOrders: 0,
                lastUpdated: null,
            };
        }
        
        console.log('Updating dashboard stats UI with data:', stats);
        
        // Update dashboard statistics with real data
        const totalTestsEl = document.getElementById('totalTests');
        const pendingTestsEl = document.getElementById('pendingTests');
        const todayPatientsEl = document.getElementById('todayPatients');
        const completedTestsEl = document.getElementById('completedTests');
        
        console.log('Found elements:', {
            totalTests: !!totalTestsEl,
            pendingTests: !!pendingTestsEl,
            todayPatients: !!todayPatientsEl,
            completedTests: !!completedTestsEl
        });
        
        // Animate number updates
        const animateValue = (element, start, end, duration) => {
            if (!element) return;
            let startTimestamp = null;
            const step = (timestamp) => {
                if (!startTimestamp) startTimestamp = timestamp;
                const progress = Math.min((timestamp - startTimestamp) / duration, 1);
                const current = Math.floor(progress * (end - start) + start);
                element.textContent = current.toLocaleString();
                if (progress < 1) {
                    window.requestAnimationFrame(step);
                } else {
                    element.textContent = end.toLocaleString();
                }
            };
            window.requestAnimationFrame(step);
        };
        
        if (totalTestsEl) {
            const currentValue = parseInt(totalTestsEl.textContent.replace(/,/g, '')) || 0;
            const newValue = stats.totalTests || 0;
            animateValue(totalTestsEl, currentValue, newValue, 500);
            console.log('Updated totalTests:', newValue);
        } else {
            console.warn('totalTests element not found in DOM');
        }
        
        if (pendingTestsEl) {
            const currentValue = parseInt(pendingTestsEl.textContent.replace(/,/g, '')) || 0;
            const newValue = stats.pendingTests || 0;
            animateValue(pendingTestsEl, currentValue, newValue, 500);
            console.log('Updated pendingTests:', newValue);
        } else {
            console.warn('pendingTests element not found in DOM');
        }
        
        if (todayPatientsEl) {
            const currentValue = parseInt(todayPatientsEl.textContent.replace(/,/g, '')) || 0;
            const newValue = stats.todayPatients || 0;
            animateValue(todayPatientsEl, currentValue, newValue, 500);
            console.log('Updated todayPatients:', newValue);
        } else {
            console.warn('todayPatients element not found in DOM');
        }
        
        if (completedTestsEl) {
            const currentValue = parseInt(completedTestsEl.textContent.replace(/,/g, '')) || 0;
            const newValue = stats.completedTests || 0;
            animateValue(completedTestsEl, currentValue, newValue, 500);
            console.log('Updated completedTests:', newValue);
        } else {
            console.warn('completedTests element not found in DOM');
        }

        const tpEl = document.getElementById('dashboardTotalPatients');
        const rpEl = document.getElementById('dashboardRecentPatients');
        const luEl = document.getElementById('dashboardLastUpdated');
        if (tpEl) {
            const cur = parseInt(tpEl.textContent.replace(/,/g, '')) || 0;
            animateValue(tpEl, cur, stats.totalPatients || 0, 500);
        }
        if (rpEl) rpEl.textContent = String(stats.recentPatients ?? 0);
        if (luEl && stats.lastUpdated) {
            try {
                luEl.textContent = `Updated ${new Date(stats.lastUpdated).toLocaleString()}`;
            } catch (_) {
                luEl.textContent = '';
            }
        }
        
        // Update status messages
        const totalTestsChangeEl = document.getElementById('totalTestsChange');
        const pendingTestsStatusEl = document.getElementById('pendingTestsStatus');
        const todayPatientsStatusEl = document.getElementById('todayPatientsStatus');
        const completedTestsStatusEl = document.getElementById('completedTestsStatus');
        
        if (totalTestsChangeEl) totalTestsChangeEl.textContent = `Non-archived orders`;
        if (pendingTestsStatusEl) pendingTestsStatusEl.textContent = `${stats.pendingTests || 0} need attention`;
        if (todayPatientsStatusEl) todayPatientsStatusEl.textContent = `${stats.todayPatients || 0} scheduled today`;
        if (completedTestsStatusEl) completedTestsStatusEl.textContent = `${stats.inProgressOrders || 0} in progress • ${stats.completedTests || 0} done`;
        
        console.log('✅ Dashboard stats UI updated successfully');
        renderDashboardOrdersChart(stats);
    } catch (error) {
        console.error('❌ Error updating dashboard stats UI:', error);
    }
}

// Load recent tests
// Uses centralized API endpoint function from api-endpoints.js
async function loadRecentTests() {
    try {
        // Use centralized API function if available
        let data;
        if (typeof window.getTestOrders === 'function') {
            data = await window.getTestOrders({ ordering: '-created_at', limit: 5 });
        } else {
            const response = await authenticatedFetch(`${API_BASE_URL}/test-orders/?ordering=-created_at&limit=5`);
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to fetch recent tests');
            }
            data = await response.json();
        }
        
        const tests = Array.isArray(data) ? data : (data.results || data.data || []);
        
        const tbody = document.getElementById('recentTestsTableBody') || document.querySelector('table tbody');
        if (tbody) {
            if (tests.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center">
                            <div class="empty-state">
                                <i class="fas fa-flask"></i>
                                <h4>No recent tests found</h4>
                                <p>Recent test orders will appear here</p>
                            </div>
                        </td>
                    </tr>
                `;
            } else {
                // Use shared resolvers from common.js with async lookup fallback
                const lookup = await getPatientsLookup();
                const resolveDate = (order) => {
                    return order.created_at || order.order_date || order.date || null;
                };
                // Map all tests with resolved data
                const resolvedTests = await Promise.all(tests.map(async test => {
                    const patientName = await resolvePatientName(test, lookup);
                    // Backend patient detail routes use `patient_id` (PAT...).
                    const patientId = (test.patient && (test.patient.patient_id || test.patient.id || test.patient.uuid)) || test.patient_id || null;
                    const testType = await resolveTestType(test);
                    // Prefer human-friendly order_id for actions (UUID detail lookups may 404 in some DB setups)
                    const testId = test.order_id || test.order_number || test.order_no || test.id || test.uuid || '';
                    const status = (test.status || 'pending').toLowerCase();
                    const items = resolveTestItems(test);
                    const hasResults = items.some(item => item.result || (Array.isArray(item.results) && item.results.length > 0));
                    const canEnterResults = (status === 'pending' || status === 'in_progress') && !hasResults;
                    const dt = resolveDate(test);
                    return { test, patientName, patientId, testType, testId, status, items, hasResults, canEnterResults, dt };
                }));
                
                tbody.innerHTML = resolvedTests.map(({ test, patientName, patientId, testType, testId, status, items, hasResults, canEnterResults, dt }) => {
                    
                    return `
                        <tr>
                            <td>#${testId}</td>
                            <td>${patientName}</td>
                            <td>${testType}</td>
                            <td><span class="badge bg-${status === 'completed' ? 'success' : status === 'in_progress' ? 'info' : 'warning'}">${status}</span></td>
                            <td>${dt ? new Date(dt).toLocaleDateString() : 'N/A'}</td>
                            <td>
                                <div class="btn-group">
                                    ${canEnterResults ?
                                        `<button class="btn btn-sm btn-outline-success" onclick="enterTestResult('${testId}')" title="Enter Results">
                                            <i class="fas fa-edit"></i> Edit
                                        </button>` : ''
                                    }
                                    <button class="btn btn-sm btn-outline-primary" onclick="viewTest('${testId}')">View</button>
                                    <button class="btn btn-sm btn-outline-secondary" onclick="printReport('${testId}')">Print</button>
                                    <button class="btn btn-sm btn-outline-danger" onclick="deleteTestOrder('${testId}')" title="Delete Test Order"><i class="fas fa-trash"></i> Delete</button>
                                    ${patientId ? `<button class="btn btn-sm btn-outline-danger" onclick="deletePatientQuick('${patientId}')" title="Delete Patient"><i class="fas fa-user-times"></i> Delete Patient</button>` : ''}
                                </div>
                            </td>
                        </tr>
                    `;
                }).join('');
            }
        }
    } catch (error) {
        console.error('Error loading recent tests:', error);
        showNotification(error.message, 'danger');
    }
}

// Handle dashboard tab click
async function handleDashboardTab() {
    try {
        console.log('Dashboard tab clicked - refreshing data...');
        await loadDashboardStats();
        await loadRecentTests();
    } catch (error) {
        console.error('Error handling dashboard tab:', error);
        showNotification('Error updating dashboard', 'danger');
    }
}

// System Status Functions
async function checkSystemStatus() {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/health/`);
        if (!response.ok) throw new Error('Failed to check system status');
        return await response.json();
    } catch (error) {
        showNotification(error.message, 'danger');
        throw error;
    }
}

// Export functions to window
window.getDashboardStats = getDashboardStats;
window.loadDashboardStats = loadDashboardStats;
window.updateDashboardStats = updateDashboardStats;
window.loadRecentTests = loadRecentTests;
window.handleDashboardTab = handleDashboardTab;
window.checkSystemStatus = checkSystemStatus;
window.goToAppTab = goToAppTab;
window.openDashboardViewAll = openDashboardViewAll;

// Provide safe global stubs for actions used in Recent Tests if legacy functions aren't loaded yet
// One-shot fallbacks (no retry loop to avoid recursion)
if (typeof window.viewTest !== 'function') {
    window.viewTest = function(id) {
        if (typeof window.showReportPreview === 'function') {
            return window.showReportPreview(id);
        }
        console.warn('viewTest not available yet');
        showNotification('View not available yet. Please try again after scripts load.', 'warning');
    };
}

if (typeof window.printReport !== 'function') {
    window.printReport = function(id) {
        if (typeof window.printTestReport === 'function') {
            return window.printTestReport(id);
        }
        if (typeof window.generatePDFReport === 'function') {
            return window.generatePDFReport(id, 'standard');
        }
        console.warn('printReport not available yet');
        showNotification('Print not available yet. Please try again after scripts load.', 'warning');
    };
}

// Ensure Edit action always has a handler; fall back to view if editor not loaded yet
if (typeof window.enterTestResult !== 'function') {
    window.enterTestResult = function(orderId) {
        if (typeof window.enterTestResultImpl === 'function') {
            return window.enterTestResultImpl(orderId);
        }
        if (typeof window.viewTest === 'function') {
            // Fallback to viewing details if editor not ready
            return window.viewTest(orderId);
        }
        showNotification('Edit not available yet. Please try again in a moment.', 'warning');
    };
}

// ============================
// Dashboard Modal: Test Lists
// ============================

function normalizeOrders(data) {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.results)) return data.results;
    if (data && Array.isArray(data.data)) return data.data;
    return [];
}

async function fetchOrdersForDashboard() {
    try {
        // Use centralized API function if available
        let data;
        if (typeof window.getTestOrders === 'function') {
            data = await window.getTestOrders({ ordering: '-created_at', limit: 100 });
        } else {
            const response = await authenticatedFetch(`${API_BASE_URL}/test-orders/?ordering=-created_at&limit=100`);
            if (!response.ok) throw new Error('Failed to fetch test orders');
            data = await response.json();
        }
        return normalizeOrders(data);
    } catch (e) {
        console.error('Failed to load test orders for dashboard modal:', e);
        showNotification('Error loading test orders: ' + e.message, 'danger');
        return [];
    }
}

function buildDashboardModal() {
    let modal = document.getElementById('dashboardTestsModal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'dashboardTestsModal';
    modal.className = 'modal fade';
    modal.tabIndex = -1;
    modal.innerHTML = `
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="dashboardTestsTitle">Tests</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th>Test ID</th>
                                    <th>Patient</th>
                                    <th>Test Type</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="dashboardTestsBody">
                                <tr><td colspan="6" class="text-center text-muted">Loading...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    return modal;
}

function orderMatchesFilter(order, filter) {
    if (!filter || filter === 'all') return true;
    if (filter === 'pending') return (order.status || '').toLowerCase() === 'pending';
    if (filter === 'completed') return (order.status || '').toLowerCase() === 'completed';
    if (filter === 'today') {
        const d = order.created_at || order.order_date;
        if (!d) return false;
        const dt = new Date(d);
        const today = new Date();
        return dt.getFullYear() === today.getFullYear() &&
               dt.getMonth() === today.getMonth() &&
               dt.getDate() === today.getDate();
    }
    return true;
}

function deriveTestType(order) {
    const direct = order.test_name || order.test_type || order.testType || order.test_type_name;
    if (direct && direct !== 'Unknown') return direct;

    const items = Array.isArray(order.test_items) ? order.test_items : (Array.isArray(order.items) ? order.items : []);
    if (!items.length) return 'Unknown';
    const first = items[0];
    return first.test_name || first.test_code || first.test?.test_name || first.test?.name || 'Unknown';
}

function derivePatientName(order) {
    const direct = order.patient_name || order.patient_full_name || order.patientName;
    if (direct && direct !== 'Unknown') return direct;

    if (order.patient && typeof order.patient === 'object') {
        const p = order.patient;
        return p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown';
    }
    return 'Unknown';
}

async function openTestsModal(filter = 'all', title = null) {
    const modal = buildDashboardModal();
    const body = modal.querySelector('#dashboardTestsBody');
    const titleEl = modal.querySelector('#dashboardTestsTitle');
    titleEl.textContent = title || (filter === 'all' ? 'All Tests' :
                                   filter === 'pending' ? 'Pending Tests' :
                                   filter === 'completed' ? 'Completed Tests' :
                                   filter === 'today' ? 'Today Tests' : 'Tests');
    body.innerHTML = `<tr><td colspan="6" class="text-center text-muted">Loading...</td></tr>`;
    const orders = await fetchOrdersForDashboard();
    const filtered = orders.filter(o => orderMatchesFilter(o, filter));
    if (!filtered.length) {
        body.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No records found</td></tr>`;
    } else {
        body.innerHTML = filtered.map(o => {
            const id = o.order_id || o.order_number || o.order_no || o.id || o.uuid || '';
            const patient = derivePatientName(o);
            const ttype = deriveTestType(o);
            const status = (o.status || 'pending').toLowerCase();
            const dateText = o.created_at ? new Date(o.created_at).toLocaleDateString() :
                              (o.order_date ? new Date(o.order_date).toLocaleDateString() : 'N/A');
            const items = Array.isArray(o.test_items) ? o.test_items : (Array.isArray(o.items) ? o.items : []);
            const hasResults = items.some(it => it.result || (Array.isArray(it.results) && it.results.length > 0));
            const canEdit = (status === 'pending' || status === 'in_progress') && !hasResults;
            return `
                <tr>
                    <td>#${id}</td>
                    <td>${patient}</td>
                    <td>${ttype}</td>
                    <td><span class="badge bg-${status === 'completed' ? 'success' : status === 'in_progress' ? 'info' : 'warning'}">${status}</span></td>
                    <td>${dateText}</td>
                    <td>
                        <div class="btn-group">
                            ${canEdit ? `<button class="btn btn-sm btn-outline-success" onclick=\"enterTestResult('${id}')\"><i class='fas fa-edit'></i> Edit</button>` : ''}
                            <button class="btn btn-sm btn-outline-primary" onclick=\"viewTest('${id}')\"><i class='fas fa-eye'></i> View</button>
                            <button class="btn btn-sm btn-outline-secondary" onclick=\"printReport('${id}')\"><i class='fas fa-print'></i> Print</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
}

// Expose
window.openTestsModal = openTestsModal;

// Quick delete patient from Dashboard Recent Tests
async function deletePatientQuick(patientId) {
    try {
        if (!patientId) return;
        if (!confirm('Delete this patient from backend? This cannot be undone.')) return;
        
        // Use centralized API function if available (from api-endpoints.js or patients.js)
        if (typeof window.deletePatient === 'function') {
            // Check if it's the API function or the patients.js function
            const funcStr = window.deletePatient.toString();
            if (funcStr.includes('patients.js') || funcStr.includes('deletePatient')) {
                // It's the patients.js function which handles everything
                return await window.deletePatient(patientId);
            }
            // It's the API endpoint function
            await window.deletePatient(patientId);
            showNotification('Patient deleted successfully', 'success');
            invalidatePatientsCache();
            await refreshAllPatientDisplays();
            return;
        }
        
        // Fallback: direct fetch
        const url = `${API_BASE_URL}/patients/${encodeURIComponent(patientId)}/`;
        const resp = await authenticatedFetch(url, { method: 'DELETE' });
        if (!resp.ok) {
            const msg = await resp.text().catch(() => '');
            throw new Error(`Delete failed (${resp.status} ${resp.statusText}) ${url} ${msg || ''}`.trim());
        }
        showNotification('Patient deleted successfully', 'success');
        
        // Invalidate cache and refresh all tabs
        invalidatePatientsCache();
        await refreshAllPatientDisplays();
    } catch (e) {
        console.error('deletePatientQuick error:', e);
        showNotification('Delete failed: ' + e.message, 'danger');
    }
}
window.deletePatientQuick = deletePatientQuick;

// Delete test order from Dashboard Recent Tests
// Uses centralized API endpoint function from api-endpoints.js
async function deleteTestOrder(testOrderId) {
    try {
        if (!testOrderId) {
            showNotification('No test order ID provided', 'danger');
            return;
        }
        
        if (!confirm('Archive this test order? It will be hidden but preserved for audit purposes.')) return;
        
        console.log('Archiving test order (soft-delete via DELETE endpoint):', testOrderId);
        
        // Use centralized API function (now tries DELETE first, then PATCH fallback)
        if (typeof window.archiveTestOrder === 'function') {
            try {
                await window.archiveTestOrder(testOrderId);
                showNotification('Test order archived successfully', 'success');
                await refreshAllTestOrderDisplays();
                return;
            } catch (e) {
                console.error('Archive via API function failed:', e);
                throw e; // Re-throw to be caught by outer catch
            }
        }
        
        // Fallback: Direct DELETE (should work now that backend migration is complete)
        try {
            const deleteResp = await authenticatedFetch(`${API_BASE_URL}/test-orders/${testOrderId}/`, {
                method: 'DELETE'
            });
            
            if (deleteResp.ok) {
                console.log('✅ Test order archived via DELETE endpoint');
                showNotification('Test order archived successfully', 'success');
                await refreshAllTestOrderDisplays();
                return;
            }
            
            // If DELETE fails, try PATCH fallback
            if (deleteResp.status === 404) {
                throw new Error(`Test order not found: ${testOrderId}`);
            }
            
            console.warn(`DELETE returned ${deleteResp.status}, trying PATCH fallback...`);
            const patchResp = await authenticatedFetch(`${API_BASE_URL}/test-orders/${testOrderId}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'archived' })
            });
            
            if (patchResp.ok) {
                console.log('✅ Test order archived via PATCH fallback');
                showNotification('Test order archived successfully', 'success');
                await refreshAllTestOrderDisplays();
                return;
            }
            
            const msg = await patchResp.text().catch(() => '');
            throw new Error(`Archive failed (${patchResp.status} ${patchResp.statusText}) ${msg || ''}`.trim());
        } catch (e) {
            if (e.message && e.message.includes('not found')) {
                throw e;
            }
            throw new Error(`Failed to archive test order: ${e.message || 'Unknown error'}`);
        }
        
    } catch (e) {
        console.error('deleteTestOrder error:', e);
        const errorMsg = e.message || 'Failed to archive test order';
        showNotification(`Archive failed: ${errorMsg}`, 'danger');
        
        console.error('❌ Cannot archive test order');
        console.error('💡 Backend DELETE endpoint should work after migration lab_management.0005_add_archived_status_to_test_order');
        console.error('💡 DELETE /lab/test-orders/{id}/ should return 200 and archive the order (status="archived")');
    }
}
window.deleteTestOrder = deleteTestOrder;

window.addEventListener('lab:settings-updated', () => {
    try {
        loadDashboardFinancialSummary();
        loadDashboardStats();
    } catch (_) {}
});
