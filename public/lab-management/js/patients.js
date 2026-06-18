// ============================================
// PATIENTS TAB - Patient Management
// ============================================

// Load patients from backend/localStorage (unified) and render table
async function loadPatients(forceRefresh = false) {
    try {
        // Use unified getPatients which handles backend + localStorage
        const patients = await getPatients(forceRefresh);
        
        if (typeof updatePatientsTable === 'function') {
            updatePatientsTable(patients);
        } else if (typeof window.updatePatientsTable === 'function') {
            window.updatePatientsTable(patients);
        } else {
            // Local fallback renderer
            localUpdatePatientsTable(patients);
        }
        return patients;
    } catch (e) {
        console.error('Failed to load patients:', e);
        showNotification('Failed to load patients: ' + e.message, 'danger');
        // Try to show cached data on error (use same key as common.js)
        try {
            const storageKey = window.PATIENTS_STORAGE_KEY || 'lab_patients_cache';
            const cached = storage.get(storageKey);
            if (cached && Array.isArray(cached.data)) {
                localUpdatePatientsTable(cached.data);
                showNotification('Showing cached patient data. Backend unavailable.', 'warning');
            }
        } catch (_) {}
    }
}

// Submit handler for Add Patient modal (index.html uses onclick="submitNewPatient()")
async function submitNewPatient() {
    try {
        const form = document.getElementById('addPatientForm');
        if (!form) {
            showNotification('Patient form not found', 'danger');
            return;
        }
        const fd = new FormData(form);
        const fullName = (fd.get('fullName') || '').trim();
        const [first, ...rest] = fullName.split(' ');
        const last = rest.join(' ') || 'Unknown';
        const rawDob = fd.get('dob');
        const dobDate = rawDob ? new Date(rawDob) : null;
        const isoDob = dobDate && !isNaN(dobDate) ? dobDate.toISOString().slice(0,10) : null;
        const payload = {
            first_name: first || fullName || 'Unknown',
            last_name: last,
            gender: (fd.get('gender') || 'male').toLowerCase(),
            date_of_birth: isoDob,
            phone: fd.get('contactNumber') || '',
            email: fd.get('email') || '',
            address: fd.get('address') || '',
            emergency_contact: fd.get('emergencyContact') || '',
            emergency_phone: fd.get('emergencyPhone') || ''
        };
        // Basic required fields (must match backend model requirements)
        if (!payload.first_name || !payload.last_name || !payload.phone || !payload.gender || !payload.date_of_birth || !payload.address || !payload.emergency_contact || !payload.emergency_phone) {
            showNotification('Please fill required fields: Name, DOB, Gender, Contact Number, Address, Emergency Contact & Emergency Phone', 'warning');
            return;
        }
        const resp = await authenticatedFetch(`${API_BASE_URL}/patients/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!resp.ok) {
            const err = await resp.text();
            throw new Error(err || 'Failed to add patient');
        }
        showNotification('Patient added successfully', 'success');
        
        // Invalidate cache and refresh all tabs
        invalidatePatientsCache();
        
        // Close modal
        const modalEl = document.getElementById('addPatientModal');
        if (modalEl) {
            try { bootstrap.Modal.getInstance(modalEl)?.hide(); } catch (_) {}
        }
        
        // Refresh this tab and all others that display patients
        await refreshAllPatientDisplays();
    } catch (e) {
        console.error('Error adding patient:', e);
        showNotification('Error adding patient: ' + e.message, 'danger');
    }
}

// Local fallback renderer (used if legacy updatePatientsTable isn't ready)
function localUpdatePatientsTable(patients) {
    const tbody = document.getElementById('patientsTableBody');
    if (!tbody) return;
    let list = patients;
    if (!Array.isArray(list)) {
        list = (patients && (patients.results || patients.data || patients.patients)) || [];
    }
    if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No patients found</td></tr>';
        return;
    }
    const rows = list.map(p => {
        // Use patient_id for all actions because backend lookup is by patient_id
        const id = p.patient_id || p.id || p.uuid || 'N/A';
        const name = p.full_name || p.name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'N/A';
        const dob = p.date_of_birth || p.dob || null;
        const age = dob ? (function(d){ try { return calculateAge(d); } catch(_) { return 'N/A'; } })(dob) : 'N/A';
        const gender = p.gender || 'N/A';
        const contact = p.phone || p.contact_number || p.contactNumber || 'N/A';
        return `
            <tr>
                <td>${id}</td>
                <td>${name}</td>
                <td>${age}</td>
                <td>${gender}</td>
                <td>${contact}</td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-outline-primary" onclick="viewPatient && viewPatient('${id}')"><i class="fas fa-eye"></i> View</button>
                        <button class="btn btn-sm btn-outline-secondary" onclick="editPatient && editPatient('${id}')"><i class="fas fa-edit"></i> Edit</button>
                        <button class="btn btn-sm btn-outline-success" onclick="showPatientQR && showPatientQR('${id}')" title="Patient QR"><i class="fas fa-qrcode"></i> QR</button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deletePatient && deletePatient('${id}')"><i class="fas fa-trash"></i> Delete</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    tbody.innerHTML = rows;
}

// Export to window
window.loadPatients = loadPatients;
window.submitNewPatient = submitNewPatient;
window.updatePatientsTable = window.updatePatientsTable || localUpdatePatientsTable;

// ============================================
// PATIENT QR - store patient data via QR
// ============================================

const PATIENT_QR_STORAGE_KEY = 'lab_patient_qr_store_v1';

function getStoredPatientCards() {
    try {
        const raw = localStorage.getItem(PATIENT_QR_STORAGE_KEY);
        const obj = raw ? JSON.parse(raw) : {};
        return (obj && typeof obj === 'object') ? obj : {};
    } catch (_) {
        return {};
    }
}

function storePatientCard(patient) {
    const pid = patient?.patient_id || patient?.patientId;
    if (!pid) return;
    const cards = getStoredPatientCards();
    cards[String(pid)] = {
        patient_id: pid,
        full_name: patient.full_name || `${patient.first_name || ''} ${patient.last_name || ''}`.trim(),
        gender: patient.gender || '',
        date_of_birth: patient.date_of_birth || '',
        phone: patient.phone || '',
        email: patient.email || '',
        address: patient.address || '',
        emergency_contact: patient.emergency_contact || '',
        emergency_phone: patient.emergency_phone || '',
        saved_at: new Date().toISOString(),
    };
    localStorage.setItem(PATIENT_QR_STORAGE_KEY, JSON.stringify(cards));
}

function ensureQrModal() {
    let modal = document.getElementById('patientQrModal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'patientQrModal';
    modal.className = 'modal fade';
    modal.tabIndex = -1;
    modal.innerHTML = `
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Patient QR</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div id="patientQrModal-content">Loading...</div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
    return modal;
}

async function showPatientQR(patientId) {
    try {
        const resp = await authenticatedFetch(`${API_BASE_URL}/patients/${encodeURIComponent(patientId)}/`);
        if (!resp.ok) throw new Error('Patient not found');
        const p = await resp.json();

        // Store patient card locally (patient data storage)
        storePatientCard(p);

        const pid = p.patient_id || patientId;
        const payload = `PATIENT:${pid}`; // QR payload (simple + robust)
        const qrSvg = (typeof window.generateQRCodeSVG === 'function')
            ? window.generateQRCodeSVG(payload, 140)
            : `<div class="text-muted">QR generator not available</div>`;

        const modal = ensureQrModal();
        const el = modal.querySelector('#patientQrModal-content');
        const name = p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Patient';

        el.innerHTML = `
          <div class="d-flex gap-4 align-items-start flex-wrap">
            <div style="min-width:170px">
              <div class="border rounded p-3 bg-white" style="width:170px;text-align:center">
                ${qrSvg}
                <div class="mt-2 small text-muted">${escapeHtml(payload)}</div>
              </div>
            </div>
            <div class="flex-grow-1">
              <div class="mb-2"><strong>Name:</strong> ${escapeHtml(name)}</div>
              <div class="mb-2"><strong>Patient ID:</strong> ${escapeHtml(pid)}</div>
              <div class="mb-2"><strong>Gender:</strong> ${escapeHtml(p.gender || '—')}</div>
              <div class="mb-2"><strong>DOB:</strong> ${escapeHtml(p.date_of_birth || '—')}</div>
              <div class="mb-2"><strong>Phone:</strong> ${escapeHtml(p.phone || '—')}</div>
              <div class="mt-3 d-flex gap-2 flex-wrap">
                <button class="btn btn-outline-primary btn-sm" id="btnCopyPatientQr">Copy QR Text</button>
                <button class="btn btn-outline-secondary btn-sm" id="btnCopyPatientJson">Copy Stored JSON</button>
              </div>
              <div class="mt-2 small text-muted">
                This QR is used to import patient data into the system. Scanning it can fetch and cache the patient profile.
              </div>
            </div>
          </div>
        `;

        const copyQrBtn = el.querySelector('#btnCopyPatientQr');
        if (copyQrBtn) {
            copyQrBtn.onclick = async () => {
                try {
                    await navigator.clipboard.writeText(payload);
                    showNotification('Copied QR text', 'success');
                } catch (e) {
                    showNotification('Copy failed', 'warning');
                }
            };
        }
        const copyJsonBtn = el.querySelector('#btnCopyPatientJson');
        if (copyJsonBtn) {
            copyJsonBtn.onclick = async () => {
                try {
                    const cards = getStoredPatientCards();
                    await navigator.clipboard.writeText(JSON.stringify(cards[String(pid)] || {}, null, 2));
                    showNotification('Copied patient JSON', 'success');
                } catch (e) {
                    showNotification('Copy failed', 'warning');
                }
            };
        }

        new bootstrap.Modal(modal).show();
    } catch (e) {
        console.error('showPatientQR error:', e);
        showNotification('Failed to open patient QR: ' + (e.message || 'Unknown error'), 'danger');
    }
}

async function importPatientFromQrText(qrText) {
    const text = String(qrText || '').trim();
    if (!text) throw new Error('Empty QR');
    const pid = text.startsWith('PATIENT:') ? text.slice('PATIENT:'.length).trim() : text;
    if (!pid) throw new Error('Invalid QR payload');
    const resp = await authenticatedFetch(`${API_BASE_URL}/patients/${encodeURIComponent(pid)}/`);
    if (!resp.ok) throw new Error('Patient not found for QR');
    const p = await resp.json();
    storePatientCard(p);
    return p;
}

window.showPatientQR = showPatientQR;
window.importPatientFromQrText = importPatientFromQrText;

// Global deletePatient function - OVERRIDES api-endpoints.js version
// This version includes confirmation, better error handling, and cache invalidation
window.deletePatient = async function(patientId) {
    try {
        if (!patientId) {
            showNotification('Invalid patient id', 'warning');
            return;
        }
        
        if (!confirm('Are you sure you want to delete this patient? This cannot be undone.')) {
            return;
        }
        
        console.log('Deleting patient:', patientId);
        const url = `${API_BASE_URL}/patients/${encodeURIComponent(patientId)}/`;
        console.log('DELETE request to:', url);
        
        const resp = await authenticatedFetch(url, { method: 'DELETE' });
        
        console.log('DELETE response status:', resp.status, resp.statusText);
        
        if (!resp.ok) {
            // Try to get error message from response
            let errorMsg = `Delete failed (${resp.status} ${resp.statusText})`;
            try {
                const errorText = await resp.text();
                if (errorText) {
                    try {
                        const errorJson = JSON.parse(errorText);
                        errorMsg = errorJson.message || errorJson.error || errorJson.detail || errorMsg;
                    } catch (_) {
                        // Not JSON, use text as is
                        if (errorText.length < 200) {
                            errorMsg = errorText;
                        }
                    }
                }
            } catch (e) {
                console.warn('Failed to read error response:', e);
            }
            
            console.error('❌ DELETE failed:', errorMsg);
            console.error('Full URL:', url);
            console.error('Response status:', resp.status);
            
            // If 404, patient doesn't exist or endpoint is wrong
            if (resp.status === 404) {
                console.error('❌ Patient DELETE endpoint returned 404 Not Found');
                console.error('💡 Possible causes:');
                console.error('   1. Patient ID does not exist in backend:', patientId);
                console.error('   2. Backend DELETE endpoint not configured for /lab/patients/{id}/');
                console.error('   3. URL format might be incorrect');
                console.error('💡 Check backend routing: DELETE /lab/patients/{id}/ should exist');
                
                // Try to verify patient exists first
                try {
                    console.log('🔍 Attempting to fetch patient to verify it exists...');
                    const getResp = await authenticatedFetch(`${API_BASE_URL}/patients/${patientId}/`);
                    if (getResp.ok) {
                        console.warn('⚠️ Patient EXISTS but DELETE endpoint not found - backend routing issue!');
                        errorMsg = 'Patient exists but DELETE endpoint not available. Check backend configuration.';
                    } else if (getResp.status === 404) {
                        errorMsg = `Patient not found: ${patientId}`;
                    }
                } catch (getError) {
                    console.warn('Could not verify patient existence:', getError);
                }
            }
            
            throw new Error(errorMsg);
        }
        
        // Success!
        console.log('✅ Patient deleted successfully');
        showNotification('Patient deleted successfully', 'success');
        
        // Invalidate cache and refresh all tabs
        invalidatePatientsCache();
        await refreshAllPatientDisplays();
    } catch (e) {
        console.error('deletePatient error:', e);
        const errorMsg = e.message || 'Failed to delete patient';
        showNotification('Delete failed: ' + errorMsg, 'danger');
        
        // Provide helpful debugging info
        console.error('❌ Patient deletion failed');
        console.error('💡 Check backend DELETE endpoint: DELETE /lab/patients/{id}/');
        console.error('💡 Verify patient ID exists in backend');
        console.error('💡 Check backend permissions for DELETE operation');
    }
};

// Local helpers for view/edit
function ensurePatientModal(id, title) {
    let modal = document.getElementById(id);
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = id;
    modal.className = 'modal fade';
    modal.tabIndex = -1;
    modal.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">${title}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body"><div id="${id}-content">Loading...</div></div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    return modal;
}

// View patient details
if (typeof window.viewPatient !== 'function') {
    window.viewPatient = async function(patientId) {
        try {
            const resp = await authenticatedFetch(`${API_BASE_URL}/patients/${encodeURIComponent(patientId)}/`);
            if (!resp.ok) throw new Error('Patient not found');
            const p = await resp.json();
            const modal = ensurePatientModal('viewPatientModal', 'Patient Details');
            const el = modal.querySelector('#viewPatientModal-content');
            el.innerHTML = `
                <div class="mb-2"><strong>ID:</strong> ${p.id || patientId}</div>
                <div class="mb-2"><strong>Name:</strong> ${p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim()}</div>
                <div class="mb-2"><strong>Gender:</strong> ${p.gender || ''}</div>
                <div class="mb-2"><strong>DOB:</strong> ${p.date_of_birth || ''}</div>
                <div class="mb-2"><strong>Phone:</strong> ${p.phone || ''}</div>
                <div class="mb-2"><strong>Email:</strong> ${p.email || ''}</div>
                <div class="mb-2"><strong>Address:</strong> ${p.address || ''}</div>
            `;
            new bootstrap.Modal(modal).show();
        } catch (e) {
            console.error('viewPatient error:', e);
            showNotification('Failed to load patient: ' + e.message, 'danger');
        }
    };
}

// Edit patient minimal fields and PATCH
if (typeof window.editPatient !== 'function') {
    window.editPatient = async function(patientId) {
        try {
            const resp = await authenticatedFetch(`${API_BASE_URL}/patients/${encodeURIComponent(patientId)}/`);
            if (!resp.ok) throw new Error('Patient not found');
            const p = await resp.json();
            const modal = ensurePatientModal('editPatientModal', 'Edit Patient');
            const el = modal.querySelector('#editPatientModal-content');
            if (!el) {
                modal.querySelector('.modal-body').innerHTML = `<div id="editPatientModal-content"></div>`;
            }
            const body = modal.querySelector('#editPatientModal-content');
            body.innerHTML = `
                <div class="mb-2"><strong>ID:</strong> ${p.id || patientId}</div>
                <div class="mb-3">
                    <label class="form-label">First Name</label>
                    <input type="text" class="form-control" id="ep-first" value="${p.first_name || ''}">
                </div>
                <div class="mb-3">
                    <label class="form-label">Last Name</label>
                    <input type="text" class="form-control" id="ep-last" value="${p.last_name || ''}">
                </div>
                <div class="mb-3">
                    <label class="form-label">Phone</label>
                    <input type="text" class="form-control" id="ep-phone" value="${p.phone || ''}">
                </div>
                <div class="mb-3">
                    <label class="form-label">Address</label>
                    <textarea class="form-control" id="ep-address" rows="2">${p.address || ''}</textarea>
                </div>
                <div class="text-end">
                    <button class="btn btn-primary" id="ep-save">Save Changes</button>
                </div>
            `;
            const bs = new bootstrap.Modal(modal);
            bs.show();
            body.querySelector('#ep-save').onclick = async () => {
                try {
                    const payload = {
                        first_name: body.querySelector('#ep-first').value || '',
                        last_name: body.querySelector('#ep-last').value || '',
                        phone: body.querySelector('#ep-phone').value || '',
                        address: body.querySelector('#ep-address').value || ''
                    };
                    const pr = await authenticatedFetch(`${API_BASE_URL}/patients/${encodeURIComponent(patientId)}/`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    if (!pr.ok) throw new Error(await pr.text());
                    showNotification('Patient updated successfully', 'success');
                    
                    // Invalidate cache and refresh all tabs
                    invalidatePatientsCache();
                    bs.hide();
                    await refreshAllPatientDisplays();
                } catch (err) {
                    console.error('editPatient save error:', err);
                    showNotification('Failed to save: ' + err.message, 'danger');
                }
            };
        } catch (e) {
            console.error('editPatient error:', e);
            showNotification('Failed to load patient: ' + e.message, 'danger');
        }
    };
}

