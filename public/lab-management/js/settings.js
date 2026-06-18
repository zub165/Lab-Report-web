// ============================================
// SETTINGS TAB - Settings Management
// ============================================

// Initialize settings form
function initializeSettingsForm() {
    const settingsContainer = document.getElementById('settingsTab');
    if (!settingsContainer) {
        console.warn('Settings tab container not found');
        return;
    }

    console.log('Initializing settings form...');
    settingsContainer.innerHTML = `
        <div class="container-fluid px-4">
            <h2 class="mt-4">System Settings</h2>
            
            <div class="card mb-4" id="accountAccessHelpCard">
                <div class="card-body">
                    <h4 class="mb-2">New registration &amp; password</h4>
                    <p class="text-muted small mb-3">
                        <strong>Register</strong> opens the same self-service form as <strong>Log in → New staff? Register</strong>.
                        An admin must then enable the account under <strong>Authorize lab staff</strong> below.
                        <strong>Change password:</strong> use Django Admin with your lab username (opens in a new tab; staff/superuser only).
                    </p>
                    <div class="d-flex flex-wrap gap-2 align-items-center">
                        <button type="button" class="btn btn-outline-primary btn-sm" id="settingsOpenRegisterModalBtn">
                            <i class="fas fa-user-plus me-1"></i> Open registration form
                        </button>
                        <a class="btn btn-outline-secondary btn-sm" id="settingsDjangoAdminLink" href="/admin/" target="_blank" rel="noopener">
                            <i class="fas fa-key me-1"></i> Django Admin (sign in &amp; change password)
                        </a>
                    </div>
                </div>
            </div>

            <p id="staffAuthHintNonAdmin" class="text-muted small mb-3" style="display:none;">
                Only lab administrators can authorize registered staff. Sign in as an admin to manage access.
            </p>

            <div class="card mb-4 border-warning" id="ensureMyLabProfileCard" style="display:none;">
                <div class="card-body">
                    <h4 class="mb-2">Complete your lab profile</h4>
                    <p class="text-muted small mb-3">
                        This login has no lab staff record, so new test orders cannot use you as the ordering clinician.
                        Submit once while signed in here—no Django admin site required.
                    </p>
                    <form id="ensureMyLabProfileForm" class="row g-2">
                        <div class="col-md-3">
                            <label class="form-label">Employee ID</label>
                            <input class="form-control" name="employee_id" required placeholder="EMP-0001" autocomplete="off">
                        </div>
                        <div class="col-md-3">
                            <label class="form-label">Role</label>
                            <select class="form-select" name="role" required>
                                <option value="doctor">Doctor</option>
                                <option value="lab_technician">Lab technician</option>
                                <option value="pathologist">Pathologist</option>
                                <option value="receptionist">Receptionist</option>
                                <option value="admin">Administrator</option>
                            </select>
                        </div>
                        <div class="col-md-3">
                            <label class="form-label">Department</label>
                            <input class="form-control" name="department" required value="Laboratory">
                        </div>
                        <div class="col-md-3">
                            <label class="form-label">Phone</label>
                            <input class="form-control" name="phone" required>
                        </div>
                        <div class="col-md-3">
                            <label class="form-label">Hire date</label>
                            <input type="date" class="form-control" name="hire_date" id="ensureMyLabProfileHireDate" required>
                        </div>
                        <div class="col-md-5">
                            <label class="form-label">Lab group</label>
                            <select class="form-select" name="lab_group" data-lab-group-select="1">
                                <option value="">Loading…</option>
                            </select>
                        </div>
                        <div class="col-12">
                            <label class="form-label">Work address</label>
                            <input class="form-control" name="address" required placeholder="Work address">
                        </div>
                        <div class="col-12">
                            <button type="submit" class="btn btn-warning btn-sm">
                                <i class="fas fa-link me-1"></i>Create my lab profile
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <div class="card mb-4 border-info" id="adminLinkLabProfileCard" style="display:none;">
                <div class="card-body">
                    <h4 class="mb-2">Link lab profile for another user</h4>
                    <p class="text-muted small mb-3">
                        For a Django user who already exists (same username as on the login screen) but has no lab row yet.
                        They will get <code>lab_user_id</code> immediately—still no Django admin required.
                    </p>
                    <form id="adminLinkLabProfileForm" class="row g-2">
                        <div class="col-md-3">
                            <label class="form-label">Their username</label>
                            <input class="form-control" name="username" required autocomplete="username" placeholder="jdoe">
                        </div>
                        <div class="col-md-3">
                            <label class="form-label">Employee ID</label>
                            <input class="form-control" name="employee_id" required placeholder="EMP-0002" autocomplete="off">
                        </div>
                        <div class="col-md-3">
                            <label class="form-label">Role</label>
                            <select class="form-select" name="role" required>
                                <option value="doctor">Doctor</option>
                                <option value="lab_technician">Lab technician</option>
                                <option value="pathologist">Pathologist</option>
                                <option value="receptionist">Receptionist</option>
                                <option value="admin">Administrator</option>
                            </select>
                        </div>
                        <div class="col-md-3">
                            <label class="form-label">Department</label>
                            <input class="form-control" name="department" required value="Laboratory">
                        </div>
                        <div class="col-md-3">
                            <label class="form-label">Phone</label>
                            <input class="form-control" name="phone" required>
                        </div>
                        <div class="col-md-3">
                            <label class="form-label">Hire date</label>
                            <input type="date" class="form-control" name="hire_date" id="adminLinkLabProfileHireDate" required>
                        </div>
                        <div class="col-md-5">
                            <label class="form-label">Lab group</label>
                            <select class="form-select" name="lab_group" data-lab-group-select="1">
                                <option value="">Loading…</option>
                            </select>
                        </div>
                        <div class="col-12">
                            <label class="form-label">Work address</label>
                            <input class="form-control" name="address" required placeholder="Work address">
                        </div>
                        <div class="col-12">
                            <button type="submit" class="btn btn-info btn-sm text-dark">
                                <i class="fas fa-user-plus me-1"></i>Link lab profile
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <div class="card mb-4" id="labGroupsAdminCard" style="display:none;">
                <div class="card-body">
                    <h4 class="mb-2">Lab groups (data partitions)</h4>
                    <p class="text-muted small mb-3">
                        Each group isolates patients, orders, appointments, and the staff list. New clinical data uses the signed-in user&apos;s group.
                        Only a Django superuser may delete a group from the API.
                    </p>
                    <form id="createLabGroupForm" class="row g-2 align-items-end mb-3">
                        <div class="col-md-6">
                            <label class="form-label">New group name</label>
                            <input class="form-control" name="lg_name" required placeholder="North Campus Lab">
                        </div>
                        <div class="col-md-3">
                            <button type="submit" class="btn btn-primary btn-sm">Add group</button>
                        </div>
                    </form>
                    <div class="table-responsive">
                        <table class="table table-sm table-striped mb-0">
                            <thead>
                                <tr><th>Name</th><th>ID (for registration JSON)</th></tr>
                            </thead>
                            <tbody id="labGroupsTableBody"></tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div class="card mb-4" id="staffDirectoryCard" style="display:none;">
                <div class="card-body">
                    <h4 class="mb-2">Lab staff directory</h4>
                    <p class="text-muted small mb-3">
                        Everyone listed here is registered in <strong>your</strong> lab group. <em>Authorized</em> means they may sign in; pending accounts stay blocked until an admin checks the box under Authorize lab staff.
                    </p>
                    <div class="table-responsive">
                        <table class="table table-sm table-striped align-middle mb-0">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Username</th>
                                    <th>Role</th>
                                    <th>Department</th>
                                    <th>Lab group</th>
                                    <th class="text-center">Authorized</th>
                                </tr>
                            </thead>
                            <tbody id="staffDirectoryTableBody"></tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div class="card mb-4" id="staffAuthCard" style="display:none;">
                <div class="card-body">
                    <h4 class="mb-2">Authorize lab staff</h4>
                    <p class="text-muted small mb-3">
                        Self-registration creates accounts that cannot sign in until you authorize them here.
                        Store the primary admin username and password in a local <code>.env</code> file (see <code>.env.example</code>) for deployments; never commit real secrets.
                    </p>
                    <div class="table-responsive">
                        <table class="table table-sm table-striped align-middle mb-0">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Username</th>
                                    <th>Role</th>
                                    <th>Department</th>
                                    <th>Lab group</th>
                                    <th class="text-center">Authorized</th>
                                </tr>
                            </thead>
                            <tbody id="staffAuthTableBody"></tbody>
                        </table>
                    </div>
                </div>
            </div>
            
            <div class="card mb-4">
                <div class="card-body">
                    <form id="settingsForm" class="needs-validation" novalidate>
                        <!-- Report Settings Section -->
                        <h4 class="mb-3">Report Settings</h4>
                            <div class="row mb-3">
                            <div class="col-md-6">
                                <label class="form-label">Default Report Template</label>
                                    <div class="input-group">
                                      <select class="form-select" name="defaultTemplate" id="defaultTemplateSelect">
                                    <option value="quest">Quest Style (recommended)</option>
                                    <option value="modern">Modern Report</option>
                                    <option value="standard">Standard Report</option>
                                      </select>
                                      <button class="btn btn-outline-primary" type="button" id="previewTemplateBtn">
                                        <i class="fas fa-eye"></i> Preview
                                      </button>
                                    </div>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Default Printer</label>
                                <select class="form-select" name="defaultPrinter">
                                    <option value="System Default">System Default</option>
                                </select>
                            </div>
                        </div>

                        <!-- Laboratory Information -->
                        <h4 class="mb-3">Laboratory Information</h4>
                        <div class="row g-3 mb-2">
                            <div class="col-md-4">
                                <label class="form-label">Display currency</label>
                                <select class="form-select" name="displayCurrency" id="settingsDisplayCurrency" title="Formats amounts in the app; stored values stay numeric.">
                                    <option value="USD">USD — US Dollar</option>
                                    <option value="PKR">PKR — Pakistani Rupee</option>
                                    <option value="EUR">EUR — Euro</option>
                                    <option value="GBP">GBP — British Pound</option>
                                    <option value="AED">AED — UAE Dirham</option>
                                    <option value="SAR">SAR — Saudi Riyal</option>
                                    <option value="INR">INR — Indian Rupee</option>
                                    <option value="CAD">CAD — Canadian Dollar</option>
                                </select>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">Theme</label>
                                <select class="form-select" name="uiTheme" id="settingsUiTheme">
                                    <option value="default">Default (indigo / violet)</option>
                                    <option value="ocean">Ocean (cyan / teal)</option>
                                    <option value="forest">Forest (green)</option>
                                    <option value="rose">Rose (magenta)</option>
                                    <option value="slate_dark">Slate dark (night UI)</option>
                                </select>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">Language</label>
                                <select class="form-select" name="uiLocale" id="settingsUiLocale">
                                    <option value="en">English</option>
                                    <option value="ur">Urdu</option>
                                    <option value="ar">Arabic (RTL)</option>
                                    <option value="es">Español</option>
                                </select>
                            </div>
                            <p class="text-muted small col-12 mb-0">Currency affects labels only unless you convert catalog amounts in the database. PKR uses Pakistan-style grouping when shown.</p>
                        </div>

                        <div class="card mb-3 border-primary" id="labStripeSettingsCard" style="display:none;">
                            <div class="card-body">
                                <h5 class="mb-2"><i class="fas fa-credit-card me-2"></i>Stripe — card payments (this lab only)</h5>
                                <p class="text-muted small mb-3">
                                    Each lab uses its own Stripe account. Keys are saved on the server (<code>POST /settings/ui/</code>)
                                    and shared with the <strong>SaeedLab mobile app</strong> for this lab.
                                    Never put a secret key (<code>sk_</code>) in the mobile app—only here and on Django.
                                </p>
                                <p class="small mb-3" id="settingsStripeActivePreview"></p>
                                <div class="row g-3">
                                    <div class="col-md-6">
                                        <label class="form-label">Publishable key</label>
                                        <input type="password" class="form-control font-monospace" name="stripePublishableKey"
                                               id="settingsStripePublishableKey" autocomplete="off"
                                               placeholder="pk_live_… or pk_test_…">
                                        <div class="form-text">Safe to use in browsers and Flutter (<code>pk_</code> only).</div>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Secret key (server only)</label>
                                        <input type="password" class="form-control font-monospace" name="stripeSecretKey"
                                               id="settingsStripeSecretKey" autocomplete="new-password"
                                               placeholder="sk_live_… (leave blank to keep existing)">
                                        <div class="form-text" id="settingsStripeSecretStatus"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="row g-3">
                            <div class="col-md-6">
                                <label class="form-label">Laboratory Name</label>
                                <input type="text" class="form-control" name="labName" required>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Contact Number</label>
                                <input type="text" class="form-control" name="contactNumber" required>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Email</label>
                                <input type="email" class="form-control" name="email" required 
                                       placeholder="lab@example.com">
                            </div>
                            <div class="col-12">
                                <label class="form-label">Address</label>
                                <textarea class="form-control" name="address" rows="2" required></textarea>
                            </div>
                        </div>

                        <!-- Staff who enter patient data (real accounts) -->
                        <h4 class="mt-4 mb-3">Staff who enter patient information</h4>
                        <p class="text-muted small">
                            <strong>Doctors</strong> and <strong>lab technicians</strong> use their own username and password to sign in, then add patients, appointments, and orders.
                            Lab <strong>administrators</strong> (or Django superusers) can create accounts below. Other roles can use <strong>Log in</strong> → register; an admin must then authorize them under <strong>Authorize lab staff</strong>.
                        </p>
                        <p id="clinicalStaffHintNonAdmin" class="small text-muted mb-3" style="display:none;">
                            Only an administrator can add staff accounts here. If you need access, ask your lab admin.
                        </p>
                        <div id="clinicalStaffAdminPanel" style="display:none;">
                            <div class="table-responsive border rounded mb-3">
                                <table class="table table-sm mb-0 align-middle">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Username</th>
                                            <th>Role</th>
                                            <th>Department</th>
                                            <th>Lab group</th>
                                            <th class="text-center">Active</th>
                                        </tr>
                                    </thead>
                                    <tbody id="clinicalStaffTableBody"></tbody>
                                </table>
                            </div>
                            <h5 class="h6 mb-2">Add doctor or lab technician</h5>
                            <div id="addClinicalStaffForm" class="row g-2 border rounded p-3 mb-3 bg-light" role="group" aria-label="Add clinical staff">
                                <div class="col-md-4">
                                    <label class="form-label">Username</label>
                                    <input class="form-control" name="cs_username" required autocomplete="username">
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label">Email</label>
                                    <input type="email" class="form-control" name="cs_email" required autocomplete="email">
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label">Password (min 8)</label>
                                    <input type="password" class="form-control" name="cs_password" required minlength="8" autocomplete="new-password">
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">First name</label>
                                    <input class="form-control" name="cs_first_name" required>
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">Last name</label>
                                    <input class="form-control" name="cs_last_name" required>
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">Employee ID</label>
                                    <input class="form-control" name="cs_employee_id" required placeholder="EMP-0201">
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">Role</label>
                                    <select class="form-select" name="cs_role" required>
                                        <option value="doctor">Doctor</option>
                                        <option value="lab_technician">Lab technician</option>
                                        <option value="receptionist">Receptionist (front desk)</option>
                                    </select>
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label">Lab group</label>
                                    <select class="form-select" name="cs_lab_group" data-lab-group-select="1">
                                        <option value="">Loading…</option>
                                    </select>
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label">Department</label>
                                    <input class="form-control" name="cs_department" required value="Laboratory">
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label">Phone</label>
                                    <input class="form-control" name="cs_phone" required>
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label">Hire date</label>
                                    <input type="date" class="form-control" name="cs_hire_date" id="clinicalStaffHireDate" required>
                                </div>
                                <div class="col-12">
                                    <label class="form-label">Address</label>
                                    <input class="form-control" name="cs_address" required placeholder="Work address">
                                </div>
                                <div class="col-12">
                                    <button type="button" class="btn btn-success btn-sm" id="addClinicalStaffSubmitBtn">
                                        <i class="fas fa-user-plus me-1"></i>Create account
                                    </button>
                                </div>
                            </div>
                        </div>

                        <h5 class="h6 mt-3 mb-2">Report letterhead (optional)</h5>
                        <p class="text-muted small mb-2">Optional labels on printed reports. This does not create logins—use the section above for real users.</p>
                        <div class="row g-3">
                            <div class="col-md-6">
                                <label class="form-label">Authorized Doctor (display)</label>
                                <input type="text" class="form-control" name="authorizedDoctor"
                                       placeholder="Dr. John Smith">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Lab Technician (display)</label>
                                <input type="text" class="form-control" name="labTechnician"
                                       placeholder="James Wilson">
                            </div>
                        </div>

                        <!-- QR Code Settings -->
                        <h4 class="mt-4 mb-3">QR Code Settings</h4>
                        <div class="row g-3">
                            <div class="col-12">
                                <div class="form-check form-switch">
                                    <input class="form-check-input" type="checkbox" name="showQRCode" id="showQRCode">
                                    <label class="form-check-label" for="showQRCode">Show QR Code on Reports</label>
                                </div>
                            </div>
                            <div class="col-md-12" id="qrCodeSection" style="display: none;">
                                <label class="form-label">QR Code Content Type</label>
                                <select class="form-select mb-3" name="qrCodeType">
                                    <option value="testId">Test ID</option>
                                    <option value="patientId">Patient ID</option>
                                    <option value="custom">Custom Text/URL</option>
                                </select>
                                <div id="customQRSection" style="display: none;">
                                    <label class="form-label">Custom QR Code Data</label>
                                    <input type="text" class="form-control" name="qrCodeData" 
                                           placeholder="Enter URL or text for QR code">
                                </div>
                            </div>
                        </div>

                        <hr class="my-4">
                        <button class="btn btn-primary" type="submit">Save Changes</button>
                    </form>
                </div>
            </div>
        </div>
    `;

    // Add form submit handler
    const form = document.getElementById('settingsForm');
    if (form) {
        form.addEventListener('submit', handleSettingsSubmit);
            // Add template preview behavior
            const previewBtn = document.getElementById('previewTemplateBtn');
            if (previewBtn) {
                previewBtn.addEventListener('click', async () => {
                    try {
                        const template = (form.elements['defaultTemplate']?.value || 'quest').toLowerCase();
                        // Find a recent completed order to preview
                        const resp = await authenticatedFetch(`${API_BASE_URL}/test-orders/?ordering=-created_at&limit=25`);
                        if (!resp.ok) throw new Error('Failed to fetch test orders to preview');
                        const data = await resp.json();
                        const orders = Array.isArray(data) ? data : (data.results || data.data || []);
                        const order = orders.find(o => (o.status || '').toLowerCase() === 'completed') || orders[0];
                        if (!order) {
                            showNotification('No test orders found to preview', 'warning');
                            return;
                        }
                        const orderId = order.id || order.uuid || order.order_id;
                        // Use client-side professional renderer (backend /lab/reports/{id}/ expects GeneratedReport PK, not order id)
                        await openReportTemplateFromOrder(order, false, template);
                    } catch (e) {
                        console.error('Preview template error:', e);
                        // Fallback to client-side renderer if possible
                        try {
                            // last fetched order id might be unknown here; refetch minimal
                            const r = await authenticatedFetch(`${API_BASE_URL}/test-orders/?ordering=-created_at&limit=1`);
                            if (r.ok) {
                                const d = await r.json();
                                const os = Array.isArray(d) ? d : (d.results || d.data || []);
                                const oid = os[0]?.id || os[0]?.uuid || os[0]?.order_id;
                                if (oid) return openReportTemplate(oid, false, template);
                            }
                        } catch (_) {}
                        showNotification('Preview failed: ' + e.message, 'danger');
                    }
                });
            }
        
        // Add QR code toggle handler
        const qrToggle = document.getElementById('showQRCode');
        const qrSection = document.getElementById('qrCodeSection');
        const qrTypeSelect = form.elements['qrCodeType'];
        const customQRSection = document.getElementById('customQRSection');

        if (qrToggle && qrSection) {
            qrToggle.addEventListener('change', (e) => {
                qrSection.style.display = e.target.checked ? 'block' : 'none';
            });
        }

        if (qrTypeSelect && customQRSection) {
            qrTypeSelect.addEventListener('change', (e) => {
                customQRSection.style.display = e.target.value === 'custom' ? 'block' : 'none';
            });
        }

        // Load saved settings
        loadSavedSettings();
        bindStaffAuthDelegation();
        bindClinicalStaffForm();
        bindEnsureMyLabProfileForm();
        bindAdminLinkLabProfileForm();
        bindCreateLabGroupForm();
        bindSettingsAccountShortcuts();
    }
}

function bindSettingsAccountShortcuts() {
    const adminA = document.getElementById('settingsDjangoAdminLink');
    if (adminA && !adminA.dataset.hrefSet) {
        adminA.dataset.hrefSet = '1';
        try {
            adminA.href = `${window.location.origin}/admin/`;
        } catch (_) {}
    }
    const regBtn = document.getElementById('settingsOpenRegisterModalBtn');
    if (!regBtn || regBtn.dataset.bound === '1') return;
    regBtn.dataset.bound = '1';
    regBtn.addEventListener('click', () => {
        if (typeof window.openLabRegisterModal === 'function') {
            window.openLabRegisterModal();
        } else {
            showNotification('Registration UI not loaded. Refresh the page.', 'warning');
        }
    });
}

/** Lab admin or Django superuser — can manage users API. */
function settingsUserIsLabAdmin(pdata) {
    if (!pdata || typeof pdata !== 'object') return false;
    if (pdata.is_superuser === true || pdata.is_lab_admin === true) return true;
    return ['admin', 'administrator'].includes(pdata.role);
}

const CLINICAL_STAFF_ROLES = new Set(['doctor', 'lab_technician', 'receptionist']);

function bindEnsureMyLabProfileForm() {
    const form = document.getElementById('ensureMyLabProfileForm');
    if (!form || form.dataset.bound === '1') return;
    form.dataset.bound = '1';
    const hd = document.getElementById('ensureMyLabProfileHireDate');
    if (hd && !hd.value) hd.value = new Date().toISOString().slice(0, 10);
    form.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const fd = new FormData(form);
        const payload = {
            employee_id: String(fd.get('employee_id') || '').trim(),
            role: String(fd.get('role') || 'doctor'),
            department: String(fd.get('department') || '').trim(),
            phone: String(fd.get('phone') || '').trim(),
            address: String(fd.get('address') || '').trim(),
            hire_date: String(fd.get('hire_date') || '').trim(),
        };
        const lg = String(fd.get('lab_group') || '').trim();
        if (lg) payload.lab_group = lg;
        try {
            await ensureMyLabProfile(payload);
            showNotification('Lab profile created. You can place test orders as this clinician.', 'success');
            form.reset();
            if (hd) hd.value = new Date().toISOString().slice(0, 10);
            await refreshLabProfileLinkSections();
            await populateSettingsLabGroupSelects();
            await refreshStaffAuthorizationSection();
            await refreshClinicalStaffSection();
            await refreshStaffDirectorySection();
            try {
                window.dispatchEvent(new CustomEvent('lab:lab-profile-linked'));
            } catch (_) {}
        } catch (err) {
            showNotification(err.message || 'Could not create lab profile', 'danger');
        }
    });
}

function bindAdminLinkLabProfileForm() {
    const form = document.getElementById('adminLinkLabProfileForm');
    if (!form || form.dataset.bound === '1') return;
    form.dataset.bound = '1';
    const hd = document.getElementById('adminLinkLabProfileHireDate');
    if (hd && !hd.value) hd.value = new Date().toISOString().slice(0, 10);
    form.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const fd = new FormData(form);
        const payload = {
            username: String(fd.get('username') || '').trim(),
            employee_id: String(fd.get('employee_id') || '').trim(),
            role: String(fd.get('role') || 'doctor'),
            department: String(fd.get('department') || '').trim(),
            phone: String(fd.get('phone') || '').trim(),
            address: String(fd.get('address') || '').trim(),
            hire_date: String(fd.get('hire_date') || '').trim(),
        };
        const lg = String(fd.get('lab_group') || '').trim();
        if (lg) payload.lab_group = lg;
        if (!payload.username) {
            showNotification('Username is required.', 'warning');
            return;
        }
        try {
            await adminLinkLabProfile(payload);
            showNotification(`Lab profile linked for ${payload.username}.`, 'success');
            form.reset();
            if (hd) hd.value = new Date().toISOString().slice(0, 10);
            await populateSettingsLabGroupSelects();
            await refreshStaffAuthorizationSection();
            await refreshClinicalStaffSection();
            await refreshStaffDirectorySection();
        } catch (err) {
            showNotification(err.message || 'Could not link lab profile', 'danger');
        }
    });
}

async function refreshEnsureMyLabProfileSection() {
    const card = document.getElementById('ensureMyLabProfileCard');
    if (!card) return;
    try {
        const profResp = await getUserProfile();
        const pdata = profResp && (profResp.data || profResp);
        if (pdata && pdata.lab_user_id != null && pdata.lab_user_id !== '') {
            card.style.display = 'none';
            return;
        }
        card.style.display = 'block';
        const hd = document.getElementById('ensureMyLabProfileHireDate');
        if (hd && !hd.value) hd.value = new Date().toISOString().slice(0, 10);
    } catch (e) {
        console.warn('ensureMyLabProfile card:', e);
        card.style.display = 'none';
    }
}

async function refreshAdminLinkLabProfileSection() {
    const card = document.getElementById('adminLinkLabProfileCard');
    if (!card) return;
    try {
        const profResp = await getUserProfile();
        const pdata = profResp && (profResp.data || profResp);
        if (!settingsUserIsLabAdmin(pdata)) {
            card.style.display = 'none';
            return;
        }
        card.style.display = 'block';
        const hd = document.getElementById('adminLinkLabProfileHireDate');
        if (hd && !hd.value) hd.value = new Date().toISOString().slice(0, 10);
    } catch (e) {
        console.warn('adminLinkLabProfile card:', e);
        card.style.display = 'none';
    }
}

async function refreshLabProfileLinkSections() {
    await refreshEnsureMyLabProfileSection();
    await refreshAdminLinkLabProfileSection();
}

function bindClinicalStaffForm() {
    const panel = document.getElementById('addClinicalStaffForm');
    const btn = document.getElementById('addClinicalStaffSubmitBtn');
    if (!panel || !btn || panel.dataset.bound === '1') return;
    panel.dataset.bound = '1';
    const hd = document.getElementById('clinicalStaffHireDate');
    if (hd && !hd.value) {
        hd.value = new Date().toISOString().slice(0, 10);
    }
    const read = (name) => String(panel.querySelector(`[name="${name}"]`)?.value || '').trim();
    const submit = async () => {
        const payload = {
            username: read('cs_username'),
            email: read('cs_email'),
            password: String(panel.querySelector('[name="cs_password"]')?.value || ''),
            first_name: read('cs_first_name'),
            last_name: read('cs_last_name'),
            employee_id: read('cs_employee_id'),
            role: read('cs_role') || 'doctor',
            department: read('cs_department'),
            phone: read('cs_phone'),
            address: read('cs_address'),
            hire_date: read('cs_hire_date'),
        };
        const cslg = read('cs_lab_group');
        if (cslg) payload.lab_group = cslg;
        if (!payload.username || !payload.password || payload.password.length < 8) {
            showNotification('Username and password (min 8 characters) are required.', 'warning');
            return;
        }
        try {
            await createUser(payload);
            showNotification('Staff account created. They can sign in on the lab login screen.', 'success');
            panel.querySelectorAll('input, select').forEach((el) => {
                if (el.type === 'button' || el.type === 'submit') return;
                el.value = '';
            });
            if (hd) hd.value = new Date().toISOString().slice(0, 10);
            const dept = panel.querySelector('[name="cs_department"]');
            if (dept) dept.value = 'Laboratory';
            const roleSel = panel.querySelector('[name="cs_role"]');
            if (roleSel) roleSel.value = 'doctor';
            await refreshClinicalStaffSection();
            await refreshStaffAuthorizationSection();
            await refreshStaffDirectorySection();
        } catch (err) {
            showNotification(err.message || 'Could not create user', 'danger');
        }
    };
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        submit();
    });
    panel.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
        }
    });
}

async function refreshClinicalStaffSection() {
    const panel = document.getElementById('clinicalStaffAdminPanel');
    const tbody = document.getElementById('clinicalStaffTableBody');
    const hint = document.getElementById('clinicalStaffHintNonAdmin');
    if (!panel || !tbody) return;

    try {
        const profResp = await getUserProfile();
        const pdata = profResp && (profResp.data || profResp);
        if (!settingsUserIsLabAdmin(pdata)) {
            panel.style.display = 'none';
            if (hint) hint.style.display = 'block';
            tbody.innerHTML = '';
            return;
        }
        if (hint) hint.style.display = 'none';
        panel.style.display = 'block';

        const raw = await getUsers({ ordering: 'user__last_name' });
        const rows = Array.isArray(raw) ? raw : (raw.results || []);
        const clinical = rows.filter((lu) => CLINICAL_STAFF_ROLES.has(String(lu.role || '')));

        tbody.innerHTML = clinical.length
            ? clinical.map((lu) => {
                const name = lu.full_name
                    || `${(lu.user && lu.user.first_name) || ''} ${(lu.user && lu.user.last_name) || ''}`.trim()
                    || '—';
                const uname = (lu.user && lu.user.username) || '—';
                const active = lu.is_active ? '<span class="text-success">Yes</span>' : '<span class="text-warning">No</span>';
                const lg = labGroupLabel(lu);
                return `
                    <tr>
                        <td>${escapeHtml(name)}</td>
                        <td>${escapeHtml(uname)}</td>
                        <td>${escapeHtml(lu.role || '—')}</td>
                        <td>${escapeHtml(lu.department || '—')}</td>
                        <td>${escapeHtml(lg)}</td>
                        <td class="text-center">${active}</td>
                    </tr>`;
            }).join('')
            : `<tr><td colspan="6" class="text-muted text-center py-3">No doctor, technician, or receptionist accounts yet. Add one below.</td></tr>`;
        await refreshStaffDirectorySection();
    } catch (e) {
        console.warn('Clinical staff section:', e);
        panel.style.display = 'none';
        if (hint) hint.style.display = 'none';
        tbody.innerHTML = '';
    }
}

/** Event delegation for lab staff authorize toggles (admin only). */
function bindStaffAuthDelegation() {
    const card = document.getElementById('staffAuthCard');
    if (!card || card.dataset.authBound === '1') return;
    card.dataset.authBound = '1';
    card.addEventListener('change', async (ev) => {
        const t = ev.target;
        if (!t || t.type !== 'checkbox' || !t.hasAttribute('data-lab-user-id')) return;
        const id = t.getAttribute('data-lab-user-id');
        const wantActive = t.checked;
        try {
            await updateUser(id, { is_active: wantActive }, true);
            showNotification(wantActive ? 'Staff member authorized.' : 'Authorization removed.', 'success');
            await refreshStaffDirectorySection();
        } catch (err) {
            t.checked = !wantActive;
            showNotification(err.message || 'Could not update user', 'danger');
        }
    });
}

function labGroupLabel(lu) {
    if (!lu || typeof lu !== 'object') return '—';
    if (lu.lab_group_name) return lu.lab_group_name;
    if (lu.lab_group && typeof lu.lab_group === 'object' && lu.lab_group.name) return lu.lab_group.name;
    return '—';
}

async function populateSettingsLabGroupSelects() {
    if (typeof getLabGroups !== 'function') return;
    try {
        const raw = await getLabGroups();
        const rows = Array.isArray(raw) ? raw : (raw.results || []);
        document.querySelectorAll('[data-lab-group-select]').forEach((sel) => {
            const cur = sel.value;
            sel.innerHTML = '<option value="">Use default (first alphabetically)</option>';
            rows.forEach((g) => {
                const o = document.createElement('option');
                o.value = g.id;
                o.textContent = g.name || g.id;
                sel.appendChild(o);
            });
            if (cur && [...sel.options].some((o) => o.value === cur)) sel.value = cur;
        });
    } catch (e) {
        console.warn('Lab group selects', e);
    }
}

async function refreshStaffDirectorySection() {
    const card = document.getElementById('staffDirectoryCard');
    const tbody = document.getElementById('staffDirectoryTableBody');
    if (!card || !tbody) return;
    try {
        const raw = await getUsers({ ordering: 'user__last_name' });
        const rows = Array.isArray(raw) ? raw : (raw.results || []);
        card.style.display = 'block';
        tbody.innerHTML = rows.length
            ? rows.map((lu) => {
                const name = lu.full_name
                    || `${(lu.user && lu.user.first_name) || ''} ${(lu.user && lu.user.last_name) || ''}`.trim()
                    || '—';
                const uname = (lu.user && lu.user.username) || '—';
                const lg = labGroupLabel(lu);
                const auth = lu.is_active
                    ? '<span class="text-success">Yes</span>'
                    : '<span class="text-warning">No (pending)</span>';
                return `
                    <tr>
                        <td>${escapeHtml(name)}</td>
                        <td>${escapeHtml(uname)}</td>
                        <td>${escapeHtml(lu.role || '—')}</td>
                        <td>${escapeHtml(lu.department || '—')}</td>
                        <td>${escapeHtml(lg)}</td>
                        <td class="text-center">${auth}</td>
                    </tr>`;
            }).join('')
            : '<tr><td colspan="6" class="text-muted text-center py-3">No lab staff in your group yet.</td></tr>';
    } catch (e) {
        console.warn('Staff directory:', e);
        card.style.display = 'none';
        tbody.innerHTML = '';
    }
}

async function refreshLabGroupsAdminSection() {
    const card = document.getElementById('labGroupsAdminCard');
    const tbody = document.getElementById('labGroupsTableBody');
    if (!card || !tbody) return;
    try {
        const profResp = await getUserProfile();
        const pdata = profResp && (profResp.data || profResp);
        if (!settingsUserIsLabAdmin(pdata)) {
            card.style.display = 'none';
            tbody.innerHTML = '';
            return;
        }
        card.style.display = 'block';
        const raw = await getLabGroups();
        const rows = Array.isArray(raw) ? raw : (raw.results || []);
        tbody.innerHTML = rows.length
            ? rows.map((g) => `
                <tr>
                    <td>${escapeHtml(g.name || '')}</td>
                    <td><code class="small user-select-all">${escapeHtml(g.id)}</code></td>
                </tr>`).join('')
            : '<tr><td colspan="2" class="text-muted">No active groups.</td></tr>';
    } catch (e) {
        console.warn('Lab groups admin:', e);
        card.style.display = 'none';
        tbody.innerHTML = '';
    }
}

function bindCreateLabGroupForm() {
    const form = document.getElementById('createLabGroupForm');
    if (!form || form.dataset.bound === '1') return;
    form.dataset.bound = '1';
    form.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const name = String(new FormData(form).get('lg_name') || '').trim();
        if (!name) return;
        try {
            if (typeof createLabGroup !== 'function') throw new Error('createLabGroup is not available.');
            await createLabGroup({ name, is_active: true });
            showNotification('Lab group created.', 'success');
            form.reset();
            await refreshLabGroupsAdminSection();
            await populateSettingsLabGroupSelects();
        } catch (err) {
            showNotification(err.message || 'Could not create group', 'danger');
        }
    });
}

async function refreshStaffAuthorizationSection() {
    const card = document.getElementById('staffAuthCard');
    const tbody = document.getElementById('staffAuthTableBody');
    const hint = document.getElementById('staffAuthHintNonAdmin');
    if (!card || !tbody) return;

    try {
        const profResp = await getUserProfile();
        const pdata = profResp && (profResp.data || profResp);
        const labUserId = pdata && pdata.lab_user_id;

        if (!settingsUserIsLabAdmin(pdata)) {
            card.style.display = 'none';
            if (hint) hint.style.display = 'block';
            tbody.innerHTML = '';
            return;
        }
        if (hint) hint.style.display = 'none';

        const raw = await getUsers({ ordering: 'user__last_name' });
        const rows = Array.isArray(raw) ? raw : (raw.results || []);

        tbody.innerHTML = rows.map((lu) => {
            const name = lu.full_name
                || `${(lu.user && lu.user.first_name) || ''} ${(lu.user && lu.user.last_name) || ''}`.trim()
                || '—';
            const uname = (lu.user && lu.user.username) || '—';
            const selfRow = labUserId != null && String(lu.id) === String(labUserId);
            const disabledAttr = selfRow ? ' disabled title="You cannot change your own authorization here"' : '';
            const lg = labGroupLabel(lu);
            return `
                <tr>
                    <td>${escapeHtml(name)}</td>
                    <td>${escapeHtml(uname)}</td>
                    <td>${escapeHtml(lu.role || '—')}</td>
                    <td>${escapeHtml(lu.department || '—')}</td>
                    <td>${escapeHtml(lg)}</td>
                    <td class="text-center">
                        <input type="checkbox" class="form-check-input" data-lab-user-id="${lu.id}"
                            ${lu.is_active ? 'checked' : ''}${disabledAttr} />
                    </td>
                </tr>`;
        }).join('');

        card.style.display = 'block';
        await refreshStaffDirectorySection();
    } catch (e) {
        console.warn('Staff authorization section:', e);
        card.style.display = 'none';
        if (hint) hint.style.display = 'none';
        tbody.innerHTML = '';
    }
}

function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
}

function maskStripeKey(key) {
    const k = String(key || '').trim();
    if (!k) return '—';
    if (k.length <= 12) return k;
    return `${k.slice(0, 8)}…${k.slice(-4)}`;
}

function isValidStripePublishable(k) {
    const s = String(k || '').trim();
    return s.startsWith('pk_test_') || s.startsWith('pk_live_');
}

function isValidStripeSecret(k) {
    const s = String(k || '').trim();
    return s.startsWith('sk_test_') || s.startsWith('sk_live_');
}

function stripeSecretConfiguredInSettings(data) {
    if (!data || typeof data !== 'object') return false;
    if (data.stripe_secret_configured === true) return true;
    const hint = String(data.stripe_secret_key || '').trim();
    if (!hint) return false;
    if (hint === '***' || hint.toLowerCase() === 'configured') return true;
    return isValidStripeSecret(hint);
}

function publishableFromLabSettings(data) {
    if (!data || typeof data !== 'object') return '';
    for (const field of ['stripe_publishable_key', 'stripe_publishable', 'publishable_key']) {
        const v = String(data[field] || '').trim();
        if (isValidStripePublishable(v)) return v;
    }
    return '';
}

function populateStripeSettingsFields(data) {
    const pkEl = document.getElementById('settingsStripePublishableKey');
    const skEl = document.getElementById('settingsStripeSecretKey');
    const statusEl = document.getElementById('settingsStripeSecretStatus');
    const activeEl = document.getElementById('settingsStripeActivePreview');
    if (!pkEl) return;
    const pk = publishableFromLabSettings(data);
    pkEl.value = pk;
    if (skEl) skEl.value = '';
    if (statusEl) {
        statusEl.textContent = stripeSecretConfiguredInSettings(data)
            ? 'A secret key is already stored on the server. Leave this field blank to keep it.'
            : 'Enter sk_live_… or sk_test_… so Django can create PaymentIntents for card payments.';
    }
    if (activeEl) {
        activeEl.className = pk ? 'small text-success mb-3' : 'small text-warning mb-3';
        activeEl.textContent = pk
            ? `Active publishable: ${maskStripeKey(pk)} — synced with mobile (Settings → Laboratory Information).`
            : 'No Stripe publishable key for this lab yet. Staff cannot take live card payments until you save keys.';
    }
}

async function refreshStripeSettingsSection() {
    const card = document.getElementById('labStripeSettingsCard');
    if (!card) return;
    try {
        const profResp = await getUserProfile();
        const pdata = profResp && (profResp.data || profResp);
        card.style.display = settingsUserIsLabAdmin(pdata) ? 'block' : 'none';
    } catch (e) {
        console.warn('Stripe settings card:', e);
        card.style.display = 'none';
    }
}

// Load saved settings from API or localStorage
async function loadSavedSettings() {
    const form = document.getElementById('settingsForm');
    if (!form) return;

    try {
        // Try to fetch from API first
        const response = await authenticatedFetch(`${API_BASE_URL}/settings/ui/`);
        if (response.ok) {
            const data = await response.json();
            // Populate form with API data
            if (form.elements['labName']) form.elements['labName'].value = data.lab_name || '';
            if (form.elements['contactNumber']) form.elements['contactNumber'].value = data.lab_phone || '';
            if (form.elements['email']) form.elements['email'].value = data.lab_email || '';
            if (form.elements['address']) form.elements['address'].value = data.lab_address || '';
            if (form.elements['authorizedDoctor']) form.elements['authorizedDoctor'].value = data.authorized_doctor || '';
            if (form.elements['labTechnician']) form.elements['labTechnician'].value = data.lab_technician || '';
            if (form.elements['showQRCode']) form.elements['showQRCode'].checked = data.show_qr_code || false;
            if (form.elements['qrCodeType']) form.elements['qrCodeType'].value = data.qr_code_type || 'testId';
            if (form.elements['qrCodeData']) form.elements['qrCodeData'].value = data.qr_code_data || '';
            if (form.elements['defaultTemplate']) form.elements['defaultTemplate'].value = data.default_template || 'quest';
            const dc = form.elements['displayCurrency'];
            if (dc) dc.value = (data.display_currency || 'USD').toUpperCase();
            const ut = form.elements['uiTheme'];
            if (ut) ut.value = data.ui_theme || 'default';
            const ul = form.elements['uiLocale'];
            if (ul) ul.value = data.ui_locale || 'en';
            populateStripeSettingsFields(data);

            try {
                storage.set('labInfo', { ...(storage.get('labInfo') || {}), ...data });
            } catch (_) {}
            if (typeof window.applyLabAppearanceFromStorage === 'function') {
                window.applyLabAppearanceFromStorage();
            }
            
            // Show QR section if enabled
            const qrSection = document.getElementById('qrCodeSection');
            if (qrSection && data.show_qr_code) {
                qrSection.style.display = 'block';
            }
            const customQRSection = document.getElementById('customQRSection');
            if (customQRSection) {
                customQRSection.style.display = (data.qr_code_type || 'testId') === 'custom' ? 'block' : 'none';
            }
            
            console.log('Settings loaded from API');
            await refreshStripeSettingsSection();
            await refreshLabProfileLinkSections();
            await refreshStaffAuthorizationSection();
            await refreshClinicalStaffSection();
            await populateSettingsLabGroupSelects();
            await refreshLabGroupsAdminSection();
            await refreshStaffDirectorySection();
            return;
        }
    } catch (error) {
        console.warn('Could not load settings from API, using localStorage:', error);
    }

    // Fallback to localStorage
    const labInfo = storage.get('labInfo') || {
        lab_name: 'SAEED LABORATORY',
        lab_address: '123 Medical Center Dr, Healthcare City',
        lab_phone: '555-0126',
        lab_email: 'info@saeedlab.com',
        authorized_doctor: 'Dr. John Smith',
        lab_technician: 'James Wilson',
        show_qr_code: false,
        qr_code_data: window.location.origin,
        default_template: 'quest',
        qr_code_type: 'testId',
        display_currency: 'USD',
        ui_theme: 'default',
        ui_locale: 'en',
    };

    // Set form values
    if (form.elements['labName']) form.elements['labName'].value = labInfo.lab_name;
    if (form.elements['contactNumber']) form.elements['contactNumber'].value = labInfo.lab_phone;
    if (form.elements['email']) form.elements['email'].value = labInfo.lab_email;
    if (form.elements['address']) form.elements['address'].value = labInfo.lab_address;
    if (form.elements['authorizedDoctor']) form.elements['authorizedDoctor'].value = labInfo.authorized_doctor;
    if (form.elements['labTechnician']) form.elements['labTechnician'].value = labInfo.lab_technician;
    if (form.elements['showQRCode']) form.elements['showQRCode'].checked = labInfo.show_qr_code || false;
    if (form.elements['qrCodeType']) form.elements['qrCodeType'].value = labInfo.qr_code_type || 'testId';
    if (form.elements['qrCodeData']) form.elements['qrCodeData'].value = labInfo.qr_code_data || '';
    if (form.elements['defaultTemplate']) form.elements['defaultTemplate'].value = labInfo.default_template || 'quest';
    const dc2 = form.elements['displayCurrency'];
    if (dc2) dc2.value = (labInfo.display_currency || 'USD').toUpperCase();
    const ut2 = form.elements['uiTheme'];
    if (ut2) ut2.value = labInfo.ui_theme || 'default';
    const ul2 = form.elements['uiLocale'];
    if (ul2) ul2.value = labInfo.ui_locale || 'en';
    populateStripeSettingsFields(labInfo);
    if (typeof window.applyLabAppearanceFromStorage === 'function') {
        window.applyLabAppearanceFromStorage();
    }
    
    // Show QR section if enabled
    const qrSection = document.getElementById('qrCodeSection');
    if (qrSection && labInfo.show_qr_code) {
        qrSection.style.display = 'block';
    }
    const customQRSection = document.getElementById('customQRSection');
    if (customQRSection) {
        customQRSection.style.display = (labInfo.qr_code_type || 'testId') === 'custom' ? 'block' : 'none';
    }

    await refreshStripeSettingsSection();
    await refreshLabProfileLinkSections();
    await refreshStaffAuthorizationSection();
    await refreshClinicalStaffSection();
    await populateSettingsLabGroupSelects();
    await refreshLabGroupsAdminSection();
    await refreshStaffDirectorySection();
}

// Handle settings form submission
async function handleSettingsSubmit(event) {
    event.preventDefault();
    
    try {
        const form = document.getElementById('settingsForm');
        if (!form) {
            showNotification('Settings form not found', 'danger');
            return;
        }
        
        const formData = new FormData(form);
        
        // Get lab information
        const labInfo = {
            lab_name: formData.get('labName') || 'SAEED LABORATORY',
            lab_address: formData.get('address') || '123 Medical Center Dr, Healthcare City',
            lab_phone: formData.get('contactNumber') || '555-0126',
            lab_email: formData.get('email') || 'info@saeedlab.com',
            authorized_doctor: formData.get('authorizedDoctor') || 'Dr. John Smith',
            lab_technician: formData.get('labTechnician') || 'James Wilson',
            show_qr_code: formData.get('showQRCode') === 'on',
            qr_code_type: formData.get('qrCodeType') || 'testId',
            qr_code_data: formData.get('qrCodeData') || '',
            default_template: formData.get('defaultTemplate') || 'quest',
            display_currency: String(formData.get('displayCurrency') || 'USD').toUpperCase(),
            ui_theme: String(formData.get('uiTheme') || 'default'),
            ui_locale: String(formData.get('uiLocale') || 'en'),
        };

        try {
            const profResp = await getUserProfile();
            const pdata = profResp && (profResp.data || profResp);
            if (settingsUserIsLabAdmin(pdata)) {
                const pk = String(formData.get('stripePublishableKey') || '').trim();
                if (pk) {
                    if (!isValidStripePublishable(pk)) {
                        showNotification('Publishable key must start with pk_test_ or pk_live_', 'warning');
                        return;
                    }
                    labInfo.stripe_publishable_key = pk;
                }
                const sk = String(formData.get('stripeSecretKey') || '').trim();
                if (sk) {
                    if (!isValidStripeSecret(sk)) {
                        showNotification('Secret key must start with sk_test_ or sk_live_', 'warning');
                        return;
                    }
                    labInfo.stripe_secret_key = sk;
                }
            }
        } catch (profileErr) {
            console.warn('Could not verify admin for Stripe save:', profileErr);
        }

        // Try to save to API first
        try {
            const response = await authenticatedFetch(`${API_BASE_URL}/settings/ui/`, {
                method: 'POST',
                body: JSON.stringify(labInfo)
            });
            
            if (response.ok) {
                console.log('Settings saved to API');
                // Keep localStorage in sync with what API stored
                try {
                    const saved = await response.json();
                    storage.set('labInfo', saved);
                    populateStripeSettingsFields(saved);
                } catch (_) {
                    storage.set('labInfo', labInfo);
                    populateStripeSettingsFields(labInfo);
                }
            }
        } catch (apiError) {
            console.warn('Could not save to API, saving to localStorage:', apiError);
        }

        // Save latest values locally as backup for report rendering if API is unavailable.
        storage.set('labInfo', labInfo);
        populateStripeSettingsFields(labInfo);

        // Notify other modules (reports/print) to refresh settings
        try {
            window.dispatchEvent(new CustomEvent('lab:settings-updated'));
        } catch (_) {}

        showNotification('Settings saved successfully!', 'success');

    } catch (error) {
        console.error('Error saving settings:', error);
        showNotification('Error saving settings: ' + error.message, 'danger');
    }
}

// Load settings function (called when tab is shown)
async function loadSettings() {
    console.log('Loading settings...');
    // Initialize form if not already initialized
    if (!document.getElementById('settingsForm')) {
        initializeSettingsForm();
    } else {
        // Just reload saved settings
        await loadSavedSettings();
        await refreshStripeSettingsSection();
        await refreshLabProfileLinkSections();
        await populateSettingsLabGroupSelects();
        await refreshLabGroupsAdminSection();
        await refreshStaffDirectorySection();
    }
}

// Export functions to window
window.initializeSettingsForm = initializeSettingsForm;
window.loadSettings = loadSettings;
window.handleSettingsSubmit = handleSettingsSubmit;
window.loadSavedSettings = loadSavedSettings;

