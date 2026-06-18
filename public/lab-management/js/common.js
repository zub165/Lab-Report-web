// Database connection configuration (Frontend placeholder, backend handles actual DB)
const dbConfig = {
    database: 'Medi_Lab.mdb',
    connectionString: 'Provider=Microsoft.Jet.OLEDB.4.0;Data Source=Medi_Lab.mdb'
};

// API Configuration
// - On your server (port 3003 or Nginx): same-origin `/lab`
// - On GitHub Pages: set repo variable LAB_API_URL or localStorage `saeedlab_api_base`
function resolveApiBaseUrl() {
    try {
        const stored = localStorage.getItem('saeedlab_api_base');
        if (stored && String(stored).trim()) {
            return String(stored).trim().replace(/\/$/, '');
        }
    } catch (_) {}
    const host = (window.location.hostname || '').toLowerCase();
    if (host.endsWith('.github.io') || host === 'github.io') {
        const meta = document.querySelector('meta[name="saeedlab-api-base"]');
        const fromMeta = meta && meta.getAttribute('content');
        if (fromMeta && String(fromMeta).trim()) {
            return String(fromMeta).trim().replace(/\/$/, '');
        }
        return 'https://api.mywaitime.com/lab';
    }
    return `${window.location.origin}/lab`;
}
const API_BASE_URL = resolveApiBaseUrl();
let authToken = null;
let refreshToken = null;

function normalizeTokenResponse(payload) {
    if (!payload) return null;

    // Common shapes:
    // - { access, refresh }
    // - { access_token, refresh_token }
    // - { data: { access, refresh } } or { data: { access_token, refresh_token } }
    // - { status: 'success', data: { ... } }
    const data = payload.data && typeof payload.data === 'object' ? payload.data : payload;

    const access =
        data.access ||
        data.access_token ||
        data.token ||
        payload.access ||
        payload.access_token ||
        null;
    const refresh =
        data.refresh ||
        data.refresh_token ||
        payload.refresh ||
        payload.refresh_token ||
        null;

    if (!access) return null;
    return { access, refresh: refresh || null, raw: payload };
}

function ensureLoginModal() {
    let modal = document.getElementById('loginModal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'loginModal';
    modal.className = 'modal fade';
    modal.tabIndex = -1;
    modal.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Sign in</h5>
          </div>
          <div class="modal-body">
            <div class="alert alert-warning small mb-3">
              Your session is not authenticated. Please sign in to load patients and reports.
            </div>
            <div class="mb-3">
              <label class="form-label">Username</label>
              <input class="form-control" id="loginUsername" autocomplete="username" />
            </div>
            <div class="mb-2">
              <label class="form-label">Password</label>
              <input type="password" class="form-control" id="loginPassword" autocomplete="current-password" />
            </div>
            <div class="small text-muted" id="loginError" style="display:none"></div>
            <div class="mt-3 pt-2 border-top small">
              <button type="button" class="btn btn-link btn-sm p-0 me-3" id="loginOpenRegisterBtn">New staff? Register</button>
              <a class="small" id="loginForgotPasswordLink" href="#" target="_blank" rel="noopener">Forgot password (Django Admin)</a>
            </div>
          </div>
          <div class="modal-footer flex-wrap gap-2">
            <button type="button" class="btn btn-outline-secondary" id="loginCancelBtn">Cancel</button>
            <button type="button" class="btn btn-primary" id="loginSubmitBtn">Sign in</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    const adm = modal.querySelector('#loginForgotPasswordLink');
    if (adm) adm.href = `${window.location.origin}/admin/`;
    return modal;
}

function ensureLabRegisterModal() {
    let modal = document.getElementById('labRegisterModal');
    if (modal) return modal;

    const today = new Date().toISOString().slice(0, 10);
    modal = document.createElement('div');
    modal.id = 'labRegisterModal';
    modal.className = 'modal fade';
    modal.tabIndex = -1;
    modal.innerHTML = `
      <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Register staff account</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <p class="small text-muted">
              After you submit, a <strong>lab administrator</strong> must enable your account under
              <strong>Settings → Authorize lab staff</strong> before you can sign in.
            </p>
            <div class="row g-2">
              <div class="col-md-4"><label class="form-label">Username</label><input class="form-control" id="regUsername" required autocomplete="username" /></div>
              <div class="col-md-4"><label class="form-label">Email</label><input type="email" class="form-control" id="regEmail" required autocomplete="email" /></div>
              <div class="col-md-4"><label class="form-label">Password (min 8)</label><input type="password" class="form-control" id="regPassword" required minlength="8" autocomplete="new-password" /></div>
              <div class="col-md-3"><label class="form-label">First name</label><input class="form-control" id="regFirst" required /></div>
              <div class="col-md-3"><label class="form-label">Last name</label><input class="form-control" id="regLast" required /></div>
              <div class="col-md-3"><label class="form-label">Employee ID</label><input class="form-control" id="regEmpId" required placeholder="EMP-0001" /></div>
              <div class="col-md-3"><label class="form-label">Role</label>
                <select class="form-select" id="regRole">
                  <option value="doctor">Doctor</option>
                  <option value="lab_technician">Lab technician</option>
                  <option value="receptionist">Receptionist</option>
                  <option value="pathologist">Pathologist</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              <div class="col-md-4"><label class="form-label">Department</label><input class="form-control" id="regDept" value="Laboratory" required /></div>
              <div class="col-md-4"><label class="form-label">Phone</label><input class="form-control" id="regPhone" required /></div>
              <div class="col-md-4"><label class="form-label">Hire date</label><input type="date" class="form-control" id="regHire" value="${today}" required /></div>
              <div class="col-12">
                <label class="form-label">Lab group (branch)</label>
                <select class="form-select" id="regLabGroup"><option value="">Default — first active group</option></select>
                <div class="form-text">Keeps your account in the correct data partition when an admin authorizes you.</div>
              </div>
              <div class="col-12"><label class="form-label">Work address</label><input class="form-control" id="regAddr" required placeholder="Work address" /></div>
            </div>
            <div class="small text-danger mt-2" id="regError" style="display:none"></div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            <button type="button" class="btn btn-primary" id="regSubmitBtn">Submit registration</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    (async () => {
        const sel = modal.querySelector('#regLabGroup');
        if (!sel || typeof window.getLabGroups !== 'function') return;
        try {
            const raw = await window.getLabGroups();
            const rows = Array.isArray(raw) ? raw : (raw.results || []);
            sel.innerHTML = '<option value="">Default — first active group</option>';
            rows.forEach((g) => {
                const o = document.createElement('option');
                o.value = g.id;
                o.textContent = g.name || g.id;
                sel.appendChild(o);
            });
        } catch (e) {
            console.warn('Registration lab groups', e);
        }
    })();

    modal.querySelector('#regSubmitBtn')?.addEventListener('click', async () => {
        const err = modal.querySelector('#regError');
        if (err) {
            err.style.display = 'none';
            err.textContent = '';
        }
        const payload = {
            username: String(modal.querySelector('#regUsername')?.value || '').trim(),
            email: String(modal.querySelector('#regEmail')?.value || '').trim(),
            password: String(modal.querySelector('#regPassword')?.value || ''),
            first_name: String(modal.querySelector('#regFirst')?.value || '').trim(),
            last_name: String(modal.querySelector('#regLast')?.value || '').trim(),
            employee_id: String(modal.querySelector('#regEmpId')?.value || '').trim(),
            role: String(modal.querySelector('#regRole')?.value || 'doctor'),
            department: String(modal.querySelector('#regDept')?.value || '').trim(),
            phone: String(modal.querySelector('#regPhone')?.value || '').trim(),
            address: String(modal.querySelector('#regAddr')?.value || '').trim(),
            hire_date: String(modal.querySelector('#regHire')?.value || '').trim(),
        };
        const regLg = String(modal.querySelector('#regLabGroup')?.value || '').trim();
        if (regLg) payload.lab_group = regLg;
        if (!payload.username || payload.password.length < 8) {
            if (err) {
                err.style.display = 'block';
                err.textContent = 'Username and password (min 8 characters) are required.';
            }
            return;
        }
        if (typeof window.register !== 'function') {
            if (err) {
                err.style.display = 'block';
                err.textContent = 'Registration helper is not loaded (api-endpoints.js).';
            }
            return;
        }
        try {
            await window.register(payload);
            showNotification(
                'Registration submitted. Ask a lab admin to authorize you under Settings → Authorize lab staff.',
                'success'
            );
            try {
                bootstrap.Modal.getInstance(modal)?.hide();
            } catch (_) {}
            modal.querySelectorAll('input').forEach((el) => {
                if (el.type === 'button' || el.type === 'submit') return;
                if (el.id === 'regHire') {
                    el.value = new Date().toISOString().slice(0, 10);
                    return;
                }
                if (el.id === 'regDept') {
                    el.value = 'Laboratory';
                    return;
                }
                el.value = '';
            });
        } catch (e) {
            if (err) {
                err.style.display = 'block';
                err.textContent = e.message || 'Registration failed';
            }
        }
    });

    return modal;
}

function openLabRegisterModal() {
    const modal = ensureLabRegisterModal();
    (async () => {
        const sel = modal.querySelector('#regLabGroup');
        if (!sel || typeof window.getLabGroups !== 'function') return;
        try {
            const raw = await window.getLabGroups();
            const rows = Array.isArray(raw) ? raw : (raw.results || []);
            const cur = sel.value;
            sel.innerHTML = '<option value="">Default — first active group</option>';
            rows.forEach((g) => {
                const o = document.createElement('option');
                o.value = g.id;
                o.textContent = g.name || g.id;
                sel.appendChild(o);
            });
            if (cur && [...sel.options].some((o) => o.value === cur)) sel.value = cur;
        } catch (e) {
            console.warn('Registration lab groups', e);
        }
    })();
    const bs = new bootstrap.Modal(modal);
    bs.show();
}

function promptForCredentials() {
    return new Promise((resolve) => {
        const modal = ensureLoginModal();
        const usernameEl = modal.querySelector('#loginUsername');
        const passwordEl = modal.querySelector('#loginPassword');
        const submitBtn = modal.querySelector('#loginSubmitBtn');
        const cancelBtn = modal.querySelector('#loginCancelBtn');
        const regBtn = modal.querySelector('#loginOpenRegisterBtn');
        const errEl = modal.querySelector('#loginError');

        const done = (creds) => {
            try {
                bs.hide();
            } catch (_) {}
            resolve(creds);
        };

        const onSubmit = () => {
            const username = String(usernameEl?.value || '').trim();
            const password = String(passwordEl?.value || '');
            if (!username || !password) {
                if (errEl) {
                    errEl.style.display = 'block';
                    errEl.textContent = 'Username and password are required.';
                }
                return;
            }
            done({ username, password });
        };

        if (errEl) {
            errEl.style.display = 'none';
            errEl.textContent = '';
        }
        if (submitBtn) submitBtn.onclick = onSubmit;
        if (cancelBtn) {
            cancelBtn.onclick = () => {
                done(null);
            };
        }
        if (regBtn) {
            regBtn.onclick = () => {
                try {
                    bs.hide();
                } catch (_) {}
                resolve(null);
                setTimeout(() => {
                    try {
                        openLabRegisterModal();
                    } catch (e) {
                        console.error(e);
                    }
                }, 250);
            };
        }
        if (passwordEl) {
            passwordEl.onkeydown = (e) => {
                if (e.key === 'Enter') onSubmit();
            };
        }

        const bs = new bootstrap.Modal(modal, { backdrop: 'static', keyboard: false });
        bs.show();
        setTimeout(() => {
            try {
                usernameEl?.focus();
            } catch (_) {}
        }, 100);
    });
}

async function setTokens(access, refresh = null) {
    authToken = access;
    refreshToken = refresh || refreshToken || null;
    localStorage.setItem('lab_auth_token', authToken);
    if (refreshToken) localStorage.setItem('lab_refresh_token', refreshToken);
}

function clearTokens() {
    authToken = null;
    refreshToken = null;
    try { localStorage.removeItem('lab_auth_token'); } catch (_) {}
    try { localStorage.removeItem('lab_refresh_token'); } catch (_) {}
}

/** Sidebar: show Log in vs Log out and optional user label */
async function updateLabAuthToolbar() {
    const loginBtn = document.getElementById('labAuthLoginBtn');
    const logoutBtn = document.getElementById('labAuthLogoutBtn');
    const userLbl = document.getElementById('labAuthUserLabel');
    const tok = localStorage.getItem('lab_auth_token');
    const signedIn = !!tok;
    if (loginBtn) loginBtn.classList.toggle('d-none', signedIn);
    if (logoutBtn) logoutBtn.classList.toggle('d-none', !signedIn);
    if (!userLbl) return;
    if (!signedIn) {
        userLbl.classList.add('d-none');
        userLbl.textContent = '';
        document.getElementById('staff-nav-item')?.classList.add('d-none');
        return;
    }
    userLbl.classList.remove('d-none');
    userLbl.textContent = '…';
    try {
        const r = await fetch(`${API_BASE_URL}/auth/profile/`, {
            headers: {
                Authorization: `Bearer ${tok}`,
                Accept: 'application/json'
            }
        });
        if (!r.ok) throw new Error('profile');
        const payload = await r.json().catch(() => ({}));
        const inner = payload.data && typeof payload.data === 'object' ? payload.data : payload;
        const name = [inner.first_name, inner.last_name].filter(Boolean).join(' ').trim();
        userLbl.textContent = name || inner.username || inner.email || 'Signed in';
        userLbl.title = inner.username ? String(inner.username) : '';
        const staffNav = document.getElementById('staff-nav-item');
        if (staffNav) {
            staffNav.classList.toggle('d-none', !inner.is_superuser);
        }
    } catch (_) {
        userLbl.textContent = 'Signed in';
        userLbl.title = '';
    }
}

async function signInLabUser() {
    try {
        await authenticate();
        await updateLabAuthToolbar();
        showNotification('Signed in successfully.', 'success');
    } catch (_) {
        showNotification('Sign-in failed or was cancelled.', 'warning');
    }
}

function signOutLabUser() {
    const tok = localStorage.getItem('lab_auth_token');
    if (tok) {
        fetch(`${API_BASE_URL}/auth/logout/`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${tok}`,
                'Content-Type': 'application/json',
                Accept: 'application/json'
            }
        }).catch(() => {});
    }
    clearTokens();
    if (typeof window.clearDoctorIdCache === 'function') {
        try {
            window.clearDoctorIdCache();
        } catch (_) {}
    }
    updateLabAuthToolbar();
    showNotification('You have been logged out.', 'info');
}

// JWT Authentication Functions
async function authenticate(username = null, password = null) {
    try {
        console.log('🔐 Starting authentication...');
        // If caller didn't pass credentials, prompt (no more hardcoded admin/admin123)
        if (!username || !password) {
            const creds = await promptForCredentials();
            if (!creds || !creds.username || !creds.password) {
                throw new Error('Sign-in cancelled');
            }
            username = creds.username;
            password = creds.password;
        }

        // Prefer SimpleJWT token endpoint
        console.log('Auth URL:', `${API_BASE_URL}/auth/token/`);
        let response = await fetch(`${API_BASE_URL}/auth/token/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        // Fallback to legacy login if token endpoint is missing
        if (response.status === 404) {
            console.warn('Token endpoint not found; falling back to /auth/login/');
            response = await fetch(`${API_BASE_URL}/auth/login/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
        }

        console.log('Auth response status:', response.status);
        if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            console.error('Authentication failed - Response:', errorText);
            let msg = 'Authentication required';
            try {
                const errBody = JSON.parse(errorText);
                msg = errBody.detail || errBody.message || errBody.non_field_errors?.[0] || msg;
                if (typeof msg === 'object' && msg !== null) {
                    msg = JSON.stringify(msg);
                }
            } catch (_) {
                if (errorText && errorText.length < 500) msg = errorText;
            }
            if (response.status === 403 || response.status === 401) {
                showNotification(String(msg), response.status === 403 ? 'warning' : 'danger');
            }
            throw new Error(msg);
        }

        const payload = await response.json().catch(() => ({}));
        console.log('Auth response data:', payload);

        const tokens = normalizeTokenResponse(payload);
        if (!tokens) {
            console.error('Invalid token response format:', payload);
            throw new Error('Authentication required');
        }

        await setTokens(tokens.access, tokens.refresh);
        console.log('✅ Authentication successful! Token stored.');
        console.log('Access token length:', authToken ? authToken.length : 0);
        try {
            await updateLabAuthToolbar();
        } catch (_) {}
        return tokens.raw;
    } catch (error) {
        console.error('❌ Authentication error:', error);
        console.error('Error type:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        
        // Check for CORS errors
        if (error.message && (error.message.includes('CORS') || error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))) {
            console.error('🚨 CORS ERROR DETECTED!');
            showNotification('CORS Error: Cannot connect to backend. Please check CORS configuration.', 'danger');
        }
        
        throw error;
    }
}

// Authenticated fetch wrapper
async function authenticatedFetch(url, options = {}) {
    try {
        // Load token from localStorage if available
        if (!authToken) {
            authToken = localStorage.getItem('lab_auth_token');
            refreshToken = localStorage.getItem('lab_refresh_token');
        }
        
        // If no token, authenticate first
        if (!authToken) {
            console.log('No auth token found, authenticating...');
            await authenticate();
        }
        
        const isFormData = (typeof FormData !== 'undefined') && (options?.body instanceof FormData);
        const headers = {
            ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
            ...options.headers
        };

        const doFetch = async (authHeaderValue) => {
            const h = { ...headers };
            if (authHeaderValue) h['Authorization'] = authHeaderValue;
            console.log(`Making authenticated request to: ${url}`);
            return await fetch(url, { ...options, headers: h });
        };

        const trySchemes = async () => {
            // Try the most common schemes. Different DRF configs use different prefixes.
            const schemes = ['Bearer', 'JWT', 'Token'];
            if (!authToken) return await doFetch(null);
            let last = null;
            for (const s of schemes) {
                last = await doFetch(`${s} ${authToken}`);
                if (last.status !== 401) return last;
            }
            return last || await doFetch(null);
        };

        // First attempt: try common auth schemes
        let response = await trySchemes();
        
        // Log response status and headers for debugging
        console.log(`Response status: ${response.status} for ${url}`);
        
        // If unauthorized, try to refresh token
        if (response.status === 401 && refreshToken) {
            console.log('401 Unauthorized, attempting token refresh...');
            console.log('Refresh token available:', !!refreshToken);
            try {
                const refreshResponse = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ refresh: refreshToken })
                });
                
                console.log('Refresh response status:', refreshResponse.status);
                
                if (refreshResponse.ok) {
                    const refreshData = await refreshResponse.json();
                    console.log('Refresh response data:', refreshData);
                    
                    const tokens = normalizeTokenResponse(refreshData);
                    if (!tokens) throw new Error('Invalid refresh response format');
                    await setTokens(tokens.access, tokens.refresh);
                    console.log('✅ Token refreshed successfully');

                    // Retry original request with common schemes
                    const retry = await trySchemes();
                    if (retry.status !== 401) return retry;
                    // If still 401, force a clean re-login
                    console.warn('Still 401 after refresh; clearing tokens and prompting login...');
                    clearTokens();
                    await authenticate();
                    return await trySchemes();
                } else {
                    const errorText = await refreshResponse.text();
                    console.error('Token refresh failed - Response:', errorText);
                    // Try to re-authenticate
                    console.log('Attempting to re-authenticate...');
                    clearTokens();
                    await authenticate();
                    return await trySchemes();
                }
            } catch (refreshError) {
                console.error('❌ Token refresh error:', refreshError);
                console.error('Refresh error details:', {
                    message: refreshError.message,
                    name: refreshError.name
                });
                // Try to re-authenticate
                try {
                    console.log('Attempting to re-authenticate after refresh failure...');
                    clearTokens();
                    await authenticate();
                    return await trySchemes();
                } catch (authError) {
                    console.error('❌ Re-authentication also failed:', authError);
                    throw new Error('Authentication failed. Please refresh the page.');
                }
            }
        }
        
        // If still unauthorized after refresh attempts, throw error
        if (response.status === 401) {
            console.error('❌ Still unauthorized after refresh attempts');
            const errorText = await response.text();
            console.error('Error response:', errorText);
            // Clear invalid tokens so next attempt shows login modal
            clearTokens();
            throw new Error('Authentication required');
        }
        
        return response;
    } catch (error) {
        console.error('Authenticated fetch error:', error);
        console.error('Error details:', {
            message: error.message,
            name: error.name,
            stack: error.stack
        });
        
        // Check if it's a CORS error
        if (error.message && (error.message.includes('CORS') || error.message.includes('NetworkError'))) {
            showNotification('CORS Error: Please check backend CORS configuration. Origin: ' + window.location.origin, 'danger');
        }
        
        throw error;
    }
}

// Utility Functions
const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
};

const showNotification = (message, type = 'success') => {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notif => {
        notif.style.animation = 'slideOut 0.3s ease-out forwards';
        setTimeout(() => notif.remove(), 300);
    });
    
    // Create enhanced notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.setAttribute('role', 'alert');
    
    // Add icon based on type
    const icons = {
        success: '<i class="fas fa-check-circle me-2"></i>',
        danger: '<i class="fas fa-exclamation-circle me-2"></i>',
        warning: '<i class="fas fa-exclamation-triangle me-2"></i>',
        info: '<i class="fas fa-info-circle me-2"></i>'
    };
    
    notification.innerHTML = `
        <div class="d-flex align-items-center justify-content-between">
            <div class="d-flex align-items-center">
                ${icons[type] || icons.success}
                <span>${message}</span>
            </div>
            <button type="button" class="btn-close btn-close-white ms-3" onclick="this.parentElement.parentElement.remove()" aria-label="Close"></button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideOut 0.3s ease-out forwards';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
};

// Add calculateAge function to global scope
const calculateAge = (dob) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};

// Temporary Storage Functions (for local caching, not mock data)
const storage = {
    get(key) {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : null;
    },
    set(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    },
    remove(key) {
            localStorage.removeItem(key);
    },
    clear() {
            localStorage.clear();
    }
};

// Export common functions to the window object
window.API_BASE_URL = API_BASE_URL;
window.authenticate = authenticate;
window.authenticatedFetch = authenticatedFetch;
window.formatDate = formatDate;
window.showNotification = showNotification;
window.calculateAge = calculateAge;
window.storage = storage;
window.updateLabAuthToolbar = updateLabAuthToolbar;
window.signInLabUser = signInLabUser;
window.signOutLabUser = signOutLabUser;

// ============================================
// UNIFIED PATIENT DATA MANAGER - Shared across all tabs
// ============================================

// Patient data cache with TTL
let patientsCache = null;
let patientsCacheTime = 0;
const PATIENTS_CACHE_TTL = 60000; // 60 seconds

// Patient data storage key
const PATIENTS_STORAGE_KEY = 'lab_patients_cache';

// Get patients from backend first, fallback to localStorage
async function getPatients(forceRefresh = false) {
    // Check cache if not forcing refresh
    if (!forceRefresh && patientsCache && (Date.now() - patientsCacheTime) < PATIENTS_CACHE_TTL) {
        console.log('Using cached patients data');
        return patientsCache;
    }
    
    // Try backend first
    try {
        console.log('Fetching patients from backend...');
        const response = await authenticatedFetch(`${API_BASE_URL}/patients/`);
        if (response.ok) {
            const data = await response.json();
            // Normalize to array
            let patients = [];
            if (Array.isArray(data)) {
                patients = data;
            } else if (Array.isArray(data.results)) {
                patients = data.results;
            } else if (Array.isArray(data.data)) {
                patients = data.data;
            } else if (Array.isArray(data.patients)) {
                patients = data.patients;
            }
            
            // Update cache
            patientsCache = patients;
            patientsCacheTime = Date.now();
            
            // Sync to localStorage as backup
            try {
                storage.set(PATIENTS_STORAGE_KEY, {
                    data: patients,
                    timestamp: Date.now()
                });
            } catch (e) {
                console.warn('Failed to save patients to localStorage:', e);
            }
            
            console.log(`✅ Fetched ${patients.length} patients from backend`);
            return patients;
        }
    } catch (e) {
        console.warn('Failed to fetch patients from backend, trying localStorage:', e);
    }
    
    // Fallback to localStorage
    try {
        const cached = storage.get(PATIENTS_STORAGE_KEY);
        if (cached && Array.isArray(cached.data)) {
            const age = Date.now() - (cached.timestamp || 0);
            if (age < 3600000) { // Use if less than 1 hour old
                console.log(`Using ${cached.data.length} patients from localStorage (${Math.round(age/1000)}s old)`);
                patientsCache = cached.data;
                patientsCacheTime = Date.now();
                return cached.data;
            }
        }
    } catch (e) {
        console.warn('Failed to load patients from localStorage:', e);
    }
    
    // Last resort: return empty array
    console.warn('No patients data available from backend or localStorage');
    return [];
}

// Get single patient by ID
async function getPatientById(patientId) {
    const patients = await getPatients();
    return patients.find(p => {
        const id = p.id || p.uuid || p.patient_id;
        return id && String(id) === String(patientId);
    }) || null;
}

// Invalidate patient cache (call after add/edit/delete)
function invalidatePatientsCache() {
    patientsCache = null;
    patientsCacheTime = 0;
    // Also clear lookup cache
    patientsLookupCache = null;
    patientsLookupCacheTime = 0;
    // Also clear localStorage cache
    try {
        storage.remove(PATIENTS_STORAGE_KEY);
    } catch (e) {
        console.warn('Failed to clear patients from localStorage:', e);
    }
    console.log('✅ Patient cache invalidated - will refresh on next fetch');
}

// Refresh all tabs that display patients (called after patient mutations)
async function refreshAllPatientDisplays() {
    console.log('🔄 Refreshing all patient displays...');
    const refreshTasks = [
        // Refresh patients tab
        { name: 'patients', fn: window.loadPatients },
        // Refresh dashboard recent tests (shows patient names)
        { name: 'dashboard', fn: window.loadRecentTests },
        // Refresh dashboard stats (may include patient counts)
        { name: 'dashboard-stats', fn: window.loadDashboardStats },
        // Refresh lab tests tab (shows patient names)
        { name: 'lab-tests', fn: window.loadTests },
        // Refresh appointments (references patients)
        { name: 'appointments', fn: window.loadAppointmentsTable },
        // Refresh payments (references patients via test orders)
        { name: 'payments', fn: window.loadPaymentsTable },
        // Refresh reports (references patients)
        { name: 'reports', fn: () => window.handleReportsTab && window.handleReportsTab('all') }
    ];
    
    const results = await Promise.allSettled(
        refreshTasks.map(async ({ name, fn }) => {
            if (typeof fn === 'function') {
                try {
                    await fn();
                    console.log(`✅ Refreshed ${name} tab`);
                } catch (e) {
                    console.warn(`⚠️ Failed to refresh ${name} tab:`, e);
                }
            }
        })
    );
    
    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    console.log(`🔄 Refresh complete: ${succeeded} succeeded, ${failed} failed`);
}

// Refresh all tabs that display test orders (called after test order mutations)
async function refreshAllTestOrderDisplays() {
    console.log('🔄 Refreshing all test order displays...');
    const refreshTasks = [
        // Refresh dashboard recent tests
        { name: 'dashboard-tests', fn: window.loadRecentTests },
        // Refresh dashboard stats (includes test counts)
        { name: 'dashboard-stats', fn: window.loadDashboardStats },
        // Refresh lab tests tab
        { name: 'lab-tests', fn: window.loadTests },
        // Refresh reports (test orders are reports)
        { name: 'reports', fn: () => window.handleReportsTab && window.handleReportsTab('all') },
        // Refresh payments (may reference test orders)
        { name: 'payments', fn: window.loadPaymentsTable },
        // Refresh appointments (may reference test orders)
        { name: 'appointments', fn: window.loadAppointmentsTable }
    ];
    
    const results = await Promise.allSettled(
        refreshTasks.map(async ({ name, fn }) => {
            if (typeof fn === 'function') {
                try {
                    await fn();
                    console.log(`✅ Refreshed ${name}`);
                } catch (e) {
                    console.warn(`⚠️ Failed to refresh ${name}:`, e);
                }
            }
        })
    );
    
    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    console.log(`🔄 Test order refresh complete: ${succeeded} succeeded`);
}

window.getPatients = getPatients;
window.getPatientById = getPatientById;
window.invalidatePatientsCache = invalidatePatientsCache;
window.refreshAllPatientDisplays = refreshAllPatientDisplays;
window.refreshAllTestOrderDisplays = refreshAllTestOrderDisplays;
window.PATIENTS_STORAGE_KEY = PATIENTS_STORAGE_KEY; // Export for consistency

// ============================================
// ENHANCED DATA RESOLVERS - Used across all tabs
// ============================================

// Patient name resolver with lookup cache
let patientsLookupCache = null;
let patientsLookupCacheTime = 0;
const CACHE_TTL = 30000; // 30 seconds

async function refreshPatientsLookup() {
    // Delegate to getPatientsLookup which uses unified getPatients
    return await getPatientsLookup();
}

async function getPatientsLookup() {
    // Use unified getPatients instead of separate lookup
    const patients = await getPatients();
    const lookup = new Map();
    patients.forEach(p => {
        const id = p.id || p.uuid || p.patient_id;
        if (id) lookup.set(String(id), p);
    });
    patientsLookupCache = lookup;
    patientsLookupCacheTime = Date.now();
    return lookup;
}

// Resolve patient name from order/object with fallback lookup
async function resolvePatientName(obj, lookup = null) {
    // First try: nested patient object
    if (obj.patient && typeof obj.patient === 'object') {
        const p = obj.patient;
        const name = p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim();
        if (name && name !== 'Unknown') return name;
    }
    
    // Second try: direct fields
    const direct = obj.patient_name || obj.patient_full_name || obj.patientFullName || 
                   obj.patientName || obj.patient?.name;
    if (direct && direct !== 'Unknown') return direct;
    
    // Third try: lookup by patient ID
    // Backend patient detail routes use `patient_id` (PAT...), so prefer that.
    const patientId = obj.patient_id || obj.patient?.patient_id || obj.patient?.id || obj.patient?.uuid || obj.patient;
    if (patientId) {
        const map = lookup || await getPatientsLookup();
        const p = map.get(String(patientId));
        if (p) {
            const name = p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim();
            if (name) return name;
        }
    }
    
    return 'Unknown';
}

// Resolve test type/name from order with comprehensive checks
async function resolveTestType(order) {
    // Try nested test_items first
    const items = Array.isArray(order.test_items) ? order.test_items : 
                  Array.isArray(order.items) ? order.items :
                  Array.isArray(order.order_items) ? order.order_items : [];
    
    if (items.length > 0) {
        const names = [];
        for (const it of items) {
            const testObj = it.test || it.lab_test || it.test_type || it.testType || {};
            let name = '';
            if (testObj && typeof testObj === 'object') {
                name = testObj.test_name || testObj.name || testObj.testName || testObj.title || testObj.test_type_name || '';
            } else if (typeof testObj === 'string') {
                name = testObj;
            }
            if (!name) {
                name = it.test_name || it.name || it.testName || it.test_type_name || it.testTypeName || '';
            }
            name = String(name || '').trim();
            if (name) names.push(name);
        }
        if (names.length) {
            const unique = [...new Set(names)];
            if (unique.length === 1) return unique[0];
            const head = unique.slice(0, 2).join(', ');
            const more = unique.length > 2 ? ` (+${unique.length - 2})` : '';
            return head + more;
        }
    }
    
    // Top-level order fields
    const topLevel = order.test_name || order.testName || order.test_type || order.testType || 
                     order.test_type_name || order.testTypeName || order.lab_test_name || order.labTestName;
    if (topLevel) return topLevel;
    
    // Test types array
    if (order.test_types && Array.isArray(order.test_types) && order.test_types.length > 0) {
        const tt = order.test_types[0];
        if (typeof tt === 'string') return tt;
        return tt.test_name || tt.name || tt.testName || String(tt);
    }
    
    return 'Unknown';
}

// Test items resolver
function resolveTestItems(order) {
    if (Array.isArray(order.test_items)) return order.test_items;
    if (Array.isArray(order.items)) return order.items;
    if (Array.isArray(order.order_items)) return order.order_items;
    return [];
}

// Export resolvers
window.resolvePatientName = resolvePatientName;
window.resolveTestType = resolveTestType;
window.resolveTestItems = resolveTestItems;
window.getPatientsLookup = getPatientsLookup;
window.refreshPatientsLookup = refreshPatientsLookup;
window.openLabRegisterModal = openLabRegisterModal;

// --- Display currency (PKR, USD, …), themes, and sidebar languages ---
const LAB_INFO_STORAGE_KEY = 'labInfo';

function readStoredLabInfo() {
    try {
        const raw = localStorage.getItem(LAB_INFO_STORAGE_KEY);
        const o = raw ? JSON.parse(raw) : {};
        return o && typeof o === 'object' ? o : {};
    } catch (_) {
        return {};
    }
}

function getLabUiPrefs() {
    const o = readStoredLabInfo();
    return {
        ...o,
        display_currency: String(o.display_currency || o.currency || 'USD').toUpperCase(),
        ui_theme: String(o.ui_theme || 'default'),
        ui_locale: String(o.ui_locale || 'en'),
        stripe_publishable_key: String(
            o.stripe_publishable_key || o.stripe_publishable || o.publishable_key || ''
        ).trim(),
    };
}

/** Per-lab Stripe publishable key from settings (pk_test_ / pk_live_). */
function getLabStripePublishableKey(overrides = {}) {
    const prefs = { ...getLabUiPrefs(), ...overrides };
    const k = String(prefs.stripe_publishable_key || '').trim();
    if (k.startsWith('pk_test_') || k.startsWith('pk_live_')) return k;
    return '';
}

function labStripeIsConfigured(overrides = {}) {
    return !!getLabStripePublishableKey(overrides);
}

function labNumberLocaleForCurrency(currencyCode, uiLocale) {
    const c = String(currencyCode || 'USD').toUpperCase();
    const loc = String(uiLocale || 'en');
    if (c === 'PKR') return loc === 'ur' ? 'ur-PK' : 'en-PK';
    if (c === 'AED') return 'en-AE';
    if (c === 'SAR') return 'en-SA';
    if (c === 'INR') return 'en-IN';
    if (c === 'EUR') return loc === 'es' ? 'es-ES' : 'de-DE';
    if (c === 'GBP') return 'en-GB';
    if (c === 'CAD') return 'en-CA';
    if (loc === 'ar') return 'ar';
    if (loc === 'es') return 'es';
    if (loc === 'ur') return 'en-PK';
    return 'en-US';
}

function formatLabCurrency(value, overrides = {}) {
    const prefs = { ...getLabUiPrefs(), ...overrides };
    const cur = String(prefs.display_currency || 'USD').toUpperCase();
    const num = Number(value || 0);
    const loc = labNumberLocaleForCurrency(cur, prefs.ui_locale);
    try {
        return new Intl.NumberFormat(loc, {
            style: 'currency',
            currency: cur,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(num);
    } catch (_) {
        return `${cur} ${num.toFixed(2)}`;
    }
}

function getLabCurrencyGlyph(overrides = {}) {
    const prefs = { ...getLabUiPrefs(), ...overrides };
    const cur = String(prefs.display_currency || 'USD').toUpperCase();
    const loc = labNumberLocaleForCurrency(cur, prefs.ui_locale);
    try {
        const parts = new Intl.NumberFormat(loc, {
            style: 'currency',
            currency: cur,
            currencyDisplay: 'narrowSymbol',
        }).formatToParts(0);
        const p = parts.find((x) => x.type === 'currency');
        return (p && p.value) || cur;
    } catch (_) {
        if (cur === 'PKR') return 'Rs';
        if (cur === 'USD') return '$';
        return cur;
    }
}

const LAB_I18N = {
    en: {
        brand_title: 'Lab Management',
        auth_login: 'Log in',
        auth_logout: 'Log out',
        nav_dashboard: 'Dashboard',
        nav_lab_tests: 'Lab Tests',
        nav_patients: 'Patients',
        nav_appointments: 'Appointments',
        nav_payments: 'Payments',
        nav_reports: 'Reports',
        nav_archive: 'Archive',
        nav_images: 'Images',
        nav_staff: 'Staff',
        nav_settings: 'Settings',
    },
    ur: {
        brand_title: 'لیب مینیجمنٹ',
        auth_login: 'داخل ہوں',
        auth_logout: 'باہر نکلیں',
        nav_dashboard: 'ڈیش بورڈ',
        nav_lab_tests: 'لیب ٹیسٹ',
        nav_patients: 'مریض',
        nav_appointments: 'ملاقاتیں',
        nav_payments: 'ادائیگیاں',
        nav_reports: 'رپورٹس',
        nav_archive: 'آرکائیو',
        nav_images: 'امیجز',
        nav_staff: 'عملہ',
        nav_settings: 'ترتیبات',
    },
    ar: {
        brand_title: 'إدارة المختبر',
        auth_login: 'تسجيل الدخول',
        auth_logout: 'تسجيل الخروج',
        nav_dashboard: 'لوحة التحكم',
        nav_lab_tests: 'فحوصات المختبر',
        nav_patients: 'المرضى',
        nav_appointments: 'المواعيد',
        nav_payments: 'المدفوعات',
        nav_reports: 'التقارير',
        nav_archive: 'الأرشيف',
        nav_images: 'الصور',
        nav_staff: 'الموظفون',
        nav_settings: 'الإعدادات',
    },
    es: {
        brand_title: 'Gestión de laboratorio',
        auth_login: 'Iniciar sesión',
        auth_logout: 'Cerrar sesión',
        nav_dashboard: 'Panel',
        nav_lab_tests: 'Pruebas de laboratorio',
        nav_patients: 'Pacientes',
        nav_appointments: 'Citas',
        nav_payments: 'Pagos',
        nav_reports: 'Informes',
        nav_archive: 'Archivo',
        nav_images: 'Imágenes',
        nav_staff: 'Personal',
        nav_settings: 'Ajustes',
    },
};

function labT(key) {
    const loc = getLabUiPrefs().ui_locale;
    const pack = LAB_I18N[loc] || LAB_I18N.en;
    if (pack[key] != null) return pack[key];
    return LAB_I18N.en[key] != null ? LAB_I18N.en[key] : key;
}

function refreshLabI18nLabels() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
        const k = el.getAttribute('data-i18n');
        if (k) el.textContent = labT(k);
    });
}

function applyLabAppearanceFromStorage() {
    const prefs = getLabUiPrefs();
    document.documentElement.setAttribute('data-ui-theme', prefs.ui_theme || 'default');
    const loc = prefs.ui_locale || 'en';
    document.documentElement.setAttribute('lang', loc === 'ur' ? 'ur' : loc === 'ar' ? 'ar' : loc === 'es' ? 'es' : 'en');
    document.documentElement.setAttribute('dir', loc === 'ar' ? 'rtl' : 'ltr');
    ['paymentAmountCurrencyGlyph', 'addTestPriceCurrencyGlyph'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.textContent = getLabCurrencyGlyph();
    });
    refreshLabI18nLabels();
}

window.formatLabCurrency = formatLabCurrency;
window.getLabUiPrefs = getLabUiPrefs;
window.getLabStripePublishableKey = getLabStripePublishableKey;
window.labStripeIsConfigured = labStripeIsConfigured;
window.getLabCurrencyGlyph = getLabCurrencyGlyph;
window.labT = labT;
window.refreshLabI18nLabels = refreshLabI18nLabels;
window.applyLabAppearanceFromStorage = applyLabAppearanceFromStorage;

window.addEventListener('lab:settings-updated', () => {
    applyLabAppearanceFromStorage();
});

document.addEventListener('DOMContentLoaded', () => {
    applyLabAppearanceFromStorage();
    document.getElementById('labAuthLoginBtn')?.addEventListener('click', () => signInLabUser());
    document.getElementById('labAuthLogoutBtn')?.addEventListener('click', () => signOutLabUser());
    updateLabAuthToolbar();
});

