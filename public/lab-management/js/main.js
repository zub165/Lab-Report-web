// ============================================
// MAIN INITIALIZATION - Tab Routing & App Setup
// ============================================

// Main initialization function
async function initializeApp() {
    console.log('========================================');
    console.log('🚀 Initializing Lab Management System...');
    console.log('Current URL:', window.location.href);
    console.log('API Base URL:', API_BASE_URL);
    console.log('========================================');
    
    // Initialize authentication
    try {
        console.log('Step 1: Authenticating...');
        const authResult = await authenticate();
        console.log('✅ Authentication successful');
        console.log('Auth result:', authResult);
    } catch (error) {
        console.error('❌ Authentication failed:', error);
        showNotification('Failed to connect to backend: ' + error.message, 'danger');
        console.warn('⚠️ Continuing without authentication - some features may not work');
    }
    
    // Initialize dashboard
    try {
        console.log('Step 2: Loading dashboard stats...');
        await loadDashboardStats();
        console.log('✅ Dashboard stats loaded');
        
        console.log('Step 3: Loading recent tests...');
        await loadRecentTests();
        console.log('✅ Recent tests loaded');
    } catch (error) {
        console.error('❌ Failed to initialize dashboard:', error);
        showNotification('Failed to load dashboard data. Please refresh the page.', 'danger');
    }
    
    console.log('✅ Lab Management System initialization complete');
    
    // Setup tab routing
    setupTabRouting();
    
    // Setup global event listeners
    setupGlobalEventListeners();

    // Ensure required global handlers exist to prevent undefined function errors
    ensureGlobalHandlers();
}

// Setup tab routing
function setupTabRouting() {
    // Get all tab panes
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    // Ensure sidebar links switch tabs reliably
    const sidebarLinks = document.querySelectorAll('.sidebar .nav-link[data-bs-toggle="tab"]');
    sidebarLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetSelector = this.getAttribute('href');
            const targetEl = document.querySelector(targetSelector);
            if (!targetEl) return;
            // Use Bootstrap Tab API to activate
            try {
                const tab = new bootstrap.Tab(this);
                tab.show();
            } catch (_) {
                // Fallback: manually toggle classes
                document.querySelectorAll('.sidebar .nav-link').forEach(l => l.classList.remove('active'));
                this.classList.add('active');
                tabPanes.forEach(p => p.classList.remove('active', 'show'));
                targetEl.classList.add('active', 'show');
                // Emit shown event so loaders run
                targetEl.dispatchEvent(new Event('shown.bs.tab'));
            }
        });
    });
    
    tabPanes.forEach(pane => {
        // Listen for Bootstrap tab events
        const triggers = document.querySelectorAll(`[data-bs-target="#${pane.id}"], [href="#${pane.id}"]`);
        triggers.forEach(trigger => {
            trigger.addEventListener('shown.bs.tab', async function() {
                const tabId = pane.id;
                console.log('Tab shown:', tabId);
                
                switch(tabId) {
                    case 'dashboard':
                        if (typeof handleDashboardTab === 'function') {
                            await handleDashboardTab();
                        }
                        break;
                    case 'lab-tests':
                        if (typeof loadTests === 'function') {
                            await loadTests();
                        }
                        break;
                    case 'patients':
                        if (typeof loadPatients === 'function') {
                            await loadPatients();
                        }
                        break;
                    case 'reports':
                        if (typeof handleReportsTab === 'function') {
                            await handleReportsTab('all');
                        }
                        break;
                    case 'archive':
                        if (typeof handleArchiveTab === 'function') {
                            await handleArchiveTab();
                        }
                        break;
                    case 'images':
                        if (typeof handleImagesTab === 'function') {
                            await handleImagesTab();
                        }
                        break;
                    case 'appointments':
                        if (typeof loadAppointmentsTable === 'function') {
                            await loadAppointmentsTable();
                        }
                        break;
                    case 'payments':
                        if (typeof loadPaymentsTable === 'function') {
                            await loadPaymentsTable();
                        }
                        break;
                    case 'settingsTab':
                    case 'settings':
                        if (typeof loadSettings === 'function') {
                            await loadSettings();
                        }
                        break;
                    case 'staffTab':
                        if (typeof handleStaffTab === 'function') {
                            await handleStaffTab();
                        }
                        break;
                }
            });
        });
    });
    
    // Dashboard order-summary cards only (exclude finance/patient summary cards)
    document.querySelectorAll('[data-dashboard-open="orders"]').forEach(card => {
        card.addEventListener('click', function () {
            const filter = this.getAttribute('data-dashboard-filter') || 'all';
            const titles = {
                all: 'All orders',
                pending: 'Pending orders',
                today: "Today's orders",
                completed: 'Completed orders',
            };
            if (typeof openTestsModal === 'function') {
                openTestsModal(filter, titles[filter] || 'Orders');
            }
        });
    });
}

// Setup global event listeners
function setupGlobalEventListeners() {
    // Global fix for Bootstrap modal aria-hidden accessibility issues
    document.addEventListener('hide.bs.modal', function(event) {
        const modal = event.target;
        const focusedElement = modal.querySelector(':focus');
        if (focusedElement) {
            focusedElement.blur();
            const trigger = document.querySelector('[data-bs-target="#' + modal.id + '"]') || 
                          document.querySelector('[data-bs-toggle="modal"][href="#' + modal.id + '"]');
            if (trigger) {
                setTimeout(() => {
                    try {
                        trigger.focus();
                    } catch (e) {
                        document.body.focus();
                    }
                }, 50);
            }
        }
    });
    
    document.addEventListener('hidden.bs.modal', function(event) {
        const modal = event.target;
        const focusedElements = modal.querySelectorAll(':focus');
        focusedElements.forEach(el => {
            try {
                el.blur();
            } catch (e) {
                // Ignore blur errors
            }
        });
    });
    
    // Search functionality
    const searchInput = document.querySelector('input[placeholder="Search..."]');
    if (searchInput) {
        const searchButton = searchInput.nextElementSibling;
        if (searchButton) {
            searchButton.addEventListener('click', async () => {
                const query = searchInput.value.trim();
                if (query && typeof searchTests === 'function') {
                    try {
                        const results = await searchTests(query);
                        if (typeof updateSearchResults === 'function') {
                            updateSearchResults(results);
                        }
                    } catch (error) {
                        console.error('Search failed:', error);
                    }
                }
            });
        }
    }
    
    // System status check (every 30 seconds)
    setInterval(async () => {
        try {
            if (typeof checkSystemStatus === 'function') {
                const status = await checkSystemStatus();
                if (typeof updateSystemStatus === 'function') {
                    updateSystemStatus(status);
                }
            }
        } catch (error) {
            console.error('System status check failed:', error);
        }
    }, 30000);
}

/** Staff tab (superuser): optional focus / reset message */
async function handleStaffTab() {
    const hint = document.getElementById('staffBulkHint');
    if (hint && !hint.textContent) {
        hint.textContent = '';
    }
}

/**
 * Parse JSON from #staffBulkJson and POST to /lab/users/bulk_create/ (superuser only).
 */
async function submitStaffBulkUsers() {
    const ta = document.getElementById('staffBulkJson');
    const out = document.getElementById('staffBulkResult');
    const hint = document.getElementById('staffBulkHint');
    if (!ta || typeof bulkCreateLabUsers !== 'function') {
        showNotification('Staff bulk create is not available.', 'danger');
        return;
    }
    let users;
    try {
        users = JSON.parse(String(ta.value || '').trim() || '[]');
    } catch (e) {
        showNotification('Invalid JSON: ' + (e && e.message ? e.message : e), 'warning');
        return;
    }
    if (!Array.isArray(users) || users.length === 0) {
        showNotification('Enter a non-empty JSON array of user objects.', 'warning');
        return;
    }
    if (hint) hint.textContent = 'Submitting…';
    try {
        const res = await bulkCreateLabUsers(users);
        if (out) {
            out.style.display = 'block';
            out.textContent = JSON.stringify(res, null, 2);
        }
        const ok = res.created_count || 0;
        const bad = res.error_count || 0;
        showNotification(`Created ${ok} user(s). ${bad} error(s).`, bad ? 'warning' : 'success');
    } catch (e) {
        const msg = e && e.message ? e.message : String(e);
        showNotification(msg, 'danger');
        if (out) {
            out.style.display = 'block';
            out.textContent = msg;
        }
    } finally {
        if (hint) hint.textContent = '';
    }
}

window.handleStaffTab = handleStaffTab;
window.submitStaffBulkUsers = submitStaffBulkUsers;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);

// ------------------------------------------------------------------
// Safety: provide global no-op/fallbacks so UI never breaks on click
// ------------------------------------------------------------------
function ensureGlobalHandlers() {
    const notify = (name) => () => showNotification(`${name} not available yet`, 'warning');
    const ensure = (key, fn) => { if (typeof window[key] !== 'function') window[key] = fn; };

    // Lab tests actions
    ensure('viewTest', notify('View'));
    ensure('printReport', notify('Print'));
    ensure('enterTestResult', notify('Edit result'));
    ensure('openReportTemplate', notify('Report preview'));

    // Patients
    ensure('loadPatients', async () => { /* no-op */ });
    ensure('submitNewPatient', notify('Add patient'));
    ensure('viewPatient', notify('View patient'));
    ensure('editPatient', notify('Edit patient'));
    ensure('deletePatient', notify('Delete patient'));

    // Appointments
    ensure('loadAppointmentsTable', async () => { /* no-op */ });
    ensure('submitAppointment', notify('Schedule appointment'));
    ensure('viewAppointment', notify('View appointment'));
    ensure('deleteAppointment', notify('Delete appointment'));

    // Payments
    ensure('loadPaymentsTable', async () => { /* no-op */ });
    ensure('submitPayment', notify('Process payment'));
    ensure('viewPayment', notify('View payment'));

    // Reports
    ensure('handleReportsTab', async () => { /* no-op */ });

    // Settings
    ensure('loadSettings', async () => { /* no-op */ });
}

