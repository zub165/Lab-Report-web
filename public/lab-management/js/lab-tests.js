// ============================================
// LAB TESTS TAB - Test Orders Management
// ============================================

// HTML escape utility
function escapeHtml(text) {
    if (text == null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

// Load tests list from backend (fallback simple table loader if legacy not present)
async function loadTests() {
    try {
        if (window.loadTestsFromScript) {
            return await window.loadTestsFromScript();
        }
        // Use centralized API function if available (from api-endpoints.js)
        let data;
        if (typeof window.getTestOrders === 'function') {
            data = await window.getTestOrders({ ordering: '-created_at', limit: 25 });
        } else {
            const response = await authenticatedFetch(`${API_BASE_URL}/test-orders/?ordering=-created_at&limit=25`);
            if (!response.ok) throw new Error('Failed to fetch test orders');
            data = await response.json();
        }
        
        const orders = Array.isArray(data) ? data : (data.results || data.data || []);
        const tbody = document.getElementById('testsTableBody');
        if (!tbody) return orders;
        if (orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No test orders</td></tr>';
            return orders;
        }
        // Filter out archived/deleted orders (they'll be hidden from list after archiving)
        // Backend should add 'archived' to status choices: ['pending', 'in_progress', 'completed', 'cancelled', 'archived']
        const activeOrders = orders.filter(o => {
            const status = (o.status || 'pending').toLowerCase();
            const isDeleted = o.deleted === true || o.is_active === false || o.deleted_at !== null;
            // Hide archived, deleted, and soft-deleted orders
            return status !== 'archived' && status !== 'deleted' && !isDeleted;
        });
        
        if (activeOrders.length === 0) {
            tbody.innerHTML = `
              <tr>
                <td colspan="6" class="text-center text-muted">
                  No active test orders.
                  <button class="btn btn-sm btn-outline-primary ms-2" onclick="(function(){ try{ document.getElementById('test-types-tab')?.click(); }catch(_){} })()">View all available tests</button>
                </td>
              </tr>`;
            return orders;
        }
        
        // Use shared resolvers with lookup fallback
        const lookup = await getPatientsLookup();
        const resolveDate = (order) => order.created_at || order.order_date || order.date || null;
        // Resolve all orders with async lookup
        const resolvedOrders = await Promise.all(activeOrders.map(async o => {
            // Use human-friendly `order_id` for detail/edit/delete/report routes (UUID PK lookups may 404 depending on DB storage).
            const id = o.order_id || o.order_no || o.order_number || o.id || o.uuid || '';
            const patient = await resolvePatientName(o, lookup);
            const ttype = await resolveTestType(o);
            const status = (o.status || 'pending').toLowerCase();
            const dateVal = resolveDate(o);
            const dateText = dateVal ? new Date(dateVal).toLocaleDateString() : 'N/A';
            const items = resolveTestItems(o);
            const hasResults = items.some(it => it.result || (Array.isArray(it.results) && it.results.length > 0));
            const canEdit = (status === 'pending' || status === 'in_progress') && !hasResults;
            return { id, patient, ttype, status, dateText, items, hasResults, canEdit };
        }));
        
        tbody.innerHTML = resolvedOrders.map(({ id, patient, ttype, status, dateText, items, hasResults, canEdit }) => {
            return `
                <tr>
                    <td>#${id}</td>
                    <td>${patient}</td>
                    <td>${ttype}</td>
                    <td><span class="badge bg-${status === 'completed' ? 'success' : status === 'in_progress' ? 'info' : 'warning'}">${status}</span></td>
                    <td>${dateText}</td>
                    <td>
                        <div class="btn-group">
                            ${canEdit ? `<button class="btn btn-sm btn-outline-success" onclick="enterTestResult('${id}')"><i class='fas fa-edit'></i> Edit</button>` : ''}
                            <button class="btn btn-sm btn-outline-primary" onclick="viewTest('${id}')"><i class='fas fa-eye'></i> View</button>
                            <button class="btn btn-sm btn-outline-secondary" onclick="printReport('${id}')"><i class='fas fa-print'></i> Print</button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteTestOrderFromLabTests('${id}')" title="Delete Test Order"><i class='fas fa-trash'></i> Delete</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
        return orders;
    } catch (e) {
        console.error('Error loading tests:', e);
        showNotification('Error loading tests: ' + e.message, 'danger');
    }
}

// ============================================
// NEW TEST MODAL - Populate patients/tests + submit
// ============================================

let _newTestModalWired = false;
let _newTestCatalogControlsWired = false;
let _currentDoctorIdCache = null;

window.clearDoctorIdCache = function clearDoctorIdCache() {
    _currentDoctorIdCache = null;
};

if (typeof window !== 'undefined' && !window.__labProfileLinkedListener) {
    window.__labProfileLinkedListener = true;
    window.addEventListener('lab:lab-profile-linked', () => {
        _currentDoctorIdCache = null;
    });
}

function updateNewTestSelectionCount() {
    const n = document.querySelectorAll('#newTestCatalogChecks input[name="test_codes"]:checked').length;
    const el = document.getElementById('newTestSelectedCount');
    if (el) el.textContent = `${n} selected`;
}

function filterNewTestCatalog() {
    const q = (document.getElementById('newTestCatalogSearch')?.value || '').trim().toLowerCase();
    document.querySelectorAll('#newTestCatalogChecks .new-test-catalog-row').forEach(row => {
        const t = (row.dataset.filterText || '').toLowerCase();
        row.style.display = !q || t.includes(q) ? '' : 'none';
    });
}

function wireNewTestCatalogControls() {
    if (_newTestCatalogControlsWired) return;
    _newTestCatalogControlsWired = true;
    const cat = document.getElementById('newTestCatalogChecks');
    const search = document.getElementById('newTestCatalogSearch');
    document.getElementById('newTestSelectVisibleBtn')?.addEventListener('click', () => {
        document.querySelectorAll('#newTestCatalogChecks .new-test-catalog-row').forEach(row => {
            if (row.style.display === 'none') return;
            const cb = row.querySelector('input[type="checkbox"][name="test_codes"]');
            if (cb) cb.checked = true;
        });
        updateNewTestSelectionCount();
    });
    document.getElementById('newTestClearTestsBtn')?.addEventListener('click', () => {
        document.querySelectorAll('#newTestCatalogChecks input[type="checkbox"][name="test_codes"]').forEach(cb => { cb.checked = false; });
        updateNewTestSelectionCount();
    });
    search?.addEventListener('input', filterNewTestCatalog);
    cat?.addEventListener('change', (e) => {
        if (e.target?.matches?.('input[name="test_codes"]')) updateNewTestSelectionCount();
    });
}

async function getCurrentDoctorId() {
    if (_currentDoctorIdCache) return _currentDoctorIdCache;
    try {
        const resp = await authenticatedFetch(`${API_BASE_URL}/auth/profile/`);
        if (!resp.ok) {
            console.warn('auth/profile not OK:', resp.status);
            return null;
        }
        const data = await resp.json();
        const inner = data?.data || data;
        // TestOrder.doctor is FK to LabUser — must use lab_user_id, not Django User id
        const id = inner.lab_user_id ?? inner.lab_user?.id ?? inner.doctor_id ?? null;
        if (inner && id == null && (inner.username || inner.email)) {
            console.warn(
                'Profile has no lab_user_id — open Settings → Complete your lab profile (or ask an admin to link you).'
            );
        }
        _currentDoctorIdCache = id;
        return id;
    } catch (e) {
        console.warn('Failed to resolve current doctor id:', e);
        return null;
    }
}

async function populateNewTestModal() {
    const modal = document.getElementById('newTestModal');
    const form = document.getElementById('newTestForm');
    if (!modal || !form) return;

    const patientSelect = form.querySelector('select[name="patientId"]');
    const catalogEl = document.getElementById('newTestCatalogChecks');
    const submitBtn = modal.querySelector('.modal-footer button.btn.btn-primary');

    if (!patientSelect || !catalogEl) return;

    wireNewTestCatalogControls();

    // Reset selects + catalog
    patientSelect.innerHTML = `<option value="">Select Patient</option>`;
    catalogEl.innerHTML = '';
    const searchEl = document.getElementById('newTestCatalogSearch');
    if (searchEl) searchEl.value = '';
    updateNewTestSelectionCount();

    try {
        const [patientsRaw, testsRaw] = await Promise.all([
            (typeof window.getPatients === 'function' ? window.getPatients(true) : []),
            (typeof window.getLabTests === 'function'
                ? window.getLabTests({ is_active: true })
                : (await (await authenticatedFetch(`${API_BASE_URL}/tests/`)).json())
            ),
        ]);

        const patients = Array.isArray(patientsRaw) ? patientsRaw : (patientsRaw?.results || patientsRaw?.data || []);
        const tests = Array.isArray(testsRaw) ? testsRaw : (testsRaw?.results || testsRaw?.data || []);

        // Patients (value should be patient_id e.g. PAT001010 for create serializer)
        patients
            .slice()
            .sort((a, b) => String(a.full_name || '').localeCompare(String(b.full_name || '')))
            .forEach(p => {
                const pid = p.patient_id || '';
                const name = p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim();
                if (!pid) return;
                const label = `${pid}${name ? ' - ' + name : ''}`;
                const opt = document.createElement('option');
                opt.value = pid;
                opt.textContent = label;
                patientSelect.appendChild(opt);
            });

        // Tests — multi-select checkboxes (test_code sent to API)
        tests
            .filter(t => t && (t.is_active === undefined || t.is_active === true))
            .slice()
            .sort((a, b) => String(a.test_name || '').localeCompare(String(b.test_name || '')))
            .forEach((t, idx) => {
                const code = (t.test_code || '').toString().trim();
                const name = t.test_name || t.name || 'Test';
                if (!code) return;
                const safeId = `nt_cb_${idx}_${code.replace(/\W/g, '_')}`;
                const row = document.createElement('div');
                row.className = 'form-check mb-1 new-test-catalog-row';
                row.dataset.filterText = `${name} ${code}`.toLowerCase();
                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.className = 'form-check-input';
                cb.name = 'test_codes';
                cb.value = code;
                cb.id = safeId;
                const lab = document.createElement('label');
                lab.className = 'form-check-label';
                lab.htmlFor = safeId;
                lab.append(document.createTextNode(`${name} `));
                const sm = document.createElement('small');
                sm.className = 'text-muted';
                sm.textContent = code;
                lab.appendChild(sm);
                row.appendChild(cb);
                row.appendChild(lab);
                catalogEl.appendChild(row);
            });

        filterNewTestCatalog();

        // If no patients, guide user
        const hasPatients = patientSelect.options.length > 1;
        if (!hasPatients) {
            if (submitBtn) submitBtn.disabled = true;
            showNotification('No patients found. Add a patient first (Patients tab) then create a test.', 'warning');
        } else {
            if (submitBtn) submitBtn.disabled = false;
        }
    } catch (e) {
        console.error('Failed to populate New Test modal:', e);
        showNotification('Failed to load patients/tests for New Test. Please refresh.', 'danger');
    }
}

function wireNewTestModal() {
    if (_newTestModalWired) return;
    const modal = document.getElementById('newTestModal');
    if (!modal) return;
    _newTestModalWired = true;
    wireNewTestCatalogControls();

    modal.addEventListener('show.bs.modal', () => {
        // Populate every time to stay fresh
        populateNewTestModal();
        // Default date = today
        const form = document.getElementById('newTestForm');
        const dateInput = form?.querySelector('input[name="testDate"]');
        if (dateInput && !dateInput.value) {
            const d = new Date();
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            dateInput.value = `${yyyy}-${mm}-${dd}`;
        }
    });
}

async function submitNewTest() {
    const form = document.getElementById('newTestForm');
    if (!form) return;
    try {
        const fd = new FormData(form);
        const patientId = (fd.get('patientId') || '').toString().trim(); // PAT...
        const priority = (fd.get('priority') || 'routine').toString().trim();
        const notes = (fd.get('notes') || '').toString();

        const selectedCodes = [...form.querySelectorAll('input[name="test_codes"]:checked')]
            .map(cb => (cb.value || '').toString().trim())
            .filter(Boolean);
        // De-dupe
        const uniqueCodes = [...new Set(selectedCodes)];

        if (!patientId) return showNotification('Select a patient', 'warning');
        if (!uniqueCodes.length) return showNotification('Select at least one test', 'warning');

        const doctorId = await getCurrentDoctorId();
        if (!doctorId) {
            showNotification(
                'No lab staff profile for this login. Open Settings and use “Complete your lab profile”, or ask a lab admin to link your account.',
                'danger'
            );
            return;
        }

        const orderData = {
            patient: patientId,
            doctor: doctorId,
            priority,
            clinical_notes: notes,
            test_items: uniqueCodes.map(test_code => ({ test_code })),
        };

        if (typeof window.createTestOrder !== 'function') {
            throw new Error('createTestOrder() not available');
        }

        const createdOrder = await window.createTestOrder(orderData);
        const createdOrderId = createdOrder?.order_id || createdOrder?.id || '';
        showNotification(`Test order created successfully${createdOrderId ? ': #' + createdOrderId : ''}`, 'success');

        // Close modal + refresh tables
        const modalEl = document.getElementById('newTestModal');
        if (modalEl) {
            const inst = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
            inst.hide();
        }
        if (typeof window.refreshAllTestOrderDisplays === 'function') {
            await window.refreshAllTestOrderDisplays();
        } else if (typeof loadTests === 'function') {
            await loadTests();
        }
        if (typeof window.openTestsModal === 'function') {
            // Keep the dashboard modal in sync if the user created the order from there.
            const activeModal = document.getElementById('dashboardTestsModal');
            if (activeModal?.classList.contains('show')) {
                await window.openTestsModal('all', 'All Tests');
            }
        }
        form.reset();
    } catch (e) {
        console.error('submitNewTest error:', e);
        showNotification(`Failed to create test: ${e.message || 'Unknown error'}`, 'danger');
    }
}

// Helpers
function ensureModal(id, title) {
    let modal = document.getElementById(id);
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = id;
    modal.className = 'modal fade';
    modal.tabIndex = -1;
    modal.innerHTML = `
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">${title}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div id="${id}-content">Loading...</div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    return modal;
}

// Get default report template from settings, fallback to Quest-style layout
async function getDefaultTemplate() {
    try {
        const s = await authenticatedFetch(`${API_BASE_URL}/settings/ui/`);
        if (!s.ok) return 'quest';
        const data = await s.json();
        // settings may be single object or paginated
        const obj = Array.isArray(data) ? data[0] : (data.results?.[0] || data || {});
        const t = (obj.default_template || 'quest').toLowerCase();
        if (['standard','modern','quest'].includes(t)) return t;
        return 'quest';
    } catch (_) {
        return 'quest';
    }
}

// View Test Order report using settings.default_template
async function viewTest(orderId) {
    try {
        const template = await getDefaultTemplate();
        // Use client-side professional renderer (backend /lab/reports/{id}/ expects GeneratedReport PK, not order id)
        return openReportTemplate(orderId, false, template);
    } catch (e) {
        console.error('viewTest error:', e);
        // Fallback to client-side HTML template rendering
        try {
            return await openReportTemplate(orderId, false);
        } catch (inner) {
            showNotification('Failed to open report: ' + (inner.message || e.message), 'danger');
        }
    }
}

/** Lab test catalog — normal_range / unit when order item only has test UUID. */
async function getTestCatalog() {
    try {
        const cacheKey = 'lab_tests_catalog_cache_v1';
        const cachedRaw = localStorage.getItem(cacheKey);
        if (cachedRaw) {
            try {
                const cached = JSON.parse(cachedRaw);
                if (cached && Array.isArray(cached.data) && (Date.now() - (cached.ts || 0)) < 5 * 60 * 1000) {
                    return cached.data;
                }
            } catch (_) {}
        }
        const resp = await authenticatedFetch(`${API_BASE_URL}/tests/?limit=500`);
        if (!resp.ok) return [];
        const data = await resp.json();
        const arr = Array.isArray(data) ? data : (data.results || data.data || []);
        try {
            localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: arr }));
        } catch (_) {}
        return arr;
    } catch (_) {
        return [];
    }
}

function catalogByCodeMap(catalog) {
    const m = new Map();
    for (const t of catalog) {
        const code = String(t.test_code || t.code || '').trim();
        if (!code) continue;
        m.set(code, t);
        m.set(code.toUpperCase(), t);
    }
    return m;
}

function resolveRefRangeFromCatalog(testCode, item, testObj, testByCode) {
    const code = String(testCode || '').trim();
    const meta = code ? (testByCode.get(code) || testByCode.get(code.toUpperCase())) : null;
    const fromCat = meta && String(meta.normal_range || meta.reference_range || '').trim();
    if (fromCat && fromCat.toLowerCase() !== 'see reference') return fromCat;
    const obj = testObj && typeof testObj === 'object' ? testObj : {};
    const raw = String(item.reference_range || obj.normal_range || obj.reference_range || '').trim();
    if (raw && raw.toLowerCase() !== 'see reference') return raw;
    return fromCat || '—';
}

function resolveUnitFromCatalog(testCode, item, testObj, testByCode) {
    const obj = testObj && typeof testObj === 'object' ? testObj : {};
    const code = String(testCode || '').trim();
    const meta = code ? (testByCode.get(code) || testByCode.get(code.toUpperCase())) : null;
    return String(item.unit || obj.unit || (meta && meta.unit) || '').trim();
}

// Enter results for all line items (panels = BMP/CMP/CBC rows; others = single value)
async function enterTestResult(orderId) {
    try {
        let order = null;
        const resp = await authenticatedFetch(`${API_BASE_URL}/test-orders/${encodeURIComponent(orderId)}/`);
        if (resp.ok) {
            order = await resp.json();
        } else {
            const listResp = await authenticatedFetch(`${API_BASE_URL}/test-orders/?ordering=-created_at&limit=100`);
            if (listResp.ok) {
                const listData = await listResp.json();
                const orders = Array.isArray(listData) ? listData : (listData.results || listData.data || []);
                order = orders.find(o => {
                    const keys = [o.id, o.uuid, o.order_id, o.order_number];
                    return keys.some(k => k && String(k) === String(orderId));
                });
            }
            if (!order) throw new Error('Test order not found');
        }

        const items = Array.isArray(order.test_items) ? order.test_items : (Array.isArray(order.items) ? order.items : []);
        if (!items.length) throw new Error('No test items found');

        const defs = await fetchPanelDefinitions();
        const catalog = await getTestCatalog();
        const testByCode = catalogByCodeMap(catalog);
        const displayOrderId = order.order_id || order.order_number || orderId;

        const blocks = items.map((item, idx) => {
            const testObj = item.test || item.lab_test || item.test_type || {};
            const testObjMap = testObj && typeof testObj === 'object' ? testObj : {};
            const testCode = item.test_code || testObjMap.test_code || '';
            const testName = item.test_name || testObjMap.test_name || `Test ${idx + 1}`;
            const panelDef = testCode && defs[testCode] ? defs[testCode] : null;
            const existing = item.result || null;
            const merged = mergePanelAnalytes(panelDef, existing && existing.panel_analytes ? existing.panel_analytes : []);

            if (panelDef && merged.length) {
                const rows = merged.map((row) => {
                    const v = row.value && row.value !== '—' ? String(row.value) : '';
                    return `
                      <tr data-analyte-code="${escapeHtml(String(row.code))}">
                        <td>${escapeHtml(String(row.name))}</td>
                        <td style="min-width:140px">
                          <input type="text" class="form-control form-control-sm"
                            data-panel-inp="1" data-item-id="${escapeHtml(String(item.id))}" data-code="${escapeHtml(String(row.code))}"
                            value="${escapeHtml(v)}" placeholder="—" />
                        </td>
                        <td class="small text-muted">${escapeHtml(String(row.unit || ''))}</td>
                        <td class="small">${row.ref_low != null && row.ref_high != null ? escapeHtml(`${row.ref_low}–${row.ref_high}`) : '—'}</td>
                      </tr>`;
                }).join('');
                return `
                  <div class="border rounded p-3 mb-3 bg-light">
                    <div class="fw-bold mb-2">${escapeHtml(testName)} <span class="text-muted">(${escapeHtml(testCode)})</span> — panel</div>
                    <div class="table-responsive">
                      <table class="table table-sm align-middle mb-0">
                        <thead><tr><th>Analyte</th><th>Result</th><th>Unit</th><th>Ref.</th></tr></thead>
                        <tbody>${rows}</tbody>
                      </table>
                    </div>
                  </div>`;
            }

            const refRange = resolveRefRangeFromCatalog(testCode, item, testObjMap, testByCode);
            const unit = resolveUnitFromCatalog(testCode, item, testObjMap, testByCode);
            const rv = existing && existing.result_value ? String(existing.result_value) : '';
            return `
              <div class="border rounded p-3 mb-3">
                <div class="fw-bold mb-2">${escapeHtml(testName)}${testCode ? ` <span class="text-muted">(${escapeHtml(testCode)})</span>` : ''}</div>
                <div class="small text-muted mb-2">Reference: ${escapeHtml(String(refRange))}${unit ? ` · Unit: ${escapeHtml(String(unit))}` : ''}</div>
                <label class="form-label">Result</label>
                <input type="text" class="form-control" data-simple-inp="1" data-item-id="${escapeHtml(String(item.id))}"
                  value="${escapeHtml(rv)}" placeholder="Result value" />
              </div>`;
        }).join('');

        const modal = ensureModal('editResultModal', 'Enter Test Results');
        const el = modal.querySelector('#editResultModal-content');
        el.innerHTML = `
            <div class="mb-3"><strong>Order:</strong> #${escapeHtml(String(displayOrderId))}</div>
            ${blocks}
            <div class="text-end mt-3">
                <button class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button class="btn btn-primary" id="saveResultBtn">Save all results</button>
            </div>
        `;
        const bs = new bootstrap.Modal(modal);
        bs.show();

        el.querySelector('#saveResultBtn').onclick = async () => {
            try {
                for (const item of items) {
                    const testObj = item.test || item.lab_test || item.test_type || {};
                    const testObjMap = testObj && typeof testObj === 'object' ? testObj : {};
                    const testCode = item.test_code || testObjMap.test_code || '';
                    const panelDef = testCode && defs[testCode] ? defs[testCode] : null;
                    const itemPk = item.id;
                    const existing = item.result || null;

                    let payload;
                    if (panelDef && panelDef.length) {
                        const panel_analytes = [];
                        el.querySelectorAll(`input[data-panel-inp][data-item-id="${itemPk}"]`).forEach((inp) => {
                            const code = inp.getAttribute('data-code');
                            const val = (inp.value || '').trim();
                            if (!code || !val) return;
                            const defRow = panelDef.find((d) => String(d.code) === String(code));
                            panel_analytes.push({
                                code,
                                value: val,
                                unit: defRow ? defRow.unit : '',
                                ref_low: defRow ? defRow.ref_low : null,
                                ref_high: defRow ? defRow.ref_high : null
                            });
                        });
                        if (!panel_analytes.length) {
                            showNotification(`Enter at least one analyte result for ${testCode || 'panel'}`, 'warning');
                            return;
                        }
                        payload = {
                            test_order_item: itemPk,
                            result_value: `Panel (${panel_analytes.length} analytes)`,
                            panel_analytes,
                            reference_range: '—',
                            unit: '—',
                            interpretation: 'normal'
                        };
                    } else {
                        const inp = el.querySelector(`input[data-simple-inp][data-item-id="${itemPk}"]`);
                        const val = inp ? (inp.value || '').trim() : '';
                        if (!val) {
                            showNotification(`Enter result for ${testCode || 'test'}`, 'warning');
                            return;
                        }
                        const refRange = resolveRefRangeFromCatalog(testCode, item, testObjMap, testByCode);
                        const unit = resolveUnitFromCatalog(testCode, item, testObjMap, testByCode) || 'N/A';
                        payload = {
                            test_order_item: itemPk,
                            result_value: val,
                            reference_range: refRange,
                            unit,
                            interpretation: 'normal',
                            panel_analytes: []
                        };
                    }

                    const url = existing && existing.id
                        ? `${API_BASE_URL}/test-results/${existing.id}/`
                        : `${API_BASE_URL}/test-results/`;
                    const method = existing && existing.id ? 'PATCH' : 'POST';
                    const r = await authenticatedFetch(url, {
                        method,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    if (!r.ok) {
                        const errText = await r.text().catch(() => '');
                        throw new Error(errText || `Save failed (${r.status})`);
                    }
                    const saved = await r.json().catch(() => ({}));
                    item.result = saved;
                }

                showNotification('Results saved', 'success');
                bs.hide();
                _panelDefinitionsCache = null;
                if ((order.status || 'pending').toLowerCase() === 'pending') {
                    try {
                        await authenticatedFetch(`${API_BASE_URL}/test-orders/${encodeURIComponent(orderId)}/`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status: 'in_progress' })
                        });
                    } catch (_) {}
                }
                await refreshAllTestOrderDisplays();
            } catch (err) {
                console.error('save result error:', err);
                showNotification('Failed to save result: ' + err.message, 'danger');
            }
        };
    } catch (e) {
        console.error('enterTestResult error:', e);
        showNotification('Failed to edit test: ' + e.message, 'danger');
    }
}

// Print report for an order
async function printReport(orderId) {
    try {
        const template = await getDefaultTemplate();
        // Use client-side professional renderer (backend /lab/reports/{id}/ expects GeneratedReport PK, not order id)
        return openReportTemplate(orderId, true, template);
    } catch (e) {
        console.error('printReport error:', e);
        // Fallback to client-side template and auto print
        try {
            return await openReportTemplate(orderId, true);
        } catch (inner) {
            showNotification('Failed to print report: ' + (inner.message || e.message), 'danger');
        }
    }
}

// Manage Tests button wiring - open Test Types tab
function setupManageTestsButton() {
    const btn = document.getElementById('manageTestsBtn');
    if (!btn) return;
    btn.addEventListener('click', () => {
        // Prefer Bootstrap Tab API if available
        const trigger = document.getElementById('test-types-tab');
        if (trigger) {
            try {
                const tab = new bootstrap.Tab(trigger);
                tab.show();
                return;
            } catch (_) {}
            trigger.click();
        }
        // Fallback: manually toggle panes
        const listPane = document.getElementById('test-list');
        const typesPane = document.getElementById('test-types');
        if (listPane && typesPane) {
            listPane.classList.remove('active', 'show');
            typesPane.classList.add('active', 'show');
        }
    });
}

// Initialize UI hooks on DOM ready
document.addEventListener('DOMContentLoaded', setupManageTestsButton);

// Ensure test types list is ready even if user doesn't click tab first
document.addEventListener('DOMContentLoaded', () => {
    // Preload in background so tab renders instantly
    setTimeout(() => { try { loadTestTypes(); } catch (_) {} }, 500);
});

// ============================================
// TEST TYPES TAB - Load and render /lab/tests/
// ============================================

async function loadTestTypes() {
    const tbody = document.getElementById('testTypesTableBody');
    if (!tbody) return;

    try {
        let data;
        if (typeof window.getLabTests === 'function') {
            data = await window.getLabTests({ is_active: true });
        } else {
            const resp = await authenticatedFetch(`${API_BASE_URL}/tests/`);
            if (!resp.ok) throw new Error('Failed to fetch tests');
            data = await resp.json();
        }

        const tests = Array.isArray(data) ? data : (data.results || data.data || []);

        if (!tests.length) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No test types found</td></tr>`;
            return;
        }

        tbody.innerHTML = tests
            .filter(t => t && (t.is_active === undefined || t.is_active === true))
            .sort((a, b) => String(a.test_name || '').localeCompare(String(b.test_name || '')))
            .map(t => {
                const id = t.test_code || t.id || '';
                const uuid = t.id || t.uuid || '';
                const name = t.test_name || '—';
                const desc = t.description || '';
                const price =
                    t.price != null && typeof window.formatLabCurrency === 'function'
                        ? window.formatLabCurrency(parseFloat(t.price) || 0)
                        : (t.price != null ? String(t.price) : '');
                const params = [
                    t.unit ? `Unit: ${t.unit}` : '',
                    t.normal_range ? `Range: ${t.normal_range}` : '',
                ].filter(Boolean).join(' • ') || '—';

                return `
                <tr>
                    <td>${escapeHtml(String(id))}</td>
                    <td><strong>${escapeHtml(String(name))}</strong></td>
                    <td>${escapeHtml(String(desc))}</td>
                    <td>${escapeHtml(price)}</td>
                    <td>${escapeHtml(params)}</td>
                    <td>
                        <div class="btn-group">
                          <button class="btn btn-sm btn-outline-primary" onclick="viewTestType('${escapeHtml(String(id))}')">View</button>
                          ${uuid ? `<button class="btn btn-sm btn-outline-secondary" onclick="editTestType('${escapeHtml(String(uuid))}')">Edit</button>` : ''}
                        </div>
                    </td>
                </tr>`;
            }).join('');
    } catch (e) {
        console.error('loadTestTypes error:', e);
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Failed to load test types</td></tr>`;
    }
}

async function viewTestType(testCodeOrId) {
    // Minimal viewer for now (keeps UI stable)
    try {
        // We cannot rely on UUID detail lookups in all DB setups; show from list cache.
        const data = (typeof window.getLabTests === 'function') ? await window.getLabTests({ is_active: true }) : [];
        const tests = Array.isArray(data) ? data : (data.results || data.data || []);
        const t = tests.find(x => String(x.test_code || x.id) === String(testCodeOrId)) || null;
        if (!t) return showNotification('Test not found', 'warning');
        const modal = ensureModal('viewTestTypeModal', 'Test Type');
        const el = modal.querySelector('#viewTestTypeModal-content');
        el.innerHTML = `
            <div class="mb-2"><strong>Test:</strong> ${escapeHtml(t.test_name || '')} ${t.test_code ? `(${escapeHtml(t.test_code)})` : ''}</div>
            <div class="mb-2"><strong>Description:</strong> ${escapeHtml(t.description || '—')}</div>
            <div class="mb-2"><strong>Unit:</strong> ${escapeHtml(t.unit || '—')}</div>
            <div class="mb-2"><strong>Reference Range:</strong> ${escapeHtml(t.normal_range || '—')}</div>
            <div class="mb-2"><strong>Turnaround:</strong> ${escapeHtml(String(t.turnaround_time ?? '—'))} day(s)</div>
            <div class="mb-2"><strong>Price:</strong> ${escapeHtml(t.price != null && typeof window.formatLabCurrency === 'function' ? window.formatLabCurrency(parseFloat(t.price) || 0) : String(t.price ?? '—'))}</div>
        `;
        new bootstrap.Modal(modal).show();
    } catch (e) {
        console.error('viewTestType error:', e);
        showNotification('Failed to open test type', 'danger');
    }
}

async function editTestType(testUuid) {
    try {
        if (!testUuid) return showNotification('Invalid test id', 'warning');
        if (typeof window.getLabTest !== 'function' || typeof window.updateLabTest !== 'function') {
            throw new Error('Lab test API helpers not available');
        }
        const t = await window.getLabTest(testUuid);
        const modal = ensureModal('editTestTypeModal', 'Edit Test Type');
        const el = modal.querySelector('#editTestTypeModal-content');
        el.innerHTML = `
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label">Test Code</label>
              <input class="form-control" value="${escapeHtml(t.test_code || '')}" disabled>
            </div>
            <div class="col-md-6">
              <label class="form-label">Price</label>
              <input class="form-control" id="editTestPrice" type="number" step="0.01" value="${escapeHtml(String(t.price ?? ''))}">
            </div>
            <div class="col-12">
              <label class="form-label">Test Name</label>
              <input class="form-control" id="editTestName" value="${escapeHtml(t.test_name || '')}">
            </div>
            <div class="col-12">
              <label class="form-label">Description</label>
              <textarea class="form-control" id="editTestDesc" rows="2">${escapeHtml(t.description || '')}</textarea>
            </div>
            <div class="col-md-6">
              <label class="form-label">Unit</label>
              <input class="form-control" id="editTestUnit" value="${escapeHtml(t.unit || '')}">
            </div>
            <div class="col-md-6">
              <label class="form-label">Reference Range</label>
              <input class="form-control" id="editTestRange" value="${escapeHtml(t.normal_range || '')}">
            </div>
          </div>
          <div class="text-end mt-3">
            <button class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button class="btn btn-primary" id="btnSaveTestType">Save</button>
          </div>
        `;
        const bs = new bootstrap.Modal(modal);
        bs.show();

        el.querySelector('#btnSaveTestType').onclick = async () => {
            try {
                const payload = {
                    test_name: (el.querySelector('#editTestName').value || '').trim(),
                    description: (el.querySelector('#editTestDesc').value || '').trim(),
                    unit: (el.querySelector('#editTestUnit').value || '').trim(),
                    normal_range: (el.querySelector('#editTestRange').value || '').trim(),
                    price: (el.querySelector('#editTestPrice').value || '').trim(),
                };
                await window.updateLabTest(testUuid, payload, true);
                showNotification('Test updated successfully', 'success');
                bs.hide();
                await loadTestTypes();
            } catch (e) {
                console.error('save test type error:', e);
                showNotification('Save failed: ' + (e.message || 'Unknown error'), 'danger');
            }
        };
    } catch (e) {
        console.error('editTestType error:', e);
        showNotification('Failed to edit test: ' + (e.message || 'Unknown error'), 'danger');
    }
}

// Load test types when the tab is shown
document.addEventListener('shown.bs.tab', (e) => {
    const target = e.target?.getAttribute?.('data-bs-target') || e.target?.getAttribute?.('href') || '';
    if (target === '#test-types') {
        loadTestTypes();
    }
});

window.loadTestTypes = loadTestTypes;
window.viewTestType = viewTestType;
window.editTestType = editTestType;

// ===============================
// Enhanced Report Templates with AI Insights & QR Code
// ===============================

// Parse reference range to extract min/max for AI interpretation
function parseReferenceRange(refStr) {
    if (!refStr || typeof refStr !== 'string') return null;
    // Match patterns like "13-17", ">100", "<50", "100-200 mg/dL"
    const clean = refStr.replace(/[^\d\-\>\.]/g, '').trim();
    const rangeMatch = clean.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/);
    if (rangeMatch) {
        return { min: parseFloat(rangeMatch[1]), max: parseFloat(rangeMatch[2]), type: 'range' };
    }
    const gtMatch = clean.match(/>\s*(\d+\.?\d*)/);
    if (gtMatch) {
        return { min: parseFloat(gtMatch[1]), max: Infinity, type: 'greater' };
    }
    const ltMatch = clean.match(/<\s*(\d+\.?\d*)/);
    if (ltMatch) {
        return { min: -Infinity, max: parseFloat(ltMatch[1]), type: 'less' };
    }
    return null;
}

// AI-powered interpretation based on result vs reference range
function interpretResult(resultValue, refRange, interpretation) {
    if (!refRange || interpretation) {
        // Use existing interpretation if available
        if (interpretation) {
            const status = interpretation.toLowerCase();
            if (status.includes('high') || status.includes('elevated')) return { status: 'high', icon: '⚠️', class: 'text-danger' };
            if (status.includes('low') || status.includes('decreased')) return { status: 'low', icon: '⚠️', class: 'text-warning' };
            if (status.includes('abnormal')) return { status: 'abnormal', icon: '❌', class: 'text-danger' };
            return { status: 'normal', icon: '✅', class: 'text-success' };
        }
        return { status: 'unknown', icon: '—', class: 'text-muted' };
    }
    
    // Try to parse numeric value
    const numVal = parseFloat(String(resultValue).replace(/[^\d\.]/g, ''));
    if (isNaN(numVal)) {
        // Non-numeric: check for keywords
        const lower = String(resultValue).toLowerCase();
        if (lower.includes('normal') || lower.includes('negative')) {
            return { status: 'normal', icon: '✅', class: 'text-success' };
        }
        if (lower.includes('high') || lower.includes('positive') || lower.includes('elevated')) {
            return { status: 'high', icon: '⚠️', class: 'text-danger' };
        }
        if (lower.includes('low') || lower.includes('decreased')) {
            return { status: 'low', icon: '⚠️', class: 'text-warning' };
        }
        return { status: 'unknown', icon: '—', class: 'text-muted' };
    }
    
    // Numeric comparison with reference range
    const ref = parseReferenceRange(refRange);
    if (ref) {
        if (ref.type === 'range') {
            if (numVal < ref.min) return { status: 'low', icon: '⚠️', class: 'text-warning', note: `Below normal (${refRange})` };
            if (numVal > ref.max) return { status: 'high', icon: '⚠️', class: 'text-danger', note: `Above normal (${refRange})` };
            return { status: 'normal', icon: '✅', class: 'text-success', note: `Within normal range` };
        } else if (ref.type === 'greater') {
            return numVal >= ref.min 
                ? { status: 'normal', icon: '✅', class: 'text-success', note: `Within normal range` }
                : { status: 'low', icon: '⚠️', class: 'text-warning', note: `Below normal (>${ref.min})` };
        } else if (ref.type === 'less') {
            return numVal <= ref.max
                ? { status: 'normal', icon: '✅', class: 'text-success', note: `Within normal range` }
                : { status: 'high', icon: '⚠️', class: 'text-danger', note: `Above normal (<${ref.max})` };
        }
    }
    
    return { status: 'unknown', icon: '—', class: 'text-muted' };
}

// Generate QR code SVG (sync; used in report preview + patient QR modal)
function generateQRCodeSVG(data, size = 100) {
    const payload = String(data ?? '');
    if (!payload) {
        return '';
    }

    // Preferred: qrcode-generator (loaded via index.html)
    // Provides a global `qrcode` function and sync SVG generation.
    try {
        if (typeof window.qrcode === 'function') {
            const qr = window.qrcode(0, 'M'); // auto type, medium EC
            qr.addData(payload);
            qr.make();
            const count = qr.getModuleCount();
            const margin = 2;
            const cellSize = Math.max(2, Math.floor(size / (count + margin * 2)));
            return qr.createSvgTag({
                cellSize,
                margin
            });
        }
    } catch (_) {
        // fall through
    }

    // Back-compat: if some other QR lib provides QRCode.create (rare), use it.
    try {
        if (window.QRCode && typeof window.QRCode.create === 'function') {
            const qr = window.QRCode.create(payload, { errorCorrectionLevel: 'M' });
            const cells = qr.modules;
            const count = cells.size;
            const margin = 2;
            const total = count + margin * 2;
            const cell = Math.floor(size / total) || 2;
            const actualSize = total * cell;
            let rects = '';
            for (let r = 0; r < count; r++) {
                for (let c = 0; c < count; c++) {
                    if (cells.get(c, r)) {
                        const x = (c + margin) * cell;
                        const y = (r + margin) * cell;
                        rects += `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" fill="#000"/>`;
                    }
                }
            }
            return `<svg width="${actualSize}" height="${actualSize}" viewBox="0 0 ${actualSize} ${actualSize}" xmlns="http://www.w3.org/2000/svg">
                <rect width="${actualSize}" height="${actualSize}" fill="#fff"/>
                ${rects}
            </svg>`;
        }
    } catch (_) {
        // fall through
    }

    // Fallback placeholder (still shows payload text)
    return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${size}" height="${size}" fill="white" stroke="#e5e7eb"/>
        <text x="50%" y="48%" text-anchor="middle" dominant-baseline="middle" font-size="10" fill="black">QR</text>
        <text x="50%" y="64%" text-anchor="middle" font-size="8" fill="gray">${escapeHtml(payload.substring(0, 18))}...</text>
    </svg>`;
}

// Reuse QR generator across tabs (Patients, Reports, etc.)
window.generateQRCodeSVG = window.generateQRCodeSVG || generateQRCodeSVG;

function resolveQrCodeData(order, settings) {
    if (!settings?.show_qr_code) return null;

    const qrType = String(settings.qr_code_type || 'testId').toLowerCase();
    const customData = String(settings.qr_code_data || '').trim();
    const patient = order.patient && typeof order.patient === 'object' ? order.patient : {};
    const orderRef = order.order_id || order.order_number || order.order_no || order.id || order.uuid || '';
    const patientRef = patient.patient_id || order.patient_id || order.patient_identifier || order.patient || '';

    if (qrType === 'custom' && customData) return customData;
    if (qrType === 'patientid' && patientRef) return String(patientRef);

    // Default QR payload is the human-readable lab order/test id.
    return orderRef ? String(orderRef) : customData || null;
}

let _panelDefinitionsCache = null;

async function fetchPanelDefinitions() {
    if (_panelDefinitionsCache) return _panelDefinitionsCache;
    try {
        const r = await authenticatedFetch(`${API_BASE_URL}/tests/panel-definitions/`);
        if (!r.ok) {
            _panelDefinitionsCache = {};
            return _panelDefinitionsCache;
        }
        const d = await r.json();
        _panelDefinitionsCache = d && typeof d === 'object' ? d : {};
        return _panelDefinitionsCache;
    } catch (_) {
        _panelDefinitionsCache = {};
        return _panelDefinitionsCache;
    }
}

function mergePanelAnalytes(defRows, savedRows) {
    if (!defRows || !defRows.length) return [];
    const byCode = {};
    (savedRows || []).forEach((s) => {
        if (s && s.code) byCode[String(s.code)] = s;
    });
    return defRows.map((d) => {
        const s = byCode[String(d.code)] || {};
        const rawVal = s.value != null && s.value !== '' ? s.value : '';
        return {
            ...d,
            value: rawVal !== '' ? rawVal : '—',
            unit: s.unit || d.unit || '',
            ref_low: s.ref_low != null ? s.ref_low : d.ref_low,
            ref_high: s.ref_high != null ? s.ref_high : d.ref_high,
            interpretation: s.interpretation || ''
        };
    });
}

function questAnalyteStatus(row) {
    const v = parseFloat(String(row.value).replace(/[^\d.\-]/g, ''));
    if (isNaN(v) || row.ref_low == null || row.ref_high == null) return { label: '—', cls: 'text-muted' };
    if (v < row.ref_low) return { label: 'LOW', cls: 'text-warning' };
    if (v > row.ref_high) return { label: 'HIGH', cls: 'text-danger' };
    return { label: 'NORMAL', cls: 'text-success' };
}

function questGaugeMarkup(row) {
    const pct = (() => {
        const v = parseFloat(String(row.value).replace(/[^\d.\-]/g, ''));
        if (isNaN(v) || row.ref_low == null || row.ref_high == null || row.ref_high <= row.ref_low) return null;
        return Math.max(0, Math.min(100, ((v - row.ref_low) / (row.ref_high - row.ref_low)) * 100));
    })();
    const low = row.ref_low;
    const high = row.ref_high;
    const marker = pct == null
        ? ''
        : `<div class="quest-marker" style="left:${pct}%"><span>${escapeHtml(String(row.value))}</span></div>`;
    return `
      <div class="quest-gauge">
        <div class="quest-gauge-track">
          <div class="quest-gauge-zone low"></div>
          <div class="quest-gauge-zone mid"></div>
          <div class="quest-gauge-zone high"></div>
          ${marker}
        </div>
        <div class="quest-gauge-labels">
          <span>${low != null ? escapeHtml(String(low)) : ''}</span>
          <span>${high != null ? escapeHtml(String(high)) : ''}</span>
        </div>
      </div>`;
}

/** Mini range indicator for sidebar (Quest-style sparkline). */
function questSparklineSvg(row, uid) {
    const v = parseFloat(String(row.value).replace(/[^\d.\-]/g, ''));
    const gid = String(uid || 's').replace(/[^a-zA-Z0-9_-]/g, '');
    if (
        isNaN(v) ||
        row.ref_low == null ||
        row.ref_high == null ||
        row.ref_high <= row.ref_low
    ) {
        return '<span class="quest-spark-empty">—</span>';
    }
    const pct = Math.max(0, Math.min(100, ((v - row.ref_low) / (row.ref_high - row.ref_low)) * 100));
    const cx = 4 + (pct / 100) * 72;
    return `<svg class="quest-spark" viewBox="0 0 80 10" width="80" height="10" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs><linearGradient id="grad-${gid}" x1="0" x2="1"><stop offset="0" stop-color="#fecaca"/><stop offset="0.5" stop-color="#86efac"/><stop offset="1" stop-color="#fecaca"/></linearGradient></defs>
      <rect x="2" y="4" width="76" height="3" rx="1.5" fill="#e5e7eb"/>
      <rect x="2" y="4" width="76" height="3" rx="1.5" fill="url(#grad-${gid})" opacity="0.45"/>
      <circle cx="${cx}" cy="5.5" r="3.5" fill="#0d4f3c" stroke="#fff" stroke-width="1"/>
    </svg>`;
}

function buildQuestAvailableTestsHtml(items) {
    const arr = Array.isArray(items) ? items : [];
    if (!arr.length) return '';
    const pills = arr
        .map((it, i) => {
            const testObj = it.test || it.test_type || it.lab_test || {};
            const name = it.test_name || testObj.test_name || `Test ${i + 1}`;
            const code = it.test_code || testObj.test_code || '';
            const label = `${name}${code ? ` (${code})` : ''}`;
            return `<a class="quest-test-pill" href="#quest-panel-${i + 1}">${escapeHtml(label)}</a>`;
        })
        .join('');
    return `
      <div class="quest-available-tests">
        <div class="quest-available-inner">
          <span class="quest-available-label">Available tests (${arr.length})</span>
          <div class="quest-test-pills">${pills}</div>
          <span class="quest-jump-hint">Jump to a test panel below</span>
        </div>
      </div>`;
}

function buildQuestSingleTestHtml(it, idx) {
    const testObj = it.test || it.test_type || it.lab_test || {};
    const testName =
        it.test_name || testObj.test_name || testObj.name || `Test ${idx + 1}`;
    const testCode = it.test_code || testObj.test_code || '';
    const resultObj = it.result || (Array.isArray(it.results) ? it.results[0] : null) || it.test_result || {};
    const result = resultObj.result_value || resultObj.value || it.result_value || '—';
    const unit = resultObj.unit || it.unit || '';
    const ref = resultObj.reference_range || it.reference_range || 'See reference';
    return `
      <div class="quest-panel-wrap quest-single">
        <div class="quest-panel-head">
          <strong>${escapeHtml(String(testName))}</strong>${testCode ? ` <span class="text-muted">(${escapeHtml(testCode)})</span>` : ''}
          <span class="quest-badge">FINAL</span>
        </div>
        <div class="quest-single-body">
          <table class="quest-mini-table">
            <tr><th>Result</th><td>${escapeHtml(String(result))} ${unit ? escapeHtml(String(unit)) : ''}</td></tr>
            <tr><th>Reference</th><td>${escapeHtml(String(ref))}</td></tr>
          </table>
        </div>
      </div>`;
}

function buildQuestPanelHtml(title, code, merged, idx, total) {
    const needReview = merged.filter((r) => r.value !== '—' && questAnalyteStatus(r).label !== 'NORMAL').length;
    const nav = merged.map((row, i) => {
        const st = questAnalyteStatus(row);
        const active = i === 0 ? ' quest-nav-active' : '';
        return `<a class="quest-nav-item${active} ${st.cls}" href="#q-${code}-${idx}-${i}">
          <div class="quest-nav-row">
            <span class="quest-nav-name">${escapeHtml(row.name)}</span>
            <span class="quest-nav-flag">${escapeHtml(st.label)}</span>
          </div>
          <div class="quest-nav-spark">${questSparklineSvg(row, `${code}-${idx}-${i}`)}</div>
        </a>`;
    }).join('');
    const sections = merged.map((row, i) => {
        const st = questAnalyteStatus(row);
        const refStr =
            row.ref_low != null && row.ref_high != null
                ? `${row.ref_low}-${row.ref_high} ${row.unit || ''}`.trim()
                : '—';
        const gauge = questGaugeMarkup(row);
        return `
      <section id="q-${code}-${idx}-${i}" class="quest-analyte">
        <h4 class="quest-analyte-title">Your ${escapeHtml(row.name)} Result</h4>
        <div class="quest-analyte-grid">
          <div>
            ${gauge}
            <div class="quest-result-line ${st.cls}">
              <strong>Current:</strong> ${escapeHtml(String(row.value))} ${escapeHtml(String(row.unit || ''))}
            </div>
            <div class="quest-ref-line"><strong>Desired range:</strong> ${escapeHtml(refStr)}</div>
          </div>
          <div class="quest-edu">
            <h5>What is ${escapeHtml(row.name)}?</h5>
            <p>${escapeHtml(row.education || 'This analyte is reported as part of your ordered panel.')}</p>
          </div>
        </div>
      </section>`;
    }).join('');

    return `
      <div class="quest-panel-wrap">
        <div class="quest-panel-head">
          <div>
            <strong>${escapeHtml(title)}</strong>
            ${code ? `<span class="text-muted">(${escapeHtml(code)})</span>` : ''}
          </div>
          <div class="quest-panel-meta">
            <span class="quest-badge">FINAL</span>
            <span class="quest-sub">Panel ${idx} of ${total}</span>
          </div>
        </div>
        <div class="quest-filter-summary">
          <span><strong>Total results:</strong> ${merged.length}</span>
          <span><strong>Need review:</strong> ${needReview}</span>
          <span><strong>Expected:</strong> ${merged.length}</span>
        </div>
        <div class="quest-split">
          <aside class="quest-sidebar"><div class="quest-nav-title">Filter results</div>${nav}</aside>
          <div class="quest-maincol">${sections}</div>
        </div>
        <div class="quest-panel-about">
          <div class="quest-about-title">Additional information</div>
          <p class="quest-about-text">${escapeHtml(title)} measures multiple analytes in one specimen. Results are interpreted together with your history and exam. Contact your clinician if you have questions about a specific value.</p>
        </div>
      </div>`;
}

async function buildQuestReportSections(items, order) {
    const defs = await fetchPanelDefinitions();
    const itemList = Array.isArray(items) ? items : [];
    const panelCodes = itemList
        .map((it) => it.test_code || it.code || (it.test || {}).test_code)
        .filter((c) => c && defs[c] && defs[c].length);
    const panelCount = panelCodes.length || 1;
    let pIndex = 0;
    const parts = [];
    for (let i = 0; i < itemList.length; i++) {
        const it = itemList[i];
        const testObj = it.test || it.test_type || it.lab_test || {};
        const testCode = it.test_code || it.code || testObj.test_code || '';
        const testName = it.test_name || testObj.test_name || `Test ${i + 1}`;
        const panelDef = testCode && defs[testCode] ? defs[testCode] : null;
        const resultObj = it.result || (Array.isArray(it.results) ? it.results[0] : null) || {};
        const merged = mergePanelAnalytes(panelDef, resultObj.panel_analytes);
        const anchor = `quest-panel-${i + 1}`;
        if (panelDef && merged.length) {
            pIndex += 1;
            parts.push(
                `<div id="${anchor}" class="quest-panel-anchor">${buildQuestPanelHtml(testName, testCode, merged, pIndex, panelCount)}</div>`
            );
        } else {
            parts.push(`<div id="${anchor}" class="quest-panel-anchor">${buildQuestSingleTestHtml(it, i)}</div>`);
        }
    }
    return parts.join('');
}

async function buildReportHTML(order, settings, template = 'standard') {
    const s = settings || {};

    function parseClinicalNotesForImageLinks(clinicalNotes) {
        const raw = String(clinicalNotes || '').trim();
        if (!raw) return [];
        try {
            const obj = JSON.parse(raw);
            if (obj && Array.isArray(obj.image_links)) {
                return obj.image_links
                    .map(l => ({ url: String(l.url || '').trim(), label: String(l.label || '').trim() }))
                    .filter(l => l.url);
            }
        } catch (_) {}
        return [];
    }

    // Resolve patient - might be an ID or object
    let patient = {};
    if (order.patient) {
        if (typeof order.patient === 'object' && (order.patient.id || order.patient.uuid || order.patient.full_name)) {
            // Full patient object
            patient = order.patient;
        } else {
            // Patient ID - need to lookup
            const patientId = order.patient_id || order.patient;
            if (patientId) {
                try {
                    const fullPatient = await getPatientById(patientId);
                    if (fullPatient) patient = fullPatient;
                } catch (e) {
                    console.warn('Failed to load patient:', e);
                }
            }
        }
    } else if (order.patient_id) {
        // Only patient ID available
        try {
            const fullPatient = await getPatientById(order.patient_id);
            if (fullPatient) patient = fullPatient;
        } catch (e) {
            console.warn('Failed to load patient:', e);
        }
    }
    
    // Resolve test items - check multiple possible locations
    let items = [];
    if (Array.isArray(order.test_items)) {
        items = order.test_items;
    } else if (Array.isArray(order.items)) {
        items = order.items;
    } else if (Array.isArray(order.order_items)) {
        items = order.order_items;
    } else if (order.test_items) {
        items = [order.test_items];
    } else if (order.items) {
        items = [order.items];
    }
    
    // If no line items, load them from the API. (Do NOT use test-results/?test_order= — TestResultViewSet
    // filters by test_order_item, not test_order, so that query never scoped results to this order.)
    if (items.length === 0 && (order.id || order.uuid)) {
        try {
            const oid = encodeURIComponent(String(order.id || order.uuid));
            console.log('No test items on order object, fetching test-order-items for order', oid);
            const itemResp = await authenticatedFetch(`${API_BASE_URL}/test-order-items/?order=${oid}`);
            if (itemResp.ok) {
                const itemData = await itemResp.json();
                const rows = Array.isArray(itemData) ? itemData : (itemData.results || itemData.data || []);
                if (rows.length > 0) {
                    items = rows.map((row) => ({
                        test: row.test,
                        test_name: row.test_name,
                        test_code: row.test_code,
                        result: row.result,
                        results: row.result ? [row.result] : [],
                    }));
                    console.log(`✅ Loaded ${items.length} line items for report`);
                }
            }
        } catch (e) {
            console.warn('Failed to fetch test-order-items for report:', e);
        }
    }
    
    // Build results table with AI interpretation
    let rows = '';
    const testCatalog = await getTestCatalog();
    const testByCode = new Map();
    testCatalog.forEach(t => {
        const code = (t.test_code || '').toString().trim();
        if (code) testByCode.set(code, t);
    });

    const perTestNotes = [];
    let questSections = '';
    let questAvailableBar = '';
    if (template === 'quest' && items && items.length > 0) {
        questSections = await buildQuestReportSections(items, order);
        questAvailableBar = buildQuestAvailableTestsHtml(items);
    } else if (items && items.length > 0) {
        rows = items.map((it, idx) => {
            // Resolve test name/code from various possible locations
            const testObj = it.test || it.test_type || it.lab_test || {};
            const testName =
                it.test_name ||
                it.name ||
                testObj.test_name ||
                testObj.name ||
                testObj.title ||
                (typeof testObj === 'string' ? testObj : '');
            const testCode =
                it.test_code ||
                it.code ||
                testObj.test_code ||
                testObj.code ||
                '';
            const name = (testName || `Test ${idx + 1}`) + (testCode ? ` (${testCode})` : '');
            const tMeta = testCode ? testByCode.get(String(testCode)) : null;
            
            // Resolve result from various possible locations
            const resultObj = it.result || 
                            (Array.isArray(it.results) && it.results.length > 0 ? it.results[0] : null) ||
                            it.test_result ||
                            {};
            
            const result = resultObj.result_value || resultObj.value || resultObj.result || 
                          (it.result_value ? String(it.result_value) : '-');
            
            // Resolve unit
            const unit = resultObj.unit || it.unit || testObj.unit || tMeta?.unit || '';
            
            // Resolve reference range
            const ref = resultObj.reference_range || resultObj.normal_range || 
                       it.reference_range || it.normal_range ||
                       testObj.reference_range || testObj.normal_range ||
                       tMeta?.normal_range ||
                       'See reference';
            
            // Resolve interpretation
            const interpretation = resultObj.interpretation || it.interpretation || '';
            
            // Only interpret if we have a valid result (not '-')
            let ai = { icon: '—', note: '', class: 'text-muted' };
            if (result !== '-' && result !== '') {
                try {
                    ai = interpretResult(result, ref, interpretation);
                } catch (e) {
                    console.warn('Error interpreting result:', e);
                }
            }
            
            // Professional flag (H/L/A/C)
            const flag = (() => {
                const st = (ai.status || '').toLowerCase();
                if (st === 'high') return 'H';
                if (st === 'low') return 'L';
                if (st === 'abnormal') return 'A';
                return st === 'normal' ? '' : '';
            })();

            // Collect per-test notes (description/prep/turnaround) for professional section
            if (tMeta) {
                const noteBits = [];
                if (tMeta.description) noteBits.push(String(tMeta.description));
                if (tMeta.preparation_instructions) noteBits.push(`Prep: ${tMeta.preparation_instructions}`);
                if (tMeta.turnaround_time != null) noteBits.push(`TAT: ${tMeta.turnaround_time} day(s)`);
                if (noteBits.length) {
                    perTestNotes.push({
                        name: `${tMeta.test_name || testName || `Test ${idx + 1}`}${tMeta.test_code ? ` (${tMeta.test_code})` : (testCode ? ` (${testCode})` : '')}`,
                        note: noteBits.join(' • ')
                    });
                }
            }

            return `<tr>
                <td><strong>${escapeHtml(String(name))}</strong></td>
                <td class="${ai.class}">
                    ${escapeHtml(String(result))} ${unit ? escapeHtml(String(unit)) : ''}
                    ${ai.note ? `<br><small class="${ai.class}">${ai.icon} ${escapeHtml(ai.note)}</small>` : ''}
                </td>
                <td>${unit ? escapeHtml(String(unit)) : '—'}</td>
                <td>${ref ? escapeHtml(String(ref)) : '—'}</td>
                <td class="${ai.class}" style="text-align:center; font-weight:700;">${escapeHtml(flag || '—')}</td>
            </tr>`;
    }).join('');
    }
    
    const styles = {
        standard: `
    body { font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif; margin: 24px; color: #111827; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; border-bottom:2px solid #e5e7eb; padding-bottom:12px; margin-bottom:16px; }
    .lab-name { font-weight:800; font-size:22px; color:#0f172a; margin-bottom:4px; letter-spacing:.2px; }
    .header .meta { font-size:13px; color:#6b7280; line-height:1.8; }
    .header .meta strong { font-weight:600; color:#374151; }
    .meta { font-size:12px; color:#6b7280; }
    h2 { margin: 12px 0; font-size:18px; }

    /* Cleaner table */
    table { width:100%; border-collapse: separate; border-spacing: 0; border:1px solid #e5e7eb; border-radius:10px; overflow:hidden; }
    th, td { border-bottom:1px solid #e5e7eb; padding:10px 12px; font-size:14px; text-align:left; }
    th { background:#f8fafc; font-weight:700; color:#334155; }
    tbody tr:nth-child(even) { background:#fbfdff; }
    tbody tr:last-child td { border-bottom:0; }

    .footer { margin-top:24px; font-size:12px; color:#6b7280; }

    /* Status badge colors */
    .badge { display:inline-block; padding:2px 10px; border-radius:999px; font-size:12px; font-weight:700; border:1px solid transparent; }
    .badge.pending { background:#fff7ed; color:#9a3412; border-color:#fed7aa; }
    .badge.in_progress { background:#eff6ff; color:#1d4ed8; border-color:#bfdbfe; }
    .badge.completed { background:#ecfdf5; color:#047857; border-color:#a7f3d0; }
    .badge.archived { background:#f3f4f6; color:#374151; border-color:#e5e7eb; }

    /* QR sizing (no layout changes) */
    .qr-code { float:right; margin-left:16px; padding:8px; background:#fff; border:1px solid #e5e7eb; border-radius:8px; }
    .qr-code svg { display:block; }

    .text-success { color:#10b981; }
    .text-warning { color:#f59e0b; }
    .text-danger { color:#ef4444; }
    .text-muted { color:#6b7280; }
    @media print { @page { size: A4; margin: 12mm; } }`,
        modern: `
    body { font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; margin: 0; color:#0f172a; }
    .banner { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color:#fff; padding:20px 28px; position:relative; }
    .lab-name { font-weight:900; font-size:24px; letter-spacing:.2px; margin-bottom:4px; }
    .banner .meta { font-size:13px; opacity:0.95; line-height:1.6; }
    .banner .meta strong { font-weight:600; }
    .container { padding: 24px 28px; }
    .card { border:1px solid #e2e8f0; border-radius:12px; padding:16px; margin-bottom:16px; box-shadow: 0 1px 2px rgba(0,0,0,0.04); }
    .grid { display:grid; grid-template-columns: 1fr 1fr; gap:16px; }
    h3 { margin:0 0 10px 0; font-size:16px; color:#334155; text-transform:uppercase; letter-spacing:.5px; }
    table { width:100%; border-collapse: separate; border-spacing: 0; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden; }
    th, td { border-bottom:1px solid #e2e8f0; padding:10px 12px; font-size:14px; }
    th { color:#475569; text-transform:uppercase; font-size:12px; letter-spacing:.4px; background:#f8fafc; font-weight:700; }
    tbody tr:nth-child(even) { background:#fbfdff; }
    tbody tr:last-child td { border-bottom:0; }
    .footer { margin-top:20px; font-size:12px; color:#475569; }
    .qr-code { float:right; margin-left:20px; padding:10px; background:white; border-radius:8px; box-shadow:0 1px 3px rgba(0,0,0,0.1); }
    .qr-code svg { display:block; }
    .badge { display:inline-block; padding:2px 10px; border-radius:999px; font-size:12px; font-weight:700; border:1px solid transparent; }
    .badge.pending { background:#fff7ed; color:#9a3412; border-color:#fed7aa; }
    .badge.in_progress { background:#eff6ff; color:#1d4ed8; border-color:#bfdbfe; }
    .badge.completed { background:#ecfdf5; color:#047857; border-color:#a7f3d0; }
    .badge.archived { background:#f3f4f6; color:#374151; border-color:#e5e7eb; }
    .text-success { color:#10b981; font-weight:500; }
    .text-warning { color:#f59e0b; font-weight:500; }
    .text-danger { color:#ef4444; font-weight:500; }
    .text-muted { color:#64748b; }
    @media print { @page { size: A4; margin: 12mm; } }`,
        quest: `
    body { font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; margin: 0; color:#0f172a; background:#eef2f0; }
    .tpl-quest .container-inner { max-width:1120px; margin:0 auto; padding: 0 0 28px; background:#eef2f0; }
    .tpl-quest .header { border:none; padding:18px 24px 20px; background:linear-gradient(180deg,#0d4f3c 0%,#0a3d30 100%); color:#fff; border-radius:0; align-items:flex-start; box-shadow:0 4px 14px rgba(13,79,60,0.25); }
    .tpl-quest .lab-name { color:#fff; font-weight:800; font-size:24px; letter-spacing:-0.02em; }
    .quest-tagline { font-size:13px; font-weight:600; color:rgba(255,255,255,0.88); margin-top:4px; margin-bottom:8px; text-transform:uppercase; letter-spacing:0.12em; }
    .tpl-quest .header .meta { color:rgba(255,255,255,0.9); font-size:13px; line-height:1.65; }
    .tpl-quest .header .meta strong { color:#fff; }
    .tpl-quest .badge { background:rgba(255,255,255,0.18); color:#fff; border-color:rgba(255,255,255,0.4); }
    .tpl-quest .qr-code { border-color:rgba(255,255,255,0.35); background:#fff; }
    .quest-patient-strip { background:#fff; border-bottom:1px solid #e2e8f0; padding:16px 22px 14px; margin:0; }
    .quest-strip-main { display:flex; flex-wrap:wrap; justify-content:space-between; gap:16px; align-items:flex-end; }
    .quest-strip-name .quest-strip-k { display:block; font-size:11px; font-weight:700; letter-spacing:0.08em; color:#64748b; text-transform:uppercase; margin-bottom:4px; }
    .quest-strip-name strong { font-size:20px; font-weight:800; color:#0f172a; }
    .quest-strip-cols { display:flex; flex-wrap:wrap; gap:18px 28px; font-size:13px; }
    .quest-strip-cols > div { min-width:72px; }
    .quest-strip-k { display:block; font-size:10px; font-weight:700; letter-spacing:0.06em; color:#94a3b8; text-transform:uppercase; margin-bottom:2px; }
    .quest-strip-cols strong { color:#0f172a; font-weight:700; }
    .quest-final-pill { display:inline-block; background:#ecfdf5; color:#047857; padding:2px 10px; border-radius:999px; font-size:12px; font-weight:800; }
    .quest-strip-meta { margin-top:12px; padding-top:12px; border-top:1px solid #f1f5f9; font-size:12px; color:#64748b; display:flex; flex-wrap:wrap; gap:10px 18px; }
    .quest-acc strong { color:#334155; }
    .quest-available-tests { background:#fff; padding:0 22px 14px; border-bottom:1px solid #e2e8f0; }
    .quest-available-inner { background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:12px 14px; }
    .quest-available-label { font-size:12px; font-weight:800; color:#334155; display:block; margin-bottom:8px; }
    .quest-test-pills { display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
    .quest-test-pill { display:inline-block; padding:6px 12px; border-radius:999px; background:#fff; border:1px solid #cbd5e1; color:#0f172a; font-size:13px; font-weight:600; text-decoration:none; transition:background .15s,border-color .15s; }
    .quest-test-pill:hover { background:#ecfdf5; border-color:#0d4f3c; color:#0d4f3c; }
    .quest-jump-hint { display:block; font-size:11px; color:#94a3b8; margin-top:8px; }
    .quest-specimen-strip { background:#fff; padding:10px 22px; font-size:13px; color:#475569; display:flex; flex-wrap:wrap; gap:10px 20px; align-items:center; border-bottom:1px solid #f1f5f9; }
    .quest-spec-k { font-weight:800; color:#0d4f3c; margin-right:8px; font-size:12px; letter-spacing:0.06em; text-transform:uppercase; }
    .quest-results-section { padding:16px 22px 0; background:#eef2f0; }
    .quest-h2-results { margin:0 0 12px 0; font-size:15px; font-weight:800; letter-spacing:0.06em; text-transform:uppercase; color:#334155; }
    .quest-disclaimer { margin:20px 22px 0; padding:14px 16px; background:#fffbeb; border:1px solid #fde68a; border-radius:10px; font-size:13px; color:#78350f; line-height:1.5; }
    .quest-disclaimer strong { display:block; margin-bottom:6px; color:#92400e; }
    .quest-disclaimer p { margin:0; }
    .meta { font-size:12px; color:#475569; }
    h2 { margin:12px 0; font-size:18px; color:#0f172a; }
    .quest-panel-anchor { scroll-margin-top: 96px; }
    .quest-results-root { margin-top:0; display:flex; flex-direction:column; gap:20px; }
    .quest-panel-wrap { border:1px solid #e2e8f0; border-radius:12px; overflow:hidden; background:#fff; box-shadow:0 1px 2px rgba(0,0,0,0.04); }
    .quest-panel-head { display:flex; justify-content:space-between; align-items:center; padding:12px 16px; background:#f8fafc; border-bottom:1px solid #e2e8f0; gap:12px; flex-wrap:wrap; }
    .quest-panel-meta { display:flex; align-items:center; gap:10px; }
    .quest-badge { font-size:11px; font-weight:700; letter-spacing:0.06em; padding:4px 10px; border-radius:999px; background:#e5e7eb; color:#374151; }
    .quest-sub { font-size:12px; color:#64748b; }
    .quest-filter-summary { display:flex; flex-wrap:wrap; gap:14px 22px; padding:10px 16px; font-size:13px; border-bottom:1px solid #f1f5f9; background:#fafafa; }
    .quest-split { display:flex; align-items:stretch; min-height:320px; }
    .quest-sidebar { width:290px; flex-shrink:0; border-right:1px solid #e2e8f0; background:#f9fafb; padding:12px 10px 16px; }
    .quest-nav-title { font-size:11px; font-weight:800; letter-spacing:0.08em; color:#64748b; text-transform:uppercase; margin-bottom:8px; }
    .quest-nav-item { display:flex; flex-direction:column; align-items:stretch; gap:4px; padding:10px 10px 10px 12px; border-radius:8px; text-decoration:none; color:#0f172a; font-size:13px; margin-bottom:6px; border:1px solid #eef2f6; background:#fff; box-shadow:0 1px 0 rgba(15,23,42,0.04); }
    .quest-nav-item:hover { background:#f8fafc; border-color:#cbd5e1; }
    .quest-nav-active { border-left:4px solid #2563eb !important; padding-left:8px !important; background:#eff6ff !important; border-color:#bfdbfe !important; }
    .quest-nav-row { display:flex; justify-content:space-between; align-items:flex-start; gap:8px; }
    .quest-nav-name { font-weight:600; line-height:1.25; flex:1; }
    .quest-nav-flag { font-size:10px; font-weight:800; letter-spacing:0.04em; margin-left:auto; white-space:nowrap; }
    .quest-nav-spark { margin-top:2px; opacity:0.95; }
    .quest-spark-empty { font-size:11px; color:#94a3b8; }
    .quest-maincol { flex:1; padding:14px 18px 20px; background:#fff; }
    .quest-analyte { padding:18px 0; border-bottom:1px solid #f1f5f9; scroll-margin-top:72px; }
    .quest-analyte:last-child { border-bottom:none; }
    .quest-analyte-title { margin:0 0 12px 0; font-size:17px; font-weight:700; color:#0f172a; }
    .quest-analyte-grid { display:grid; grid-template-columns: 1fr 1fr; gap:18px; align-items:start; }
    @media (max-width: 820px) { .quest-analyte-grid { grid-template-columns: 1fr; } .quest-split { flex-direction:column; } .quest-sidebar { width:100%; border-right:none; border-bottom:1px solid #e2e8f0; } }
    .quest-edu { background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:12px 14px; font-size:13px; line-height:1.55; color:#334155; }
    .quest-edu h5 { margin:0 0 8px 0; font-size:14px; color:#0f172a; }
    .quest-edu p { margin:0; }
    .quest-gauge { margin-bottom:10px; }
    .quest-gauge-track { position:relative; height:22px; border-radius:999px; overflow:visible; margin-top:8px; display:flex; }
    .quest-gauge-zone { flex:1; height:100%; }
    .quest-gauge-zone.low { background:linear-gradient(90deg,#fecaca,#fde68a); }
    .quest-gauge-zone.mid { background:linear-gradient(90deg,#bbf7d0,#86efac); }
    .quest-gauge-zone.high { background:linear-gradient(90deg,#fde68a,#fecaca); }
    .quest-marker { position:absolute; top:-12px; transform:translateX(-50%); text-align:center; min-width:52px; }
    .quest-marker span { display:inline-block; background:#0f172a; color:#fff; font-size:12px; font-weight:800; padding:3px 8px; border-radius:6px; }
    .quest-gauge-labels { display:flex; justify-content:space-between; font-size:11px; color:#64748b; margin-top:6px; padding:0 2px; }
    .quest-result-line { font-size:15px; margin-top:10px; }
    .quest-ref-line { font-size:13px; margin-top:6px; color:#475569; }
    .quest-mini-table { width:100%; border-collapse:collapse; font-size:14px; }
    .quest-mini-table th { text-align:left; padding:8px 10px; width:120px; color:#64748b; border-bottom:1px solid #f1f5f9; }
    .quest-mini-table td { padding:8px 10px; border-bottom:1px solid #f1f5f9; }
    .quest-single-body { padding:12px 16px 16px; }
    .quest-panel-about { padding:14px 18px 18px; background:linear-gradient(180deg,#f8fafc 0%,#fff 100%); border-top:1px solid #e2e8f0; }
    .quest-about-title { font-weight:800; color:#0f172a; margin-bottom:8px; font-size:14px; }
    .quest-about-text { margin:0; font-size:13px; line-height:1.55; color:#475569; }
    .tpl-quest .footer { margin:24px 22px 0; padding:18px 0 8px; border-top:1px solid #e2e8f0; background:#eef2f0; }
    table { width:100%; border-collapse: collapse; }
    .text-success { color:#059669; font-weight:600; }
    .text-warning { color:#d97706; font-weight:600; }
    .text-danger { color:#dc2626; font-weight:600; }
    .text-muted { color:#64748b; }
    .qr-code { float:right; margin-left:15px; padding:8px; background:#fff; border-radius:8px; border:1px solid #e2e8f0; }
    .qr-code svg { display:block; }`,
        imaging: `
    body { font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; margin: 0; color:#0f172a; background:#f8fafc; }
    .banner { background: linear-gradient(135deg, #0ea5e9 0%, #1d4ed8 100%); color:#fff; padding:22px 28px; position:relative; }
    .lab-name { font-weight:900; font-size:24px; letter-spacing:.2px; margin-bottom:4px; }
    .banner .meta { font-size:13px; opacity:0.95; line-height:1.6; }
    .banner .meta strong { font-weight:600; }
    .container { padding: 22px 28px 26px; }
    .card { background:#fff; border:1px solid #e2e8f0; border-radius:14px; padding:16px; margin-bottom:14px; box-shadow: 0 1px 2px rgba(0,0,0,0.04); }
    .grid { display:grid; grid-template-columns: 1fr 1fr; gap:14px; }
    h3 { margin:0 0 10px 0; font-size:14px; color:#0f172a; text-transform:uppercase; letter-spacing:.08em; }
    .meta { font-size:12px; color:#475569; line-height:1.6; }
    table { width:100%; border-collapse: separate; border-spacing: 0; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden; }
    th, td { border-bottom:1px solid #e2e8f0; padding:10px 12px; font-size:13px; }
    th { color:#334155; text-transform:uppercase; font-size:12px; letter-spacing:.4px; background:#f1f5f9; font-weight:800; }
    tbody tr:nth-child(even) { background:#fbfdff; }
    tbody tr:last-child td { border-bottom:0; }
    .qr-code { float:right; margin-left:18px; padding:10px; background:white; border-radius:10px; border:1px solid rgba(255,255,255,0.35); }
    .qr-code svg { display:block; }
    .badge { display:inline-block; padding:2px 10px; border-radius:999px; font-size:12px; font-weight:800; border:1px solid transparent; background:rgba(255,255,255,0.15); color:#fff; }
    .images-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; margin-top:10px; }
    .img-card { border:1px solid #e2e8f0; border-radius:12px; padding:10px; background:#fff; }
    .img-card .label { font-weight:800; color:#0f172a; margin-bottom:6px; font-size:13px; }
    .img-card a { font-size:12px; word-break:break-all; color:#1d4ed8; }
    .img-card img { margin-top:8px; max-width:100%; border-radius:10px; border:1px solid #e2e8f0; }
    .footer { margin-top:18px; font-size:12px; color:#475569; }
    @media print { body{background:#fff;} @page { size: A4; margin: 12mm; } }`
    };
    
    // Settings with fallbacks - define FIRST before using in headerHtml
    const labName = s.lab_name || s.laboratory_name || 'Laboratory';
    const labAddress = s.lab_address || s.address || '';
    const labPhone = s.lab_phone || s.contact_number || s.phone || '';
    const labEmail = s.lab_email || s.email || '';
    const doctorName = s.authorized_doctor || s.doctor || s.authorized_doctor_name || 'Not specified';
    const technicianName = s.lab_technician || s.technician || s.lab_technician_name || 'Not specified';
    
    // Format patient name
    const patientName = patient.full_name || 
                       `${(patient.first_name || '').trim()} ${(patient.last_name || '').trim()}`.trim() ||
                       patient.name ||
                       'Not specified';
    
    // Format DOB
    const dob = patient.date_of_birth || patient.dob || patient.birth_date || '';
    const dobFormatted = dob ? (dob.includes('T') ? new Date(dob).toLocaleDateString() : dob) : '';
    
    // Format patient contact
    const patientPhone = patient.phone || patient.contact || patient.phone_number || '';
    const patientEmail = patient.email || patient.email_address || '';
    const patientContact = [patientPhone, patientEmail].filter(Boolean).join(' • ');
    
    // Generate QR code data if enabled in Settings.
    const qrData = resolveQrCodeData(order, s);
    const qrCodeHtml = (qrData && s.show_qr_code) ? `<div class="qr-code">${generateQRCodeSVG(qrData, 80)}</div>` : '';
    
    // Format report date
    const reportDate = order.created_at || order.order_date || order.date || new Date().toISOString();
    const reportDateFormatted = reportDate ? new Date(reportDate).toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    }) : '';
    
    // Report ID
    const reportId = order.id || order.uuid || order.order_id || order.order_number || 'N/A';
    const accession = order.order_id || order.accession_no || order.accession_number || '';
    const patientPublicId = patient.patient_id || patient.patientId || '';

    const statusRaw = String(order.status || 'pending');
    const statusLower = statusRaw.toLowerCase();
    const statusKey = (statusLower === 'in progress' ? 'in_progress' : statusLower.replace(/[-\s]+/g, '_'));

    const headerHtml = (`
      <div class="${(template==='modern' || template==='imaging') ? 'banner' : 'header'}">
        <div>
          <div class="lab-name">${escapeHtml(labName)}</div>
          ${template === 'quest' ? '<div class="quest-tagline">Patient laboratory report</div>' : ''}
          <div class="meta">${[labAddress, labPhone, labEmail].filter(Boolean).join(' • ') || ''}</div>
          ${doctorName !== 'Not specified' || technicianName !== 'Not specified' ? `
          <div class="meta" style="margin-top:8px; font-size:13px;">
            ${doctorName !== 'Not specified' ? `<div><strong>Authorized Doctor:</strong> ${escapeHtml(doctorName)}</div>` : ''}
            ${technicianName !== 'Not specified' ? `<div><strong>Lab Technician:</strong> ${escapeHtml(technicianName)}</div>` : ''}
          </div>` : ''}
        </div>
        <div class="meta">
          ${qrCodeHtml}
          <div><strong>Report:</strong> ${escapeHtml(String(reportId))}</div>
          <div><strong>Status:</strong> <span class="badge ${escapeHtml(statusKey)}">${escapeHtml(statusRaw)}</span></div>
          <div><strong>Date:</strong> ${escapeHtml(reportDateFormatted)}</div>
        </div>
      </div>
    `);
    
    const patientGender = (patient.gender || '—').toString();
    const patientBlock =
      template === 'quest'
          ? `
      <div class="quest-patient-strip">
        <div class="quest-strip-main">
          <div class="quest-strip-name">
            <span class="quest-strip-k">Patient</span>
            <strong>${escapeHtml(patientName)}</strong>
          </div>
          <div class="quest-strip-cols">
            <div><span class="quest-strip-k">Sex</span><strong>${escapeHtml(patientGender)}</strong></div>
            ${patientPublicId ? `<div><span class="quest-strip-k">Patient ID</span><strong>${escapeHtml(String(patientPublicId))}</strong></div>` : ''}
            <div><span class="quest-strip-k">DOB</span><strong>${escapeHtml(dobFormatted || '—')}</strong></div>
            <div><span class="quest-strip-k">Report status</span><strong class="quest-final-pill">FINAL</strong></div>
            <div><span class="quest-strip-k">Reported</span><strong>${escapeHtml(reportDateFormatted)}</strong></div>
          </div>
        </div>
        <div class="quest-strip-meta">
          ${patientContact ? `<span>${escapeHtml(patientContact)}</span>` : ''}
          ${accession ? `<span class="quest-acc">Accession <strong>${escapeHtml(String(accession))}</strong></span>` : ''}
          <span>${escapeHtml(doctorName)} · ${escapeHtml(technicianName)}</span>
        </div>
      </div>`
      : (template === 'modern' || template === 'imaging')
          ? `
      <div class="grid">
        <div class="card">
          <h3>Patient</h3>
          <div><strong>Name:</strong> ${escapeHtml(patientName)}</div>
          ${patientPublicId ? `<div><strong>Patient ID:</strong> ${escapeHtml(String(patientPublicId))}</div>` : ''}
          <div><strong>Gender:</strong> ${escapeHtml(patient.gender || 'Not specified')}</div>
          <div><strong>DOB:</strong> ${escapeHtml(dobFormatted || 'Not specified')}</div>
          <div><strong>Contact:</strong> ${escapeHtml(patientContact || 'Not specified')}</div>
        </div>
        <div class="card">
          <h3>Laboratory Staff</h3>
          <div><strong>Authorized Doctor:</strong> ${escapeHtml(doctorName)}</div>
          <div><strong>Lab Technician:</strong> ${escapeHtml(technicianName)}</div>
          ${accession ? `<div style="margin-top:10px"><strong>Accession:</strong> ${escapeHtml(String(accession))}</div>` : ''}
        </div>
      </div>`
          : `
      <h2>Patient</h2>
      <div class="meta">
        <div><strong>Name:</strong> ${escapeHtml(patientName)}</div>
        ${patientPublicId ? `<div><strong>Patient ID:</strong> ${escapeHtml(String(patientPublicId))}</div>` : ''}
        <div><strong>Gender:</strong> ${escapeHtml(patient.gender || 'Not specified')} • <strong>DOB:</strong> ${escapeHtml(dobFormatted || 'Not specified')}</div>
        <div><strong>Contact:</strong> ${escapeHtml(patientContact || 'Not specified')}</div>
      </div>`;
    
    const resultsTable = template === 'quest'
      ? `<div class="quest-results-root">${questSections || '<div class="text-muted">No results available</div>'}</div>`
      : `
      <table>
        <thead><tr><th>Test</th><th>Result</th><th>Unit</th><th>Reference Range</th><th>Flag</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="5">No results available</td></tr>'}</tbody>
      </table>`;

    // Professional report sections (common clinical lab report elements)
    const specimenType = order.specimen_type || order.sample_type || order.specimen || 'Not specified';
    const collectionDate = order.collection_date || order.collected_at || order.order_date || '';
    const receivedDate = order.received_date || order.received_at || '';
    const method = order.method || order.methodology || order.analyzer || '';

    const specimenBlock =
      template === 'quest'
          ? `<div class="quest-specimen-strip"><span class="quest-spec-k">Specimen</span>
          <span><strong>Type:</strong> ${escapeHtml(specimenType)}</span>
          ${collectionDate ? `<span><strong>Collected:</strong> ${escapeHtml(new Date(collectionDate).toLocaleString())}</span>` : `<span><strong>Collected:</strong> ${escapeHtml(reportDateFormatted)}</span>`}
          ${receivedDate ? `<span><strong>Received:</strong> ${escapeHtml(new Date(receivedDate).toLocaleString())}</span>` : ''}
          ${method ? `<span><strong>Method:</strong> ${escapeHtml(String(method))}</span>` : ''}
        </div>`
          : (template === 'modern')
              ? `
      <div class="card">
        <h3>Specimen</h3>
        <div><strong>Type:</strong> ${escapeHtml(specimenType)}</div>
        ${collectionDate ? `<div><strong>Collected:</strong> ${escapeHtml(new Date(collectionDate).toLocaleString())}</div>` : ''}
        ${receivedDate ? `<div><strong>Received:</strong> ${escapeHtml(new Date(receivedDate).toLocaleString())}</div>` : ''}
        ${method ? `<div><strong>Method:</strong> ${escapeHtml(String(method))}</div>` : ''}
      </div>`
              : `
      <h2>Specimen</h2>
      <div class="meta">
        <div><strong>Type:</strong> ${escapeHtml(specimenType)}</div>
        ${collectionDate ? `<div><strong>Collected:</strong> ${escapeHtml(new Date(collectionDate).toLocaleString())}</div>` : ''}
        ${receivedDate ? `<div><strong>Received:</strong> ${escapeHtml(new Date(receivedDate).toLocaleString())}</div>` : ''}
        ${method ? `<div><strong>Method:</strong> ${escapeHtml(String(method))}</div>` : ''}
      </div>`;

    const uniqNotes = (() => {
        const seen = new Set();
        const out = [];
        for (const n of perTestNotes) {
            const key = `${n.name}::${n.note}`;
            if (seen.has(key)) continue;
            seen.add(key);
            out.push(n);
        }
        return out;
    })();

    const testInfoBlock = (uniqNotes.length && template !== 'quest')
      ? (template === 'modern'
          ? `<div class="card"><h3>Test Information</h3>${uniqNotes.map(n => `<div style="margin-bottom:8px"><strong>${escapeHtml(n.name)}</strong><div class="text-muted" style="margin-top:2px">${escapeHtml(n.note)}</div></div>`).join('')}</div>`
          : `<h2>Test Information</h2><div class="meta">${uniqNotes.map(n => `<div style="margin-bottom:8px"><strong>${escapeHtml(n.name)}</strong><div>${escapeHtml(n.note)}</div></div>`).join('')}</div>`
        )
      : '';

    const interpretationNote =
      template === 'quest'
          ? `
      <div class="quest-disclaimer">
        <strong>Interpretation</strong>
        <p>Reference ranges are typical adult values and may vary by laboratory method. Abnormal flags (HIGH/LOW) are prompts for clinical review—not a diagnosis on their own.</p>
      </div>`
          : `
      <div class="${template === 'modern' ? 'card' : ''}" style="${template === 'modern' ? '' : 'margin-top:16px'}">
        ${template === 'modern' ? '<h3>Interpretation</h3>' : '<h2>Interpretation</h2>'}
        <div class="meta">
          Flags are auto-generated by comparing results to reference ranges (H = High, L = Low, A = Abnormal, C = Critical). Reference ranges may vary by methodology and laboratory. Clinical correlation is required.
        </div>
      </div>
    `;

    const imageLinks = parseClinicalNotesForImageLinks(order.clinical_notes);
    const imagesBlock = imageLinks.length
      ? ((template === 'modern' || template === 'imaging')
          ? `<div class="card"><h3>Diagnostic Images</h3>
               <div class="meta">Attached image links (external URLs):</div>
               <div class="${template === 'imaging' ? 'images-grid' : ''}" style="${template === 'imaging' ? '' : 'display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:10px'}">
                 ${imageLinks.map(l => `
                   <div class="${template === 'imaging' ? 'img-card' : ''}" style="${template === 'imaging' ? '' : 'border:1px solid #e2e8f0;border-radius:10px;padding:10px;background:#fff'}">
                     <div class="${template === 'imaging' ? 'label' : ''}" style="${template === 'imaging' ? '' : 'font-weight:700;color:#0f172a;margin-bottom:6px'}">${escapeHtml(l.label || 'Image')}</div>
                     <a href="${escapeHtml(l.url)}" target="_blank" rel="noopener noreferrer" style="font-size:12px;word-break:break-all">${escapeHtml(l.url)}</a>
                     <div style="margin-top:8px">
                       <img src="${escapeHtml(l.url)}" style="${template === 'imaging' ? '' : 'max-width:100%;border-radius:8px;border:1px solid #e2e8f0'}" onerror="this.style.display='none';" />
                     </div>
                   </div>
                 `).join('')}
               </div>
             </div>`
          : `<h2>Diagnostic Images</h2>
             <div class="meta">Attached image links (external URLs):</div>
             <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:10px">
               ${imageLinks.map(l => `
                 <div style="border:1px solid #e5e7eb;border-radius:8px;padding:10px;background:#fff">
                   <div style="font-weight:700;color:#111827;margin-bottom:6px">${escapeHtml(l.label || 'Image')}</div>
                   <a href="${escapeHtml(l.url)}" target="_blank" rel="noopener noreferrer" style="font-size:12px;word-break:break-all">${escapeHtml(l.url)}</a>
                   <div style="margin-top:8px">
                     <img src="${escapeHtml(l.url)}" style="max-width:100%;border-radius:6px;border:1px solid #e5e7eb" onerror="this.style.display='none';" />
                   </div>
                 </div>
               `).join('')}
             </div>`
        )
      : '';
    
    return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Lab Report</title>
  <style>
    ${styles[template] || styles.standard}
    @media print { @page { size: A4; margin: 12mm; } .no-print { display:none; } }
  </style>
</head>
<body class="${template === 'quest' ? 'tpl-quest' : ''}">
  ${template === 'quest' ? '<div class="container-inner">' : ''}
  ${headerHtml}
  ${patientBlock}
  ${template === 'quest' ? questAvailableBar : ''}
  ${template === 'modern' ? '<div class=\"grid\">' + specimenBlock + '</div>' : specimenBlock}
  ${template === 'quest'
      ? `<section class="quest-results-section"><h2 class="quest-h2-results">Results detail</h2>${resultsTable}</section>`
      : (template === 'modern'
          ? '<div class=\"card\"><h3>Test Results</h3>' + resultsTable + '</div>'
          : '<h2>Test Results</h2>' + resultsTable)}
  ${testInfoBlock}
  ${imagesBlock}
  ${interpretationNote}
  <div class="footer">
    <div><strong>Authorized Doctor:</strong> ${escapeHtml(doctorName)}</div>
    <div><strong>Lab Technician:</strong> ${escapeHtml(technicianName)}</div>
    <div style="margin-top:14px; display:flex; gap:18px; align-items:flex-end;">
      <div style="flex:1; border-top:1px solid #cbd5e1; padding-top:8px;">Authorized Signature</div>
      <div style="width:200px; border-top:1px solid #cbd5e1; padding-top:8px;">Date</div>
    </div>
    <div style="margin-top:8px; font-size:11px; color:#9ca3af;">
      Report generated by Lab Management System. Verify critical results per laboratory policy.
    </div>
  </div>
  ${template === 'quest' ? '</div>' : ''}
  <div class="no-print" style="margin-top:16px">
    <button onclick="window.print()">Print / Save PDF</button>
  </div>
</body>
</html>`;
}

// Allow other tabs (Images) to render the same report HTML
window.buildReportHTML = window.buildReportHTML || buildReportHTML;

async function openReportTemplate(orderId, autoPrint = false, forceTemplate = null) {
    try {
        // Use centralized API function if available
        try {
            if (typeof window.getTestOrder === 'function') {
                const order = await window.getTestOrder(orderId);
                return openReportTemplateFromOrder(order, autoPrint, forceTemplate);
            }
        } catch (e) {
            console.warn('Failed to get order via API function, trying fallback:', e);
        }
        
        // Fallback: direct fetch by ID first
        try {
            const oResp = await authenticatedFetch(`${API_BASE_URL}/test-orders/${orderId}/`);
            if (oResp.ok) {
                const order = await oResp.json();
                return openReportTemplateFromOrder(order, autoPrint, forceTemplate);
            }
        } catch (e) {
            console.warn('Direct fetch failed, searching recent orders...', e);
        }
        
        // If not found, search recent orders to locate by any identifier shape
        let listData;
        if (typeof window.getTestOrders === 'function') {
            listData = await window.getTestOrders({ ordering: '-created_at', limit: 100 });
        } else {
            const listResp = await authenticatedFetch(`${API_BASE_URL}/test-orders/?ordering=-created_at&limit=100`);
            if (!listResp.ok) throw new Error('Failed to search orders');
            listData = await listResp.json();
        }
        
        const orders = Array.isArray(listData) ? listData : (listData.results || listData.data || []);
        const order = orders.find(o => {
            const keys = [o.id, o.uuid, o.order_id, o.order_number];
            return keys.some(k => k && String(k) === String(orderId));
        });
        if (order) {
            return openReportTemplateFromOrder(order, autoPrint, forceTemplate);
        }
        throw new Error('Failed to load order');
    } catch (e) {
        console.error('openReportTemplate error:', e);
        showNotification('Failed to render template report: ' + e.message, 'danger');
    }
}

async function openReportTemplateFromOrder(order, autoPrint = false, forceTemplate = null) {
    console.log('Building report from order:', order);
    
    // Load settings with fallback to localStorage
    let settings = {};
    try {
        const sResp = await authenticatedFetch(`${API_BASE_URL}/settings/ui/`);
        if (sResp.ok) {
            const sData = await sResp.json();
            settings = Array.isArray(sData) ? (sData[0] || {}) : (sData.results?.[0] || sData || {});
            console.log('✅ Settings loaded from API:', settings);
        } else {
            // Non-OK responses won't throw; fall back to localStorage
            throw new Error(`Settings API returned ${sResp.status}`);
        }
    } catch (e) {
        console.warn('Failed to load settings from API, trying localStorage:', e);
        // Fallback to localStorage
        try {
            const localSettings = storage.get('labInfo') || storage.get('settings') || {};
            settings = {
                lab_name: localSettings.lab_name || localSettings.labName || '',
                lab_address: localSettings.lab_address || localSettings.address || '',
                lab_phone: localSettings.lab_phone || localSettings.contactNumber || '',
                lab_email: localSettings.lab_email || localSettings.email || '',
                authorized_doctor: localSettings.authorized_doctor || localSettings.authorizedDoctor || '',
                lab_technician: localSettings.lab_technician || localSettings.labTechnician || '',
                default_template: localSettings.default_template || localSettings.defaultTemplate || 'quest',
                show_qr_code: localSettings.show_qr_code || localSettings.showQRCode || false,
                qr_code_type: localSettings.qr_code_type || localSettings.qrCodeType || 'testId',
                qr_code_data: localSettings.qr_code_data || localSettings.qrCodeData || ''
            };
            console.log('✅ Settings loaded from localStorage:', settings);
        } catch (_) {
            console.warn('Failed to load settings from localStorage');
        }
    }
    
    const template = (forceTemplate || settings.default_template || 'quest').toLowerCase();
    const validTemplate = ['standard','modern','quest'].includes(template) ? template : 'quest';
    console.log('Using template:', validTemplate);
    
    // Build HTML (now async to resolve patient and test results)
    const html = await buildReportHTML(order, settings, validTemplate);
    showReportModal(html, autoPrint, validTemplate);
}

// Export a PDF via browser (user selects Save as PDF)
async function exportReportPDF(orderId) {
    return openReportTemplate(orderId, true);
}

// Export to window
// Delete test order from Lab Tests tab
async function deleteTestOrderFromLabTests(testOrderId) {
    try {
        if (!testOrderId) {
            showNotification('No test order ID provided', 'danger');
            return;
        }
        
        if (!confirm('Archive this test order? It will be hidden but preserved for audit purposes.')) return;
        
        console.log('Archiving test order (soft-delete via DELETE endpoint) from Lab Tests tab:', testOrderId);
        
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
        console.error('deleteTestOrderFromLabTests error:', e);
        const errorMsg = e.message || 'Failed to archive test order';
        showNotification(`Archive failed: ${errorMsg}`, 'danger');
        
        console.error('❌ Cannot archive test order');
        console.error('💡 Backend DELETE endpoint should work after migration lab_management.0005_add_archived_status_to_test_order');
        console.error('💡 DELETE /lab/test-orders/{id}/ should return 200 and archive the order (status="archived")');
    }
}

window.loadTests = loadTests;
window.viewTest = viewTest;
window.enterTestResult = enterTestResult;
window.printReport = printReport;
window.openReportTemplate = openReportTemplate;
window.openReportTemplateFromOrder = openReportTemplateFromOrder;
window.exportReportPDF = exportReportPDF;
window.deleteTestOrderFromLabTests = deleteTestOrderFromLabTests;
window.populateNewTestModal = populateNewTestModal;
window.submitNewTest = submitNewTest;

// Wire modal once DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireNewTestModal);
} else {
    wireNewTestModal();
}

// ===============================
// In-page Report Preview Modal
// ===============================
function ensureReportModal() {
    let modal = document.getElementById('reportPreviewModal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'reportPreviewModal';
    modal.className = 'modal fade';
    modal.tabIndex = -1;
    modal.innerHTML = `
      <div class="modal-dialog modal-xl" style="max-width: 1024px;">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Report Preview</h5>
            <div class="d-flex gap-2">
              <button type="button" class="btn btn-sm btn-outline-secondary" id="reportPreviewPrintBtn"><i class="fas fa-print"></i> Print</button>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
          </div>
          <div class="modal-body" style="height:75vh; overflow:auto;">
            <iframe id="reportPreviewFrame" style="width:100%; height:100%; border:0;"></iframe>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    return modal;
}

function showReportModal(html, autoPrint = false, templateKind = '') {
    const modal = ensureReportModal();
    const header = modal.querySelector('.modal-header');
    const titleEl = modal.querySelector('.modal-title');
    const printBtn = modal.querySelector('#reportPreviewPrintBtn');
    if (header) {
        header.classList.toggle('quest-report-modal-header', templateKind === 'quest');
        if (templateKind === 'quest') {
            header.style.background = '#0d4f3c';
            header.style.borderBottom = 'none';
            header.classList.add('text-white');
        } else {
            header.style.background = '';
            header.style.borderBottom = '';
            header.classList.remove('text-white');
        }
    }
    if (titleEl) {
        if (templateKind === 'quest') {
            titleEl.innerHTML = '<span class="align-middle">Report Preview</span> <span class="badge rounded-pill ms-2 align-middle" style="background:rgba(255,255,255,0.2);font-weight:600;font-size:0.72rem;">Quest layout</span>';
        } else {
            titleEl.textContent = 'Report Preview';
        }
    }
    if (printBtn) {
        if (templateKind === 'quest') {
            printBtn.classList.remove('btn-outline-secondary');
            printBtn.classList.add('btn-light', 'text-success');
        } else {
            printBtn.classList.add('btn-outline-secondary');
            printBtn.classList.remove('btn-light', 'text-success');
        }
    }
    const closeBtn = modal.querySelector('.btn-close');
    if (closeBtn) {
        closeBtn.classList.toggle('btn-close-white', templateKind === 'quest');
    }
    const frame = modal.querySelector('#reportPreviewFrame');
    if (frame) {
        const writeIntoFrame = () => {
            try {
                if (typeof html === 'string' && html.length < 1_800_000) {
                    frame.srcdoc = html;
                    return true;
                }
            } catch (_) {}
            try {
                const doc = frame.contentDocument || frame.contentWindow?.document;
                if (doc) {
                    doc.open();
                    doc.write(html);
                    doc.close();
                    return true;
                }
            } catch (e) {
                console.warn('iframe document.write failed:', e);
            }
            return false;
        };
        if (!writeIntoFrame()) {
            requestAnimationFrame(() => {
                if (!writeIntoFrame()) {
                    showNotification('Report preview could not load in the frame. Try Print or another browser.', 'warning');
                }
            });
        }
    }
    const bs = new bootstrap.Modal(modal);
    if (printBtn) {
        printBtn.onclick = () => { try { frame.contentWindow?.print(); } catch (_) {} };
    }
    modal.addEventListener('shown.bs.modal', () => {
        if (autoPrint) {
            setTimeout(() => { try { frame.contentWindow?.print(); } catch (_) {} }, 300);
        }
    }, { once: true });
    bs.show();
}

