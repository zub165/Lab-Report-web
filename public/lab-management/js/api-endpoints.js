// ============================================
// API ENDPOINTS - All Backend Endpoint Functions
// ============================================
// This file provides functions for all backend endpoints
// Base path: /lab/ (already included in API_BASE_URL)

// ============================================
// AUTHENTICATION ENDPOINTS
// ============================================

/**
 * Get JWT token (TokenObtainPairView)
 * POST /lab/auth/token/
 */
async function getJWTToken(username, password) {
    const response = await fetch(`${API_BASE_URL}/auth/token/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ username, password })
    });
    if (!response.ok) throw new Error(`Token request failed: ${response.statusText}`);
    return await response.json();
}

/**
 * Refresh JWT token
 * POST /lab/auth/token/refresh/
 */
async function refreshJWTToken(refreshToken) {
    const response = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ refresh: refreshToken })
    });
    if (!response.ok) throw new Error(`Token refresh failed: ${response.statusText}`);
    return await response.json();
}

/**
 * Legacy login
 * POST /lab/auth/login/
 */
async function login(username, password) {
    const response = await fetch(`${API_BASE_URL}/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    if (!response.ok) throw new Error(`Login failed: ${response.statusText}`);
    return await response.json();
}

/**
 * Self-service registration (no auth required)
 * POST /lab/auth/register/
 * New accounts get LabUser.is_active=false until an admin authorizes them (Settings).
 * Required JSON fields: username, email, password, first_name, last_name,
 *   employee_id, role, department — optional: phone, address, hire_date (YYYY-MM-DD)
 */
async function register(userData) {
    const response = await fetch(`${API_BASE_URL}/auth/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(userData)
    });
    if (!response.ok) {
        let detail = `${response.status}`;
        try {
            const errBody = await response.json();
            detail = errBody.message || errBody.detail || JSON.stringify(errBody);
        } catch (_) {
            try {
                detail = await response.text();
            } catch (_) {}
        }
        throw new Error(`Registration failed: ${detail}`);
    }
    return await response.json();
}

/**
 * Legacy logout
 * POST /lab/auth/logout/
 */
async function logout() {
    const response = await authenticatedFetch(`${API_BASE_URL}/auth/logout/`, {
        method: 'POST'
    });
    if (!response.ok) throw new Error(`Logout failed: ${response.statusText}`);
    return await response.json();
}

/**
 * Get user profile
 * GET /lab/auth/profile/
 */
async function getUserProfile() {
    const response = await authenticatedFetch(`${API_BASE_URL}/auth/profile/`);
    if (!response.ok) throw new Error(`Failed to get profile: ${response.statusText}`);
    return await response.json();
}

/**
 * Create LabUser for the current JWT user when none exists (no Django admin).
 * POST /lab/auth/ensure-my-lab-profile/
 * Body: employee_id, role, department, phone, address, hire_date (YYYY-MM-DD)
 */
async function ensureMyLabProfile(body) {
    const response = await authenticatedFetch(`${API_BASE_URL}/auth/ensure-my-lab-profile/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
    });
    let data = {};
    try {
        data = await response.json();
    } catch (_) {}
    if (!response.ok) {
        const detail =
            data.errors != null ? JSON.stringify(data.errors) : data.message || response.statusText;
        throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
    }
    return data;
}

/**
 * Lab admin / superuser: attach LabUser to another existing Django user.
 * POST /lab/auth/admin-link-lab-profile/
 * Body: username, employee_id, role, department, phone, address, hire_date
 */
async function adminLinkLabProfile(body) {
    const response = await authenticatedFetch(`${API_BASE_URL}/auth/admin-link-lab-profile/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
    });
    let data = {};
    try {
        data = await response.json();
    } catch (_) {}
    if (!response.ok) {
        const detail =
            data.errors != null ? JSON.stringify(data.errors) : data.message || response.statusText;
        throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
    }
    return data;
}

// ============================================
// HEALTH & UTILITY
// ============================================

/**
 * Health check (no auth required)
 * GET /lab/health/
 */
async function healthCheck() {
    const response = await fetch(`${API_BASE_URL}/health/`);
    if (!response.ok) throw new Error(`Health check failed: ${response.statusText}`);
    return await response.json();
}

// ============================================
// DASHBOARD & ANALYTICS
// ============================================

/**
 * Dashboard analytics
 * GET /lab/analytics/
 */
async function getAnalytics(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/analytics/${queryParams ? '?' + queryParams : ''}`;
    const response = await authenticatedFetch(url);
    if (!response.ok) throw new Error(`Failed to get analytics: ${response.statusText}`);
    return await response.json();
}

/**
 * Lab dashboard statistics
 * GET /lab/dashboard-stats/
 */
async function getDashboardStats() {
    const response = await authenticatedFetch(`${API_BASE_URL}/dashboard-stats/`);
    if (!response.ok) throw new Error(`Failed to get dashboard stats: ${response.statusText}`);
    return await response.json();
}

// ============================================
// DATA EXPORT
// ============================================

/**
 * Export patients as CSV
 * GET /lab/export/patients/csv/
 */
async function exportPatientsCSV(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/export/patients/csv/${queryParams ? '?' + queryParams : ''}`;
    const response = await authenticatedFetch(url);
    if (!response.ok) throw new Error(`Failed to export patients: ${response.statusText}`);
    return await response.blob();
}

/**
 * Export orders as CSV
 * GET /lab/export/orders/csv/
 */
async function exportOrdersCSV(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/export/orders/csv/${queryParams ? '?' + queryParams : ''}`;
    const response = await authenticatedFetch(url);
    if (!response.ok) throw new Error(`Failed to export orders: ${response.statusText}`);
    return await response.blob();
}

// ============================================
// USERS ENDPOINTS (/lab/users/)
// ============================================

/**
 * List users
 * GET /lab/users/
 */
async function getUsers(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/users/${queryParams ? '?' + queryParams : ''}`;
    const response = await authenticatedFetch(url);
    if (!response.ok) throw new Error(`Failed to get users: ${response.statusText}`);
    return await response.json();
}

/**
 * Create user
 * POST /lab/users/
 */
async function createUser(userData) {
    const response = await authenticatedFetch(`${API_BASE_URL}/users/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
    });
    if (!response.ok) throw new Error(`Failed to create user: ${response.statusText}`);
    return await response.json();
}

/**
 * Bulk-create lab users (Django superuser only)
 * POST /lab/users/bulk_create/
 * Body: { users: [ { username, email, password, first_name, last_name, employee_id, role, department, phone, address, hire_date }, ... ] }
 */
async function bulkCreateLabUsers(users) {
    const response = await authenticatedFetch(`${API_BASE_URL}/users/bulk_create/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ users })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
        const detail = body.detail || body.message || JSON.stringify(body);
        throw new Error(typeof detail === 'string' ? detail : `Bulk create failed: ${response.status}`);
    }
    return body;
}

/**
 * Get user
 * GET /lab/users/{id}/
 */
async function getUser(id) {
    const response = await authenticatedFetch(`${API_BASE_URL}/users/${id}/`);
    if (!response.ok) throw new Error(`Failed to get user: ${response.statusText}`);
    return await response.json();
}

/**
 * Update user
 * PUT/PATCH /lab/users/{id}/
 */
async function updateUser(id, userData, usePatch = true) {
    const response = await authenticatedFetch(`${API_BASE_URL}/users/${id}/`, {
        method: usePatch ? 'PATCH' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
    });
    if (!response.ok) throw new Error(`Failed to update user: ${response.statusText}`);
    return await response.json();
}

/**
 * Delete user
 * DELETE /lab/users/{id}/
 */
async function deleteUser(id) {
    const response = await authenticatedFetch(`${API_BASE_URL}/users/${id}/`, {
        method: 'DELETE'
    });
    if (!response.ok) throw new Error(`Failed to delete user: ${response.statusText}`);
    return response.status === 204 ? null : await response.json();
}

/**
 * Get users by role
 * GET /lab/users/by_role/?role=X
 */
async function getUsersByRole(role) {
    const response = await authenticatedFetch(`${API_BASE_URL}/users/by_role/?role=${encodeURIComponent(role)}`);
    if (!response.ok) throw new Error(`Failed to get users by role: ${response.statusText}`);
    return await response.json();
}

/**
 * Get users by department
 * GET /lab/users/by_department/?department=X
 */
async function getUsersByDepartment(department) {
    const response = await authenticatedFetch(`${API_BASE_URL}/users/by_department/?department=${encodeURIComponent(department)}`);
    if (!response.ok) throw new Error(`Failed to get users by department: ${response.statusText}`);
    return await response.json();
}

/**
 * List lab groups (partition for staff/patient data). Public GET — no auth required.
 * GET /lab/lab-groups/
 */
async function getLabGroups(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/lab-groups/${queryParams ? '?' + queryParams : ''}`;
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Failed to get lab groups: ${response.statusText}`);
    return await response.json();
}

/**
 * Create a lab group (admin). POST /lab/lab-groups/
 */
async function createLabGroup(body) {
    const response = await authenticatedFetch(`${API_BASE_URL}/lab-groups/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
    });
    if (!response.ok) {
        let detail = response.statusText;
        try {
            const errBody = await response.json();
            detail = errBody.detail || JSON.stringify(errBody);
        } catch (_) {}
        throw new Error(`Failed to create lab group: ${detail}`);
    }
    return await response.json();
}

// ============================================
// PATIENTS ENDPOINTS (/lab/patients/)
// ============================================

/**
 * List patients
 * GET /lab/patients/
 */
async function getPatientsList(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/patients/${queryParams ? '?' + queryParams : ''}`;
    const response = await authenticatedFetch(url);
    if (!response.ok) throw new Error(`Failed to get patients: ${response.statusText}`);
    return await response.json();
}

/**
 * Create patient
 * POST /lab/patients/
 */
async function createPatient(patientData) {
    const response = await authenticatedFetch(`${API_BASE_URL}/patients/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patientData)
    });
    if (!response.ok) throw new Error(`Failed to create patient: ${response.statusText}`);
    return await response.json();
}

/**
 * Get patient
 * GET /lab/patients/{id}/
 */
async function getPatient(id) {
    const response = await authenticatedFetch(`${API_BASE_URL}/patients/${id}/`);
    if (!response.ok) throw new Error(`Failed to get patient: ${response.statusText}`);
    return await response.json();
}

/**
 * Update patient
 * PUT/PATCH /lab/patients/{id}/
 */
async function updatePatient(id, patientData, usePatch = true) {
    const response = await authenticatedFetch(`${API_BASE_URL}/patients/${id}/`, {
        method: usePatch ? 'PATCH' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patientData)
    });
    if (!response.ok) throw new Error(`Failed to update patient: ${response.statusText}`);
    return await response.json();
}

/**
 * Delete patient
 * DELETE /lab/patients/{id}/
 */
async function deletePatient(id) {
    const response = await authenticatedFetch(`${API_BASE_URL}/patients/${id}/`, {
        method: 'DELETE'
    });
    if (!response.ok) throw new Error(`Failed to delete patient: ${response.statusText}`);
    return response.status === 204 ? null : await response.json();
}

/**
 * Get patient appointments
 * GET /lab/patients/{id}/appointments/
 */
async function getPatientAppointments(patientId, params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/patients/${patientId}/appointments/${queryParams ? '?' + queryParams : ''}`;
    const response = await authenticatedFetch(url);
    if (!response.ok) throw new Error(`Failed to get patient appointments: ${response.statusText}`);
    return await response.json();
}

/**
 * Get patient test orders
 * GET /lab/patients/{id}/test_orders/
 */
async function getPatientTestOrders(patientId, params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/patients/${patientId}/test_orders/${queryParams ? '?' + queryParams : ''}`;
    const response = await authenticatedFetch(url);
    if (!response.ok) throw new Error(`Failed to get patient test orders: ${response.statusText}`);
    return await response.json();
}

/**
 * Get patient medical history
 * GET /lab/patients/{id}/medical_history/
 */
async function getPatientMedicalHistory(patientId, params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/patients/${patientId}/medical_history/${queryParams ? '?' + queryParams : ''}`;
    const response = await authenticatedFetch(url);
    if (!response.ok) throw new Error(`Failed to get medical history: ${response.statusText}`);
    return await response.json();
}

// ============================================
// TEST CATEGORIES ENDPOINTS (/lab/test-categories/)
// ============================================

/**
 * List test categories
 * GET /lab/test-categories/
 */
async function getTestCategories(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/test-categories/${queryParams ? '?' + queryParams : ''}`;
    const response = await authenticatedFetch(url);
    if (!response.ok) throw new Error(`Failed to get test categories: ${response.statusText}`);
    return await response.json();
}

/**
 * Create test category
 * POST /lab/test-categories/
 */
async function createTestCategory(categoryData) {
    const response = await authenticatedFetch(`${API_BASE_URL}/test-categories/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryData)
    });
    if (!response.ok) throw new Error(`Failed to create category: ${response.statusText}`);
    return await response.json();
}

/**
 * Get test category
 * GET /lab/test-categories/{id}/
 */
async function getTestCategory(id) {
    const response = await authenticatedFetch(`${API_BASE_URL}/test-categories/${id}/`);
    if (!response.ok) throw new Error(`Failed to get category: ${response.statusText}`);
    return await response.json();
}

/**
 * Update test category
 * PUT/PATCH /lab/test-categories/{id}/
 */
async function updateTestCategory(id, categoryData, usePatch = true) {
    const response = await authenticatedFetch(`${API_BASE_URL}/test-categories/${id}/`, {
        method: usePatch ? 'PATCH' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryData)
    });
    if (!response.ok) throw new Error(`Failed to update category: ${response.statusText}`);
    return await response.json();
}

/**
 * Delete test category
 * DELETE /lab/test-categories/{id}/
 */
async function deleteTestCategory(id) {
    const response = await authenticatedFetch(`${API_BASE_URL}/test-categories/${id}/`, {
        method: 'DELETE'
    });
    if (!response.ok) throw new Error(`Failed to delete category: ${response.statusText}`);
    return response.status === 204 ? null : await response.json();
}

/**
 * Get tests in category
 * GET /lab/test-categories/{id}/tests/
 */
async function getTestsInCategory(categoryId, params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/test-categories/${categoryId}/tests/${queryParams ? '?' + queryParams : ''}`;
    const response = await authenticatedFetch(url);
    if (!response.ok) throw new Error(`Failed to get tests in category: ${response.statusText}`);
    return await response.json();
}

// ============================================
// LAB TESTS ENDPOINTS (/lab/tests/)
// ============================================

/**
 * List lab tests
 * GET /lab/tests/
 */
async function getLabTests(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/tests/${queryParams ? '?' + queryParams : ''}`;
    const response = await authenticatedFetch(url);
    if (!response.ok) throw new Error(`Failed to get lab tests: ${response.statusText}`);
    return await response.json();
}

/**
 * Create lab test
 * POST /lab/tests/
 */
async function createLabTest(testData) {
    const response = await authenticatedFetch(`${API_BASE_URL}/tests/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData)
    });
    if (!response.ok) throw new Error(`Failed to create test: ${response.statusText}`);
    return await response.json();
}

/**
 * Get lab test
 * GET /lab/tests/{id}/
 */
async function getLabTest(id) {
    const response = await authenticatedFetch(`${API_BASE_URL}/tests/${id}/`);
    if (!response.ok) throw new Error(`Failed to get test: ${response.statusText}`);
    return await response.json();
}

/**
 * Update lab test
 * PUT/PATCH /lab/tests/{id}/
 */
async function updateLabTest(id, testData, usePatch = true) {
    const response = await authenticatedFetch(`${API_BASE_URL}/tests/${id}/`, {
        method: usePatch ? 'PATCH' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData)
    });
    if (!response.ok) throw new Error(`Failed to update test: ${response.statusText}`);
    return await response.json();
}

/**
 * Delete lab test
 * DELETE /lab/tests/{id}/
 */
async function deleteLabTest(id) {
    const response = await authenticatedFetch(`${API_BASE_URL}/tests/${id}/`, {
        method: 'DELETE'
    });
    if (!response.ok) throw new Error(`Failed to delete test: ${response.statusText}`);
    return response.status === 204 ? null : await response.json();
}

/**
 * Get tests by category
 * GET /lab/tests/by_category/?category_id=X
 */
async function getTestsByCategory(categoryId, params = {}) {
    const queryParams = new URLSearchParams({ category_id: categoryId, ...params }).toString();
    const url = `${API_BASE_URL}/tests/by_category/?${queryParams}`;
    const response = await authenticatedFetch(url);
    if (!response.ok) throw new Error(`Failed to get tests by category: ${response.statusText}`);
    return await response.json();
}

/**
 * Get most popular tests
 * GET /lab/tests/popular_tests/
 */
async function getPopularTests(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/tests/popular_tests/${queryParams ? '?' + queryParams : ''}`;
    const response = await authenticatedFetch(url);
    if (!response.ok) throw new Error(`Failed to get popular tests: ${response.statusText}`);
    return await response.json();
}

/**
 * Get test by code
 * GET /lab/tests/by_code/?test_code=X
 */
async function getTestByCode(testCode) {
    const response = await authenticatedFetch(`${API_BASE_URL}/tests/by_code/?test_code=${encodeURIComponent(testCode)}`);
    if (!response.ok) throw new Error(`Failed to get test by code: ${response.statusText}`);
    return await response.json();
}

// ============================================
// APPOINTMENTS ENDPOINTS (/lab/appointments/)
// ============================================

/**
 * List appointments
 * GET /lab/appointments/
 */
async function getAppointments(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/appointments/${queryParams ? '?' + queryParams : ''}`;
    const response = await authenticatedFetch(url);
    if (!response.ok) throw new Error(`Failed to get appointments: ${response.statusText}`);
    return await response.json();
}

/**
 * Create appointment
 * POST /lab/appointments/
 */
async function createAppointment(appointmentData) {
    const response = await authenticatedFetch(`${API_BASE_URL}/appointments/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appointmentData)
    });
    if (!response.ok) throw new Error(`Failed to create appointment: ${response.statusText}`);
    return await response.json();
}

/**
 * Get appointment
 * GET /lab/appointments/{id}/
 */
async function getAppointment(id) {
    const response = await authenticatedFetch(`${API_BASE_URL}/appointments/${id}/`);
    if (!response.ok) throw new Error(`Failed to get appointment: ${response.statusText}`);
    return await response.json();
}

/**
 * Update appointment
 * PUT/PATCH /lab/appointments/{id}/
 */
async function updateAppointment(id, appointmentData, usePatch = true) {
    const response = await authenticatedFetch(`${API_BASE_URL}/appointments/${id}/`, {
        method: usePatch ? 'PATCH' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appointmentData)
    });
    if (!response.ok) throw new Error(`Failed to update appointment: ${response.statusText}`);
    return await response.json();
}

/**
 * Delete appointment
 * DELETE /lab/appointments/{id}/
 */
async function deleteAppointment(id) {
    const response = await authenticatedFetch(`${API_BASE_URL}/appointments/${id}/`, {
        method: 'DELETE'
    });
    if (!response.ok) throw new Error(`Failed to delete appointment: ${response.statusText}`);
    return response.status === 204 ? null : await response.json();
}

/**
 * Get today's appointments
 * GET /lab/appointments/today/
 */
async function getTodayAppointments(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/appointments/today/${queryParams ? '?' + queryParams : ''}`;
    const response = await authenticatedFetch(url);
    if (!response.ok) throw new Error(`Failed to get today's appointments: ${response.statusText}`);
    return await response.json();
}

/**
 * Get upcoming appointments
 * GET /lab/appointments/upcoming/
 */
async function getUpcomingAppointments(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/appointments/upcoming/${queryParams ? '?' + queryParams : ''}`;
    const response = await authenticatedFetch(url);
    if (!response.ok) throw new Error(`Failed to get upcoming appointments: ${response.statusText}`);
    return await response.json();
}

/**
 * Get appointments by doctor
 * GET /lab/appointments/by_doctor/?doctor_id=X
 */
async function getAppointmentsByDoctor(doctorId, params = {}) {
    const queryParams = new URLSearchParams({ doctor_id: doctorId, ...params }).toString();
    const url = `${API_BASE_URL}/appointments/by_doctor/?${queryParams}`;
    const response = await authenticatedFetch(url);
    if (!response.ok) throw new Error(`Failed to get appointments by doctor: ${response.statusText}`);
    return await response.json();
}

/**
 * Confirm appointment
 * POST /lab/appointments/{id}/confirm/
 */
async function confirmAppointment(id, data = {}) {
    const response = await authenticatedFetch(`${API_BASE_URL}/appointments/${id}/confirm/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`Failed to confirm appointment: ${response.statusText}`);
    return await response.json();
}

/**
 * Cancel appointment
 * POST /lab/appointments/{id}/cancel/
 */
async function cancelAppointment(id, data = {}) {
    const response = await authenticatedFetch(`${API_BASE_URL}/appointments/${id}/cancel/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`Failed to cancel appointment: ${response.statusText}`);
    return await response.json();
}

// ============================================
// TEST ORDERS ENDPOINTS (/lab/test-orders/)
// ============================================

/**
 * List test orders
 * GET /lab/test-orders/
 */
async function getTestOrders(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/test-orders/${queryParams ? '?' + queryParams : ''}`;
    const response = await authenticatedFetch(url);
    if (!response.ok) throw new Error(`Failed to get test orders: ${response.statusText}`);
    return await response.json();
}

/**
 * Create test order
 * POST /lab/test-orders/
 */
async function createTestOrder(orderData) {
    const response = await authenticatedFetch(`${API_BASE_URL}/test-orders/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
    });
    if (!response.ok) {
        let detail = `${response.status} ${response.statusText || ''}`.trim();
        try {
            const errBody = await response.json();
            const msg = errBody.detail || errBody.message || errBody.error
                || (typeof errBody === 'object' ? JSON.stringify(errBody) : String(errBody));
            if (msg && msg !== '{}') detail = typeof msg === 'string' ? msg : JSON.stringify(msg);
        } catch (_) {
            try {
                const t = await response.text();
                if (t) detail = t.slice(0, 500);
            } catch (_) {}
        }
        throw new Error(`Failed to create test order: ${detail}`);
    }
    return await response.json();
}

/**
 * Get test order
 * GET /lab/test-orders/{id}/
 */
async function getTestOrder(id) {
    const response = await authenticatedFetch(`${API_BASE_URL}/test-orders/${id}/`);
    if (!response.ok) throw new Error(`Failed to get test order: ${response.statusText}`);
    return await response.json();
}

/**
 * Update test order
 * PUT/PATCH /lab/test-orders/{id}/
 */
async function updateTestOrder(id, orderData, usePatch = true) {
    const response = await authenticatedFetch(`${API_BASE_URL}/test-orders/${id}/`, {
        method: usePatch ? 'PATCH' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
    });
    if (!response.ok) throw new Error(`Failed to update test order: ${response.statusText}`);
    return await response.json();
}

/**
 * Delete/Archive test order
 * DELETE /lab/test-orders/{id}/ - Now supported! Returns 200 and archives the order
 * Fallback: PATCH /lab/test-orders/{id}/ with { status: 'archived' }
 * 
 * Backend status: DELETE endpoint now works after migration lab_management.0005_add_archived_status_to_test_order
 * The DELETE endpoint will set status='archived' (soft-delete) and return 200 with success message
 */
async function archiveTestOrder(id) {
    // PRIMARY METHOD: DELETE endpoint (now working after backend migration)
    try {
        const deleteResp = await authenticatedFetch(`${API_BASE_URL}/test-orders/${id}/`, {
            method: 'DELETE'
        });
        if (deleteResp.ok) {
            const result = deleteResp.status === 204 ? { success: true, method: 'DELETE' } : await deleteResp.json();
            console.log('✅ Test order archived via DELETE endpoint');
            return result || { success: true, method: 'DELETE' };
        }
        // If DELETE returns non-ok, try PATCH fallback
        if (deleteResp.status !== 404) {
            // 400, 403, 500, etc. - might still want to try PATCH
            console.warn(`DELETE returned ${deleteResp.status}, trying PATCH fallback...`);
        }
    } catch (e) {
        console.warn('DELETE failed, trying PATCH fallback:', e.message);
    }
    
    // FALLBACK METHOD: PATCH with status='archived' (if DELETE doesn't work)
    const response = await authenticatedFetch(`${API_BASE_URL}/test-orders/${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'archived' })
    });
    if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`Failed to archive test order: ${response.status} ${response.statusText} ${errorText || ''}`.trim());
    }
    const result = await response.json();
    console.log('✅ Test order archived via PATCH fallback');
    return result;
}

/**
 * Get pending orders
 * GET /lab/test-orders/pending/
 */
async function getPendingOrders(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/test-orders/pending/${queryParams ? '?' + queryParams : ''}`;
    const response = await authenticatedFetch(url);
    if (!response.ok) throw new Error(`Failed to get pending orders: ${response.statusText}`);
    return await response.json();
}

/**
 * Get in-progress orders
 * GET /lab/test-orders/in_progress/
 */
async function getInProgressOrders(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/test-orders/in_progress/${queryParams ? '?' + queryParams : ''}`;
    const response = await authenticatedFetch(url);
    if (!response.ok) throw new Error(`Failed to get in-progress orders: ${response.statusText}`);
    return await response.json();
}

/**
 * Get completed orders
 * GET /lab/test-orders/completed/
 */
async function getCompletedOrders(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/test-orders/completed/${queryParams ? '?' + queryParams : ''}`;
    const response = await authenticatedFetch(url);
    if (!response.ok) throw new Error(`Failed to get completed orders: ${response.statusText}`);
    return await response.json();
}

/**
 * Start processing order
 * POST /lab/test-orders/{id}/start/
 */
async function startTestOrder(id, data = {}) {
    const response = await authenticatedFetch(`${API_BASE_URL}/test-orders/${id}/start/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`Failed to start order: ${response.statusText}`);
    return await response.json();
}

/**
 * Complete order
 * POST /lab/test-orders/{id}/complete/
 */
async function completeTestOrder(id, data = {}) {
    const response = await authenticatedFetch(`${API_BASE_URL}/test-orders/${id}/complete/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`Failed to complete order: ${response.statusText}`);
    return await response.json();
}

// ============================================
// TEST ORDER ITEMS ENDPOINTS (/lab/test-order-items/)
// ============================================

/**
 * List test order items
 * GET /lab/test-order-items/
 */
async function getTestOrderItems(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/test-order-items/${queryParams ? '?' + queryParams : ''}`;
    const response = await authenticatedFetch(url);
    if (!response.ok) throw new Error(`Failed to get test order items: ${response.statusText}`);
    return await response.json();
}

/**
 * Create test order item
 * POST /lab/test-order-items/
 */
async function createTestOrderItem(itemData) {
    const response = await authenticatedFetch(`${API_BASE_URL}/test-order-items/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemData)
    });
    if (!response.ok) throw new Error(`Failed to create test order item: ${response.statusText}`);
    return await response.json();
}

/**
 * Get test order item
 * GET /lab/test-order-items/{id}/
 */
async function getTestOrderItem(id) {
    const response = await authenticatedFetch(`${API_BASE_URL}/test-order-items/${id}/`);
    if (!response.ok) throw new Error(`Failed to get test order item: ${response.statusText}`);
    return await response.json();
}

/**
 * Update test order item
 * PUT/PATCH /lab/test-order-items/{id}/
 */
async function updateTestOrderItem(id, itemData, usePatch = true) {
    const response = await authenticatedFetch(`${API_BASE_URL}/test-order-items/${id}/`, {
        method: usePatch ? 'PATCH' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemData)
    });
    if (!response.ok) throw new Error(`Failed to update test order item: ${response.statusText}`);
    return await response.json();
}

/**
 * Delete test order item
 * DELETE /lab/test-order-items/{id}/
 */
async function deleteTestOrderItem(id) {
    const response = await authenticatedFetch(`${API_BASE_URL}/test-order-items/${id}/`, {
        method: 'DELETE'
    });
    if (!response.ok) throw new Error(`Failed to delete test order item: ${response.statusText}`);
    return response.status === 204 ? null : await response.json();
}

/**
 * Get pending items
 * GET /lab/test-order-items/pending/
 */
async function getPendingItems(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/test-order-items/pending/${queryParams ? '?' + queryParams : ''}`;
    const response = await authenticatedFetch(url);
    if (!response.ok) throw new Error(`Failed to get pending items: ${response.statusText}`);
    return await response.json();
}

/**
 * Get items by technician
 * GET /lab/test-order-items/by_technician/?technician_id=X
 */
async function getItemsByTechnician(technicianId, params = {}) {
    const queryParams = new URLSearchParams({ technician_id: technicianId, ...params }).toString();
    const url = `${API_BASE_URL}/test-order-items/by_technician/?${queryParams}`;
    const response = await authenticatedFetch(url);
    if (!response.ok) throw new Error(`Failed to get items by technician: ${response.statusText}`);
    return await response.json();
}

/**
 * Start test item
 * POST /lab/test-order-items/{id}/start/
 */
async function startTestOrderItem(id, data = {}) {
    const response = await authenticatedFetch(`${API_BASE_URL}/test-order-items/${id}/start/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`Failed to start test item: ${response.statusText}`);
    return await response.json();
}

/**
 * Complete test item
 * POST /lab/test-order-items/{id}/complete/
 */
async function completeTestOrderItem(id, data = {}) {
    const response = await authenticatedFetch(`${API_BASE_URL}/test-order-items/${id}/complete/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`Failed to complete test item: ${response.statusText}`);
    return await response.json();
}

// ============================================
// TEST RESULTS ENDPOINTS (/lab/test-results/)
// ============================================

/**
 * List test results
 * GET /lab/test-results/
 */
async function getTestResults(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/test-results/${queryParams ? '?' + queryParams : ''}`;
    const response = await authenticatedFetch(url);
    if (!response.ok) throw new Error(`Failed to get test results: ${response.statusText}`);
    return await response.json();
}

/**
 * Create test result
 * POST /lab/test-results/
 */
async function createTestResult(resultData) {
    const response = await authenticatedFetch(`${API_BASE_URL}/test-results/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resultData)
    });
    if (!response.ok) throw new Error(`Failed to create test result: ${response.statusText}`);
    return await response.json();
}

/**
 * Get test result
 * GET /lab/test-results/{id}/
 */
async function getTestResult(id) {
    const response = await authenticatedFetch(`${API_BASE_URL}/test-results/${id}/`);
    if (!response.ok) throw new Error(`Failed to get test result: ${response.statusText}`);
    return await response.json();
}

/**
 * Update test result
 * PUT/PATCH /lab/test-results/{id}/
 */
async function updateTestResult(id, resultData, usePatch = true) {
    const response = await authenticatedFetch(`${API_BASE_URL}/test-results/${id}/`, {
        method: usePatch ? 'PATCH' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resultData)
    });
    if (!response.ok) throw new Error(`Failed to update test result: ${response.statusText}`);
    return await response.json();
}

/**
 * Delete test result
 * DELETE /lab/test-results/{id}/
 */
async function deleteTestResult(id) {
    const response = await authenticatedFetch(`${API_BASE_URL}/test-results/${id}/`, {
        method: 'DELETE'
    });
    if (!response.ok) throw new Error(`Failed to delete test result: ${response.statusText}`);
    return response.status === 204 ? null : await response.json();
}

/**
 * Get unverified results
 * GET /lab/test-results/pending_verification/
 */
async function getPendingVerificationResults(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/test-results/pending_verification/${queryParams ? '?' + queryParams : ''}`;
    const response = await authenticatedFetch(url);
    if (!response.ok) throw new Error(`Failed to get pending verification results: ${response.statusText}`);
    return await response.json();
}

/**
 * Verify result
 * POST /lab/test-results/{id}/verify/
 */
async function verifyTestResult(id, data = {}) {
    const response = await authenticatedFetch(`${API_BASE_URL}/test-results/${id}/verify/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`Failed to verify result: ${response.statusText}`);
    return await response.json();
}

// ============================================
// PAYMENTS ENDPOINTS (/lab/payments/)
// ============================================

/**
 * List payments
 * GET /lab/payments/
 */
async function getPayments(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/payments/${queryParams ? '?' + queryParams : ''}`;
    const response = await authenticatedFetch(url);
    if (!response.ok) throw new Error(`Failed to get payments: ${response.statusText}`);
    return await response.json();
}

/**
 * Create payment
 * POST /lab/payments/
 */
async function createPayment(paymentData) {
    const response = await authenticatedFetch(`${API_BASE_URL}/payments/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData)
    });
    if (!response.ok) throw new Error(`Failed to create payment: ${response.statusText}`);
    return await response.json();
}

/**
 * Get payment
 * GET /lab/payments/{id}/
 */
async function getPayment(id) {
    const response = await authenticatedFetch(`${API_BASE_URL}/payments/${id}/`);
    if (!response.ok) throw new Error(`Failed to get payment: ${response.statusText}`);
    return await response.json();
}

/**
 * Update payment
 * PUT/PATCH /lab/payments/{id}/
 */
async function updatePayment(id, paymentData, usePatch = true) {
    const response = await authenticatedFetch(`${API_BASE_URL}/payments/${id}/`, {
        method: usePatch ? 'PATCH' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData)
    });
    if (!response.ok) throw new Error(`Failed to update payment: ${response.statusText}`);
    return await response.json();
}

/**
 * Delete payment
 * DELETE /lab/payments/{id}/
 */
async function deletePayment(id) {
    const response = await authenticatedFetch(`${API_BASE_URL}/payments/${id}/`, {
        method: 'DELETE'
    });
    if (!response.ok) throw new Error(`Failed to delete payment: ${response.statusText}`);
    return response.status === 204 ? null : await response.json();
}

// ============================================
// REPORT TEMPLATES ENDPOINTS (/lab/report-templates/)
// ============================================

/**
 * List report templates
 * GET /lab/report-templates/
 */
async function getReportTemplates(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/report-templates/${queryParams ? '?' + queryParams : ''}`;
    const response = await authenticatedFetch(url);
    if (!response.ok) throw new Error(`Failed to get report templates: ${response.statusText}`);
    return await response.json();
}

/**
 * Create report template
 * POST /lab/report-templates/
 */
async function createReportTemplate(templateData) {
    const response = await authenticatedFetch(`${API_BASE_URL}/report-templates/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData)
    });
    if (!response.ok) throw new Error(`Failed to create report template: ${response.statusText}`);
    return await response.json();
}

/**
 * Get report template
 * GET /lab/report-templates/{id}/
 */
async function getReportTemplate(id) {
    const response = await authenticatedFetch(`${API_BASE_URL}/report-templates/${id}/`);
    if (!response.ok) throw new Error(`Failed to get report template: ${response.statusText}`);
    return await response.json();
}

/**
 * Update report template
 * PUT/PATCH /lab/report-templates/{id}/
 */
async function updateReportTemplate(id, templateData, usePatch = true) {
    const response = await authenticatedFetch(`${API_BASE_URL}/report-templates/${id}/`, {
        method: usePatch ? 'PATCH' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData)
    });
    if (!response.ok) throw new Error(`Failed to update report template: ${response.statusText}`);
    return await response.json();
}

/**
 * Delete report template
 * DELETE /lab/report-templates/{id}/
 */
async function deleteReportTemplate(id) {
    const response = await authenticatedFetch(`${API_BASE_URL}/report-templates/${id}/`, {
        method: 'DELETE'
    });
    if (!response.ok) throw new Error(`Failed to delete report template: ${response.statusText}`);
    return response.status === 204 ? null : await response.json();
}

// ============================================
// GENERATED REPORTS ENDPOINTS (/lab/reports/)
// ============================================

/**
 * List generated reports
 * GET /lab/reports/
 */
async function getReports(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/reports/${queryParams ? '?' + queryParams : ''}`;
    const response = await authenticatedFetch(url);
    if (!response.ok) throw new Error(`Failed to get reports: ${response.statusText}`);
    return await response.json();
}

/**
 * Generate report
 * POST /lab/reports/
 */
async function generateReport(reportData) {
    const response = await authenticatedFetch(`${API_BASE_URL}/reports/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData)
    });
    if (!response.ok) throw new Error(`Failed to generate report: ${response.statusText}`);
    return await response.json();
}

/**
 * Get report
 * GET /lab/reports/{id}/
 */
async function getReport(id, params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/reports/${id}/${queryParams ? '?' + queryParams : ''}`;
    const response = await authenticatedFetch(url);
    if (!response.ok) throw new Error(`Failed to get report: ${response.statusText}`);
    
    // Check if response is PDF blob or JSON
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/pdf')) {
        return await response.blob();
    }
    return await response.json();
}

/**
 * Update report
 * PUT/PATCH /lab/reports/{id}/
 */
async function updateReport(id, reportData, usePatch = true) {
    const response = await authenticatedFetch(`${API_BASE_URL}/reports/${id}/`, {
        method: usePatch ? 'PATCH' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData)
    });
    if (!response.ok) throw new Error(`Failed to update report: ${response.statusText}`);
    return await response.json();
}

/**
 * Delete report
 * DELETE /lab/reports/{id}/
 */
async function deleteReport(id) {
    const response = await authenticatedFetch(`${API_BASE_URL}/reports/${id}/`, {
        method: 'DELETE'
    });
    if (!response.ok) throw new Error(`Failed to delete report: ${response.statusText}`);
    return response.status === 204 ? null : await response.json();
}

// ============================================
// SYSTEM SETTINGS ENDPOINTS (/lab/settings/)
// ============================================

/**
 * List settings
 * GET /lab/settings/
 */
async function getSettings(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/settings/${queryParams ? '?' + queryParams : ''}`;
    const response = await authenticatedFetch(url);
    if (!response.ok) throw new Error(`Failed to get settings: ${response.statusText}`);
    return await response.json();
}

/**
 * Create setting
 * POST /lab/settings/
 */
async function createSetting(settingData) {
    const response = await authenticatedFetch(`${API_BASE_URL}/settings/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingData)
    });
    if (!response.ok) throw new Error(`Failed to create setting: ${response.statusText}`);
    return await response.json();
}

/**
 * Get setting
 * GET /lab/settings/{id}/
 */
async function getSetting(id) {
    const response = await authenticatedFetch(`${API_BASE_URL}/settings/${id}/`);
    if (!response.ok) throw new Error(`Failed to get setting: ${response.statusText}`);
    return await response.json();
}

/**
 * Update setting
 * PUT/PATCH /lab/settings/{id}/
 */
async function updateSetting(id, settingData, usePatch = true) {
    const response = await authenticatedFetch(`${API_BASE_URL}/settings/${id}/`, {
        method: usePatch ? 'PATCH' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingData)
    });
    if (!response.ok) throw new Error(`Failed to update setting: ${response.statusText}`);
    return await response.json();
}

/**
 * Delete setting
 * DELETE /lab/settings/{id}/
 */
async function deleteSetting(id) {
    const response = await authenticatedFetch(`${API_BASE_URL}/settings/${id}/`, {
        method: 'DELETE'
    });
    if (!response.ok) throw new Error(`Failed to delete setting: ${response.statusText}`);
    return response.status === 204 ? null : await response.json();
}

// ============================================
// AUDIT LOGS ENDPOINTS (/lab/audit-logs/)
// ============================================

/**
 * List audit logs
 * GET /lab/audit-logs/
 */
async function getAuditLogs(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/audit-logs/${queryParams ? '?' + queryParams : ''}`;
    const response = await authenticatedFetch(url);
    if (!response.ok) throw new Error(`Failed to get audit logs: ${response.statusText}`);
    return await response.json();
}

/**
 * Create audit log
 * POST /lab/audit-logs/
 */
async function createAuditLog(logData) {
    const response = await authenticatedFetch(`${API_BASE_URL}/audit-logs/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logData)
    });
    if (!response.ok) throw new Error(`Failed to create audit log: ${response.statusText}`);
    return await response.json();
}

/**
 * Get audit log
 * GET /lab/audit-logs/{id}/
 */
async function getAuditLog(id) {
    const response = await authenticatedFetch(`${API_BASE_URL}/audit-logs/${id}/`);
    if (!response.ok) throw new Error(`Failed to get audit log: ${response.statusText}`);
    return await response.json();
}

/**
 * Update audit log
 * PUT/PATCH /lab/audit-logs/{id}/
 */
async function updateAuditLog(id, logData, usePatch = true) {
    const response = await authenticatedFetch(`${API_BASE_URL}/audit-logs/${id}/`, {
        method: usePatch ? 'PATCH' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logData)
    });
    if (!response.ok) throw new Error(`Failed to update audit log: ${response.statusText}`);
    return await response.json();
}

/**
 * Delete audit log
 * DELETE /lab/audit-logs/{id}/
 */
async function deleteAuditLog(id) {
    const response = await authenticatedFetch(`${API_BASE_URL}/audit-logs/${id}/`, {
        method: 'DELETE'
    });
    if (!response.ok) throw new Error(`Failed to delete audit log: ${response.statusText}`);
    return response.status === 204 ? null : await response.json();
}

// ============================================
// EXPORT ALL FUNCTIONS TO WINDOW
// ============================================

// Authentication
window.getJWTToken = getJWTToken;
window.refreshJWTToken = refreshJWTToken;
window.login = login;
window.register = register;
window.logout = logout;
window.getUserProfile = getUserProfile;
window.ensureMyLabProfile = ensureMyLabProfile;
window.adminLinkLabProfile = adminLinkLabProfile;

// Health & Utility
window.healthCheck = healthCheck;

// Dashboard & Analytics
window.getAnalytics = getAnalytics;
window.getDashboardStats = getDashboardStats;

// Data Export
window.exportPatientsCSV = exportPatientsCSV;
window.exportOrdersCSV = exportOrdersCSV;

// Users
window.getUsers = getUsers;
window.createUser = createUser;
window.bulkCreateLabUsers = bulkCreateLabUsers;
window.getUser = getUser;
window.updateUser = updateUser;
window.deleteUser = deleteUser;
window.getUsersByRole = getUsersByRole;
window.getUsersByDepartment = getUsersByDepartment;
window.getLabGroups = getLabGroups;
window.createLabGroup = createLabGroup;

// Patients
window.getPatientsList = getPatientsList;
window.createPatient = createPatient;
window.getPatient = getPatient;
window.updatePatient = updatePatient;
// Note: deletePatient is defined in patients.js with better error handling and UI integration
// window.deletePatient = deletePatient; // Deferred to patients.js
window.deletePatientAPI = deletePatient; // Export as deletePatientAPI for direct API access
window.getPatientAppointments = getPatientAppointments;
window.getPatientTestOrders = getPatientTestOrders;
window.getPatientMedicalHistory = getPatientMedicalHistory;

// Test Categories
window.getTestCategories = getTestCategories;
window.createTestCategory = createTestCategory;
window.getTestCategory = getTestCategory;
window.updateTestCategory = updateTestCategory;
window.deleteTestCategory = deleteTestCategory;
window.getTestsInCategory = getTestsInCategory;

// Lab Tests
window.getLabTests = getLabTests;
window.createLabTest = createLabTest;
window.getLabTest = getLabTest;
window.updateLabTest = updateLabTest;
window.deleteLabTest = deleteLabTest;
window.getTestsByCategory = getTestsByCategory;
window.getPopularTests = getPopularTests;
window.getTestByCode = getTestByCode;

// Appointments
window.getAppointments = getAppointments;
window.createAppointment = createAppointment;
window.getAppointment = getAppointment;
window.updateAppointment = updateAppointment;
window.deleteAppointment = deleteAppointment;
window.getTodayAppointments = getTodayAppointments;
window.getUpcomingAppointments = getUpcomingAppointments;
window.getAppointmentsByDoctor = getAppointmentsByDoctor;
window.confirmAppointment = confirmAppointment;
window.cancelAppointment = cancelAppointment;

// Test Orders
window.getTestOrders = getTestOrders;
window.createTestOrder = createTestOrder;
window.getTestOrder = getTestOrder;
window.updateTestOrder = updateTestOrder;
window.archiveTestOrder = archiveTestOrder;
window.getPendingOrders = getPendingOrders;
window.getInProgressOrders = getInProgressOrders;
window.getCompletedOrders = getCompletedOrders;
window.startTestOrder = startTestOrder;
window.completeTestOrder = completeTestOrder;

// Test Order Items
window.getTestOrderItems = getTestOrderItems;
window.createTestOrderItem = createTestOrderItem;
window.getTestOrderItem = getTestOrderItem;
window.updateTestOrderItem = updateTestOrderItem;
window.deleteTestOrderItem = deleteTestOrderItem;
window.getPendingItems = getPendingItems;
window.getItemsByTechnician = getItemsByTechnician;
window.startTestOrderItem = startTestOrderItem;
window.completeTestOrderItem = completeTestOrderItem;

// Test Results
window.getTestResults = getTestResults;
window.createTestResult = createTestResult;
window.getTestResult = getTestResult;
window.updateTestResult = updateTestResult;
window.deleteTestResult = deleteTestResult;
window.getPendingVerificationResults = getPendingVerificationResults;
window.verifyTestResult = verifyTestResult;

// Payments
window.getPayments = getPayments;
window.createPayment = createPayment;
window.getPayment = getPayment;
window.updatePayment = updatePayment;
window.deletePayment = deletePayment;

// Report Templates
window.getReportTemplates = getReportTemplates;
window.createReportTemplate = createReportTemplate;
window.getReportTemplate = getReportTemplate;
window.updateReportTemplate = updateReportTemplate;
window.deleteReportTemplate = deleteReportTemplate;

// Generated Reports
window.getReports = getReports;
window.generateReport = generateReport;
window.getReport = getReport;
window.updateReport = updateReport;
window.deleteReport = deleteReport;

// Settings
window.getSettings = getSettings;
window.createSetting = createSetting;
window.getSetting = getSetting;
window.updateSetting = updateSetting;
window.deleteSetting = deleteSetting;

// Audit Logs
window.getAuditLogs = getAuditLogs;
window.createAuditLog = createAuditLog;
window.getAuditLog = getAuditLog;
window.updateAuditLog = updateAuditLog;
window.deleteAuditLog = deleteAuditLog;

console.log('✅ All API endpoint functions loaded and exported to window');

