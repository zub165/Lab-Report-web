// ============================================
// REPORTS TAB - Reports Management
// ============================================

// Use shared resolvers from common.js

const reportsOrderCache = new Map();
let reportsSelectedIds = new Set();
let reportsStatCardsWired = false;

function setReportsLoading(isLoading) {
    const tbody = document.getElementById('reportsTableBody');
    if (!tbody) return;
    if (isLoading) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">
          <div class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></div>
          Loading reports...
        </td></tr>`;
    }
}

function updateBatchActionsUI() {
    const batch = document.getElementById('batchActions');
    if (!batch) return;
    batch.style.display = reportsSelectedIds.size ? 'block' : 'none';
}

function getCheckedReportIds() {
    const tbody = document.getElementById('reportsTableBody');
    if (!tbody) return [];
    const checks = tbody.querySelectorAll('input.form-check-input[type="checkbox"][value]');
    const ids = [];
    checks.forEach(c => {
        if (c.checked) ids.push(String(c.value));
    });
    return ids;
}

// HTML escape utility
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function updateReportsStats(all) {
    const total = all.length;
    const completed = all.filter(o => (o.status || '').toLowerCase() === 'completed').length;
    const pending = all.filter(o => (o.status || '').toLowerCase() === 'pending').length;
    const today = all.filter(o => {
        const d = o.created_at || o.order_date;
        if (!d) return false;
        const dt = new Date(d); const now = new Date();
        return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth() && dt.getDate() === now.getDate();
    }).length;
    const totalEl = document.getElementById('totalReports');
    const compEl = document.getElementById('completedReports');
    const pendEl = document.getElementById('pendingReports');
    const todayEl = document.getElementById('todayReports');
    if (totalEl) totalEl.textContent = String(total);
    if (compEl) compEl.textContent = String(completed);
    if (pendEl) pendEl.textContent = String(pending);
    if (todayEl) todayEl.textContent = String(today);
}

function getSelectedReportTemplate() {
    const el = document.getElementById('reportTemplate');
    const t = (el?.value || 'standard').toLowerCase();
    return (['standard', 'modern', 'quest'].includes(t) ? t : 'standard');
}

async function handleReportsTab(filter = 'all') {
    try {
        console.log('📊 Loading reports with filter:', filter);
        setReportsLoading(true);
        
        // Use /lab/test-orders/ endpoint (API_BASE_URL already includes /lab)
        let url = `${API_BASE_URL}/test-orders/?ordering=-created_at&limit=50`;
        if (filter && filter !== 'all') {
            const param = filter === 'completed' ? 'status=completed' : filter === 'pending' ? 'status=pending' : filter === 'in_progress' ? 'status=in_progress' : '';
            url += (param ? `&${param}` : '');
        }

        // Optional date filter from UI (best-effort, only if backend supports it)
        const dateEl = document.getElementById('reportDate');
        const dateVal = String(dateEl?.value || '').trim();
        if (dateVal) {
            url += `&date=${encodeURIComponent(dateVal)}`;
        }
        
        console.log('Fetching reports from:', url);
        const resp = await authenticatedFetch(url);
        if (!resp.ok) {
            const errorText = await resp.text().catch(() => '');
            console.error('Failed to fetch reports:', resp.status, errorText);
            throw new Error(`Failed to fetch reports (${resp.status} ${resp.statusText})`);
        }
        
        const data = await resp.json();
        console.log('Reports API response:', data);
        
        // Normalize response to array
        let orders = [];
        if (Array.isArray(data)) {
            orders = data;
        } else if (Array.isArray(data.results)) {
            orders = data.results;
        } else if (Array.isArray(data.data)) {
            orders = data.data;
        } else if (Array.isArray(data.test_orders)) {
            orders = data.test_orders;
        }
        
        console.log(`✅ Loaded ${orders.length} test orders for reports`);

        // Stats (get all without filter for statistics)
        try {
            const allUrl = `${API_BASE_URL}/test-orders/?limit=1000`; // Get all for stats
            console.log('Fetching all reports for stats from:', allUrl);
            const allResp = await authenticatedFetch(allUrl);
            if (allResp.ok) {
                const allData = await allResp.json();
                let allOrders = [];
                if (Array.isArray(allData)) {
                    allOrders = allData;
                } else if (Array.isArray(allData.results)) {
                    allOrders = allData.results;
                } else if (Array.isArray(allData.data)) {
                    allOrders = allData.data;
                } else if (Array.isArray(allData.test_orders)) {
                    allOrders = allData.test_orders;
                }
                console.log(`✅ Loaded ${allOrders.length} total orders for stats`);
                updateReportsStats(allOrders);
            }
        } catch (e) {
            console.warn('Failed to load stats:', e);
            // Fallback: use current orders for stats
            if (orders.length) updateReportsStats(orders);
        }

        const tbody = document.getElementById('reportsTableBody');
        if (tbody) {
            reportsOrderCache.clear();
            if (!orders.length) {
                tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No reports found</td></tr>';
            } else {
                // Use shared resolvers with lookup
                console.log('Resolving patient names and test types...');
                const lookup = await getPatientsLookup();
                
                const resolvedOrders = await Promise.all(orders.map(async (o, idx) => {
                    try {
                        const id = o.order_id || o.order_number || o.id || o.uuid || '';
                        const patient = await resolvePatientName(o, lookup);
                        const test = await resolveTestType(o);
                        const date = o.created_at || o.order_date || o.date || o.created_date;
                        const status = (o.status || 'pending').toLowerCase();
                        
                        if (idx < 3) {
                            console.log(`Order ${idx}:`, { id, patient, test, status, date });
                        }
                        
                        return { id, patient, test, date, status, order: o }; // Keep original order for View/Print
                    } catch (e) {
                        console.error('Error resolving order:', o, e);
                        const id = o.id || o.uuid || o.order_id || o.order_number || 'Unknown';
                        return { id, patient: 'Unknown', test: 'Unknown', date: null, status: 'pending', order: o };
                    }
                }));
                
                console.log(`✅ Resolved ${resolvedOrders.length} orders`);
                
                const template = getSelectedReportTemplate();
                tbody.innerHTML = resolvedOrders.map(({ id, patient, test, date, status, order }) => {
                    // Use the most specific ID for actions
                    // Prefer `order_id` for detail routes (UUID PK lookups may 404 depending on DB storage).
                    const actionId = order.order_id || order.order_number || order.id || order.uuid || id;
                    const displayId = String(id).substring(0, 8); // Short ID for display
                    reportsOrderCache.set(String(actionId), order);
                    const checked = reportsSelectedIds.has(String(actionId)) ? 'checked' : '';
                    
                    return `
                        <tr>
                            <td><input type="checkbox" class="form-check-input" value="${actionId}" ${checked}></td>
                            <td>#${displayId}</td>
                            <td>${escapeHtml(patient)}</td>
                            <td>${escapeHtml(test)}</td>
                            <td>${date ? new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }) : 'N/A'}</td>
                            <td><span class="badge bg-${status === 'completed' ? 'success' : status === 'in_progress' ? 'info' : 'warning'}">${status}</span></td>
                            <td>
                                <div class="btn-group">
                                    <button type="button" class="btn btn-sm btn-outline-primary" data-report-action="view" data-order-id="${escapeHtml(String(actionId))}" data-template="${escapeHtml(template)}" title="View Report">View</button>
                                    <button type="button" class="btn btn-sm btn-outline-secondary" data-report-action="print" data-order-id="${escapeHtml(String(actionId))}" data-template="${escapeHtml(template)}" title="Print Report">Print</button>
                                    <button type="button" class="btn btn-sm btn-outline-success" data-report-action="pdf" data-order-id="${escapeHtml(String(actionId))}" title="Export PDF">PDF</button>
                                    <button type="button" class="btn btn-sm btn-outline-dark" data-report-action="docx" data-order-id="${escapeHtml(String(actionId))}" title="Export DOCX">DOCX</button>
                                    <button type="button" class="btn btn-sm btn-outline-info" data-report-action="edit" data-order-id="${escapeHtml(String(actionId))}" title="Edit Results">Edit</button>
                                    <button type="button" class="btn btn-sm btn-outline-danger" data-report-action="delete" data-order-id="${escapeHtml(String(actionId))}" title="Delete/Archive">Delete</button>
                                </div>
                            </td>
                        </tr>
                    `;
                }).join('');
            }
        }

        // Wire stat cards once (they live in index.html)
        if (!reportsStatCardsWired) {
            const cards = document.querySelectorAll('#reports [data-reports-stat-card]');
            cards.forEach((card) => {
                card.addEventListener('click', async () => {
                    const which = String(card.getAttribute('data-reports-stat-card') || 'all');
                    if (which === 'today') {
                        // Today is date based; reuse existing filtering by setting date input.
                        const dateEl = document.getElementById('reportDate');
                        if (dateEl) {
                            const now = new Date();
                            const yyyy = String(now.getFullYear());
                            const mm = String(now.getMonth() + 1).padStart(2, '0');
                            const dd = String(now.getDate()).padStart(2, '0');
                            dateEl.value = `${yyyy}-${mm}-${dd}`;
                        }
                        await handleReportsTab('all');
                        return;
                    }
                    // Clear date filter when using status cards (less confusing)
                    const dateEl = document.getElementById('reportDate');
                    if (dateEl) dateEl.value = '';
                    await handleReportsTab(which);
                });
            });
            reportsStatCardsWired = true;
        }

        // Wire selection UI (select-all + batch action visibility)
        const selectAll = document.getElementById('selectAllReports');
        if (selectAll && tbody) {
            selectAll.checked = false;
            selectAll.onchange = () => {
                const checked = !!selectAll.checked;
                const boxes = tbody.querySelectorAll('input.form-check-input[type="checkbox"][value]');
                boxes.forEach(b => {
                    b.checked = checked;
                    const id = String(b.value);
                    if (checked) reportsSelectedIds.add(id);
                    else reportsSelectedIds.delete(id);
                });
                updateBatchActionsUI();
            };
        }
        if (tbody) {
            tbody.onchange = (e) => {
                const box = e.target?.closest?.('input.form-check-input[type="checkbox"][value]');
                if (!box) return;
                const id = String(box.value);
                if (box.checked) reportsSelectedIds.add(id);
                else reportsSelectedIds.delete(id);
                updateBatchActionsUI();
            };
        }
        updateBatchActionsUI();
    } catch (e) {
        console.error('❌ Error handling reports tab:', e);
        showNotification('Error loading reports: ' + e.message, 'danger');
        
        // Show error in table
        const tbody = document.getElementById('reportsTableBody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Failed to load reports: ${e.message}
                <br><small>Check console for details</small>
            </td></tr>`;
        }
    }
}

window.handleReportsTab = handleReportsTab;

async function openReportFromReportsTab(orderId, autoPrint = false, template = null) {
    const key = String(orderId || '');
    if (!key) {
        showNotification('Missing report/order ID', 'danger');
        return;
    }

    try {
        const cachedOrder = reportsOrderCache.get(key);
        if (cachedOrder && typeof window.openReportTemplateFromOrder === 'function') {
            return await window.openReportTemplateFromOrder(cachedOrder, autoPrint, template);
        }
        if (typeof window.openReportTemplate === 'function') {
            return await window.openReportTemplate(key, autoPrint, template);
        }
        throw new Error('Report preview function is not loaded');
    } catch (e) {
        console.error('openReportFromReportsTab error:', e);
        showNotification('Failed to open report: ' + (e.message || 'Unknown error'), 'danger');
    }
}

function getSelectedArchiveTemplate() {
    const el = document.getElementById('archiveTemplate');
    const t = (el?.value || 'standard').toLowerCase();
    return (['standard', 'modern', 'quest'].includes(t) ? t : 'standard');
}

function setArchiveLoading(isLoading) {
    const tbody = document.getElementById('archiveTableBody');
    if (!tbody) return;
    if (isLoading) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">
          <div class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></div>
          Loading archived orders...
        </td></tr>`;
    }
}

async function handleArchiveTab() {
    try {
        setArchiveLoading(true);
        let url = `${API_BASE_URL}/test-orders/?status=archived&include_archived=1&ordering=-created_at&limit=50`;
        const dateEl = document.getElementById('archiveDate');
        const dateVal = String(dateEl?.value || '').trim();
        if (dateVal) url += `&date=${encodeURIComponent(dateVal)}`;

        const resp = await authenticatedFetch(url);
        if (!resp.ok) throw new Error(`Failed to load archive (${resp.status})`);
        const data = await resp.json();
        const orders = Array.isArray(data) ? data : (data.results || data.data || data.test_orders || []);

        const tbody = document.getElementById('archiveTableBody');
        if (!tbody) return;
        if (!orders.length) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No archived orders</td></tr>`;
            return;
        }

        const lookup = await getPatientsLookup();
        const template = getSelectedArchiveTemplate();

        const resolved = await Promise.all(orders.map(async (o) => {
            const id = o.order_id || o.order_number || o.id || o.uuid || '';
            const patient = await resolvePatientName(o, lookup);
            const tests = await resolveTestType(o);
            const date = o.created_at || o.order_date || o.date || o.created_date;
            const status = (o.status || 'archived').toLowerCase();
            return { id, patient, tests, date, status, order: o };
        }));

        tbody.innerHTML = resolved.map(({ id, patient, tests, date, status, order }) => {
            const actionId = order.order_id || order.order_number || order.id || order.uuid || id;
            reportsOrderCache.set(String(actionId), order);
            return `
              <tr>
                <td>#${escapeHtml(String(id).substring(0, 8))}</td>
                <td>${escapeHtml(patient)}</td>
                <td>${escapeHtml(tests || '—')}</td>
                <td>${date ? new Date(date).toLocaleDateString('en-US', { year:'numeric', month:'2-digit', day:'2-digit' }) : 'N/A'}</td>
                <td><span class="badge bg-secondary">${escapeHtml(status)}</span></td>
                <td>
                  <div class="btn-group">
                    <button type="button" class="btn btn-sm btn-outline-primary" data-archive-action="view" data-order-id="${escapeHtml(String(actionId))}" data-template="${escapeHtml(template)}">View</button>
                    <button type="button" class="btn btn-sm btn-outline-secondary" data-archive-action="print" data-order-id="${escapeHtml(String(actionId))}" data-template="${escapeHtml(template)}">Print</button>
                    <button type="button" class="btn btn-sm btn-outline-success" data-archive-action="pdf" data-order-id="${escapeHtml(String(actionId))}">PDF</button>
                    <button type="button" class="btn btn-sm btn-outline-dark" data-archive-action="docx" data-order-id="${escapeHtml(String(actionId))}">DOCX</button>
                    <button type="button" class="btn btn-sm btn-outline-success" data-archive-action="restore" data-order-id="${escapeHtml(String(actionId))}">Restore</button>
                  </div>
                </td>
              </tr>
            `;
        }).join('');
    } catch (e) {
        console.error('handleArchiveTab error:', e);
        const tbody = document.getElementById('archiveTableBody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Failed to load archive: ${escapeHtml(e.message || 'Unknown error')}</td></tr>`;
        showNotification('Failed to load archive: ' + (e.message || 'Unknown error'), 'danger');
    }
}

async function filterArchive() {
    return handleArchiveTab();
}

window.handleArchiveTab = handleArchiveTab;
window.filterArchive = filterArchive;

// -------------------------
// Images tab (external URLs stored in clinical_notes)
// -------------------------
function getSelectedImagesTemplate() {
    const el = document.getElementById('imagesTemplate');
    const t = (el?.value || 'standard').toLowerCase();
    return (['standard', 'modern', 'quest'].includes(t) ? t : 'standard');
}

function ensureImagesListHasAtLeastOneRow() {
    const list = document.getElementById('imagesLinksList');
    if (!list) return;
    if (!list.children.length) addImageLinkRow();
}

function addImageLinkRow(url = '', label = '') {
    const list = document.getElementById('imagesLinksList');
    if (!list) return;
    const row = document.createElement('div');
    row.className = 'd-flex gap-2 align-items-center';
    row.innerHTML = `
      <input class="form-control form-control-sm" placeholder="Label (optional)" style="max-width: 180px" value="${escapeHtml(label)}" data-image-link="label" />
      <input class="form-control form-control-sm" placeholder="https://...image.png" value="${escapeHtml(url)}" data-image-link="url" />
      <button class="btn btn-outline-danger btn-sm" type="button" title="Remove" data-image-link="remove"><i class="fas fa-times"></i></button>
    `;
    row.querySelector('[data-image-link=\"remove\"]').onclick = () => row.remove();
    list.appendChild(row);
}

function clearImageLinks() {
    const list = document.getElementById('imagesLinksList');
    if (!list) return;
    list.innerHTML = '';
    ensureImagesListHasAtLeastOneRow();
}

function collectImageLinksFromUI() {
    const list = document.getElementById('imagesLinksList');
    if (!list) return [];
    const rows = [...list.children];
    const links = [];
    rows.forEach(r => {
        const label = String(r.querySelector('[data-image-link=\"label\"]')?.value || '').trim();
        const url = String(r.querySelector('[data-image-link=\"url\"]')?.value || '').trim();
        if (!url) return;
        links.push({ url, label });
    });
    return links;
}

function parseClinicalNotesForImageLinks(clinicalNotes) {
    const raw = String(clinicalNotes || '').trim();
    if (!raw) return { otherText: '', imageLinks: [] };
    try {
        const obj = JSON.parse(raw);
        if (obj && Array.isArray(obj.image_links)) {
            return { otherText: obj.other_text || '', imageLinks: obj.image_links };
        }
    } catch (_) {}
    return { otherText: raw, imageLinks: [] };
}

function buildClinicalNotesWithImageLinks(existingClinicalNotes, imageLinks) {
    const parsed = parseClinicalNotesForImageLinks(existingClinicalNotes);
    const cleanLinks = (Array.isArray(imageLinks) ? imageLinks : []).map(l => ({
        url: String(l.url || '').trim(),
        label: String(l.label || '').trim()
    })).filter(l => l.url);
    return JSON.stringify({
        other_text: parsed.otherText || '',
        image_links: cleanLinks
    });
}

async function handleImagesTab() {
    ensureImagesListHasAtLeastOneRow();
}

async function loadOrderImages() {
    const id = String(document.getElementById('imagesOrderId')?.value || '').trim();
    if (!id) return showNotification('Enter an Order ID', 'warning');
    try {
        const resp = await authenticatedFetch(`${API_BASE_URL}/test-orders/${encodeURIComponent(id)}/`);
        if (!resp.ok) throw new Error(`Order not found (${resp.status})`);
        const order = await resp.json();
        reportsOrderCache.set(String(id), order);
        const parsed = parseClinicalNotesForImageLinks(order.clinical_notes);
        const list = document.getElementById('imagesLinksList');
        if (list) {
            list.innerHTML = '';
            (parsed.imageLinks || []).forEach(l => addImageLinkRow(l.url, l.label));
        }
        ensureImagesListHasAtLeastOneRow();
        showNotification('Loaded image links', 'success');
        await previewOrderReportWithImages();
    } catch (e) {
        console.error('loadOrderImages error:', e);
        showNotification('Failed to load order: ' + (e.message || 'Unknown error'), 'danger');
    }
}

async function saveOrderImages() {
    const id = String(document.getElementById('imagesOrderId')?.value || '').trim();
    if (!id) return showNotification('Enter an Order ID', 'warning');
    const links = collectImageLinksFromUI();
    try {
        const cached = reportsOrderCache.get(String(id));
        let existingClinicalNotes = cached?.clinical_notes;
        if (existingClinicalNotes === undefined) {
            const resp = await authenticatedFetch(`${API_BASE_URL}/test-orders/${encodeURIComponent(id)}/`);
            if (!resp.ok) throw new Error(`Order not found (${resp.status})`);
            const order = await resp.json();
            reportsOrderCache.set(String(id), order);
            existingClinicalNotes = order.clinical_notes;
        }
        const payloadNotes = buildClinicalNotesWithImageLinks(existingClinicalNotes, links);
        const resp2 = await authenticatedFetch(`${API_BASE_URL}/test-orders/${encodeURIComponent(id)}/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clinical_notes: payloadNotes })
        });
        if (!resp2.ok) throw new Error(`Save failed (${resp2.status})`);
        const updated = await resp2.json();
        reportsOrderCache.set(String(id), updated);
        showNotification('Saved image links', 'success');
        await previewOrderReportWithImages();
    } catch (e) {
        console.error('saveOrderImages error:', e);
        showNotification('Failed to save: ' + (e.message || 'Unknown error'), 'danger');
    }
}

async function previewOrderReportWithImages() {
    const id = String(document.getElementById('imagesOrderId')?.value || '').trim();
    if (!id) return;
    try {
        const order = reportsOrderCache.get(String(id)) || (await (await authenticatedFetch(`${API_BASE_URL}/test-orders/${encodeURIComponent(id)}/`)).json());
        reportsOrderCache.set(String(id), order);
        const template = getSelectedImagesTemplate();
        // Use the same report HTML builder in lab-tests.js
        if (typeof window.openReportTemplateFromOrder === 'function') {
            // But we want it inside our iframe; call builder directly if available
            if (typeof window.buildReportHTML === 'function') {
                const sResp = await authenticatedFetch(`${API_BASE_URL}/settings/ui/`);
                const sData = sResp.ok ? await sResp.json() : {};
                const settings = Array.isArray(sData) ? (sData[0] || {}) : (sData.results?.[0] || sData || {});
                const html = await window.buildReportHTML(order, settings, template);
                const frame = document.getElementById('imagesPreviewFrame');
                const doc = frame?.contentWindow?.document;
                if (doc) {
                    doc.open(); doc.write(html); doc.close();
                }
                return;
            }
            // Fallback: open modal preview
            return window.openReportTemplateFromOrder(order, false, template);
        }
    } catch (e) {
        console.error('previewOrderReportWithImages error:', e);
    }
}

async function uploadSelectedImagesFiles() {
    const input = document.getElementById('imagesUploadInput');
    const files = input?.files ? Array.from(input.files) : [];
    if (!files.length) return showNotification('Choose files to upload', 'warning');

    try {
        for (const f of files) {
            const fd = new FormData();
            fd.append('file', f);
            const resp = await authenticatedFetch(`${API_BASE_URL}/uploads/`, {
                method: 'POST',
                headers: {}, // let browser set multipart boundary
                body: fd
            });
            if (!resp.ok) throw new Error(`Upload failed (${resp.status})`);
            const data = await resp.json();
            addImageLinkRow(data.url, f.name);
        }
        try { input.value = ''; } catch (_) {}
        showNotification('Upload complete', 'success');
    } catch (e) {
        console.error('uploadSelectedImagesFiles error:', e);
        showNotification('Upload failed: ' + (e.message || 'Unknown error'), 'danger');
    }
}

window.handleImagesTab = handleImagesTab;
window.addImageLinkRow = addImageLinkRow;
window.clearImageLinks = clearImageLinks;
window.loadOrderImages = loadOrderImages;
window.saveOrderImages = saveOrderImages;
window.previewOrderReportWithImages = previewOrderReportWithImages;
window.uploadSelectedImagesFiles = uploadSelectedImagesFiles;

document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-report-action]');
    if (!button) return;

    event.preventDefault();
    const orderId = button.getAttribute('data-order-id');
    const action = button.getAttribute('data-report-action');

    if (action === 'view' || action === 'print') {
        const template = button.getAttribute('data-template') || getSelectedReportTemplate();
        const autoPrint = action === 'print';
        return openReportFromReportsTab(orderId, autoPrint, template);
    }

    if (action === 'pdf') {
        window.open(`${API_BASE_URL}/test-orders/${encodeURIComponent(orderId)}/export/pdf/`, '_blank');
        return;
    }

    if (action === 'docx') {
        window.open(`${API_BASE_URL}/test-orders/${encodeURIComponent(orderId)}/export/docx/`, '_blank');
        return;
    }

    if (action === 'edit') {
        // "Edit" means edit test results (same as Lab Tests -> Enter Result)
        if (typeof window.enterTestResult === 'function') {
            return window.enterTestResult(orderId);
        }
        if (typeof window.viewTest === 'function') {
            return window.viewTest(orderId);
        }
        showNotification('Edit function is not loaded', 'warning');
        return;
    }

    if (action === 'delete') {
        const id = String(orderId || '').trim();
        if (!id) {
            showNotification('Missing report/order ID', 'danger');
            return;
        }
        if (!confirm('Archive this report? It will be hidden but preserved for audit purposes.')) return;

        (async () => {
            try {
                // Prefer centralized archive function if present
                if (typeof window.archiveTestOrder === 'function') {
                    await window.archiveTestOrder(id);
                } else if (typeof window.deleteTestOrderFromLabTests === 'function') {
                    // Uses DELETE -> PATCH fallback inside lab-tests.js
                    await window.deleteTestOrderFromLabTests(id);
                } else {
                    // Last resort: attempt soft-delete via API
                    const resp = await authenticatedFetch(`${API_BASE_URL}/test-orders/${encodeURIComponent(id)}/`, { method: 'DELETE' });
                    if (!resp.ok) throw new Error(`Archive failed (${resp.status})`);
                }

                showNotification('Report archived', 'success');
                await handleReportsTab('all');
            } catch (e) {
                console.error('Archive report error:', e);
                showNotification('Failed to archive report: ' + (e.message || 'Unknown error'), 'danger');
            }
        })();
        return;
    }
});

document.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-archive-action]');
    if (!btn) return;
    event.preventDefault();
    const action = btn.getAttribute('data-archive-action');
    const orderId = btn.getAttribute('data-order-id');
    const template = btn.getAttribute('data-template') || getSelectedArchiveTemplate();

    if (action === 'view' || action === 'print') {
        return openReportFromReportsTab(orderId, action === 'print', template);
    }
    if (action === 'restore') {
        if (!confirm('Restore this archived order back to pending?')) return;
        (async () => {
            try {
                const resp = await authenticatedFetch(`${API_BASE_URL}/test-orders/${encodeURIComponent(orderId)}/?include_archived=1`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'pending' })
                });
                if (!resp.ok) throw new Error(`Restore failed (${resp.status})`);
                showNotification('Order restored', 'success');
                await handleArchiveTab();
                if (typeof handleReportsTab === 'function') await handleReportsTab('all');
            } catch (e) {
                console.error('Restore error:', e);
                showNotification('Restore failed: ' + (e.message || 'Unknown error'), 'danger');
            }
        })();
    }
    if (action === 'pdf') {
        window.open(`${API_BASE_URL}/test-orders/${encodeURIComponent(orderId)}/export/pdf/`, '_blank');
        return;
    }
    if (action === 'docx') {
        window.open(`${API_BASE_URL}/test-orders/${encodeURIComponent(orderId)}/export/docx/`, '_blank');
        return;
    }
});

// UI button handlers from index.html
async function filterReports() {
    const reportType = (document.getElementById('reportType')?.value || 'all').toLowerCase();
    const filter = reportType === 'all' ? 'all' : reportType;
    return handleReportsTab(filter);
}

async function exportReports() {
    try {
        // Export CSV via backend if available; fallback to downloading current rows as CSV.
        if (typeof window.exportOrdersCSV === 'function') {
            const blob = await window.exportOrdersCSV({});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `lab_reports_${new Date().toISOString().slice(0,10)}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 2000);
            showNotification('Export started', 'success');
            return;
        }
        throw new Error('Export endpoint not available');
    } catch (e) {
        console.error('exportReports error:', e);
        showNotification('Export failed: ' + e.message, 'danger');
    }
}

window.filterReports = filterReports;
window.exportReports = exportReports;
window.openReportFromReportsTab = openReportFromReportsTab;

// -------------------------
// Batch actions (Reports)
// -------------------------
async function batchPrintSelected() {
    const ids = getCheckedReportIds();
    if (!ids.length) return showNotification('Select at least 1 report', 'warning');
    // Print sequentially to avoid popup blockers and memory spikes
    for (const id of ids) {
        await openReportFromReportsTab(id, true, getSelectedReportTemplate());
    }
}

async function batchExportSelected() {
    const ids = getCheckedReportIds();
    if (!ids.length) return showNotification('Select at least 1 report', 'warning');
    showNotification('Selected export is not implemented yet. Use Export for all reports.', 'info');
}

async function batchDeleteSelected() {
    const ids = getCheckedReportIds();
    if (!ids.length) return showNotification('Select at least 1 report', 'warning');
    if (!confirm(`Archive ${ids.length} report(s)? They will be hidden but preserved for audit purposes.`)) return;
    for (const id of ids) {
        try {
            if (typeof window.archiveTestOrder === 'function') {
                await window.archiveTestOrder(id);
            } else if (typeof window.deleteTestOrderFromLabTests === 'function') {
                await window.deleteTestOrderFromLabTests(id);
            } else {
                const resp = await authenticatedFetch(`${API_BASE_URL}/test-orders/${encodeURIComponent(id)}/`, { method: 'DELETE' });
                if (!resp.ok) throw new Error(`Archive failed (${resp.status})`);
            }
            reportsSelectedIds.delete(String(id));
        } catch (e) {
            console.error('Batch archive error:', id, e);
            showNotification(`Failed to archive ${id}: ${e.message || 'Unknown error'}`, 'danger');
        }
    }
    showNotification('Batch archive complete', 'success');
    await handleReportsTab('all');
}

window.batchPrintSelected = batchPrintSelected;
window.batchExportSelected = batchExportSelected;
window.batchDeleteSelected = batchDeleteSelected;

