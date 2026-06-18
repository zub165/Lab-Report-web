// ============================================
// APPOINTMENTS TAB - Appointment Management
// ============================================

// Use shared resolvers from common.js

// Load appointments into the table
async function loadAppointmentsTable() {
    try {
        const appointmentsResp = await authenticatedFetch(`${API_BASE_URL}/appointments/?ordering=-date`);
        if (!appointmentsResp.ok) throw new Error('Failed to fetch appointments');
        const data = await appointmentsResp.json();
        const appointments = Array.isArray(data) ? data : (data.results || data.data || []);

        const tbody = document.getElementById('appointmentsTableBody');
        if (!tbody) return appointments;

        if (appointments.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted">
                        <i class="fas fa-calendar fa-2x mb-2"></i>
                        <div>No appointments found</div>
                    </td>
                </tr>
            `;
            return appointments;
        }

        // Use shared resolvers with lookup
        const lookup = await getPatientsLookup();
        const resolvedApps = await Promise.all(appointments.map(async a => {
            const id = a.id || a.uuid || a.appointment_id || '';
            // Backend patient detail routes use `patient_id` (PAT...), so prefer that.
            const patientId = a.patient?.patient_id || a.patient_id || a.patient?.id || a.patient;
            const patientName = a.patient_name
                || a.patient?.full_name
                || (a.patient ? `${a.patient.first_name || ''} ${a.patient.last_name || ''}`.trim() : '')
                || (await resolvePatientName(a, lookup))
                || 'Unknown';
            const testType = a.test_type || await resolveTestType(a);
            const date = a.date || a.appointment_date || a.created_at;
            const time = a.time || a.appointment_time || '';
            const status = (a.status || 'scheduled').toLowerCase();
            return { id, patientId, patientName, testType, date, time, status };
        }));
        
        const rows = resolvedApps.map(({ id, patientId, patientName, testType, date, time, status }) => {
            return `
                <tr>
                    <td>#${id}</td>
                    <td>${patientName}</td>
                    <td>${testType}</td>
                    <td>${date ? new Date(date).toLocaleDateString() : 'N/A'}</td>
                    <td>${time || '—'}</td>
                    <td><span class="badge bg-${status === 'completed' ? 'success' : status === 'cancelled' ? 'secondary' : 'info'}">${status}</span></td>
                    <td>
                        <div class="btn-group">
                            <button class="btn btn-sm btn-outline-primary" onclick="viewAppointment('${id}')"><i class="fas fa-eye"></i> View</button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteAppointment('${id}')"><i class="fas fa-trash"></i> Delete</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
        tbody.innerHTML = rows;
        return appointments;
    } catch (e) {
        console.error('Error loading appointments:', e);
        showNotification('Error loading appointments: ' + e.message, 'danger');
    }
}

// Schedule new appointment (from modal)
async function submitAppointment() {
    try {
        const form = document.getElementById('appointmentForm');
        if (!form) {
            showNotification('Appointment form not found', 'danger');
            return;
        }
        const fd = new FormData(form);
        const payload = {
            patient: fd.get('patientId'),
            test_type: fd.get('testType'),
            date: fd.get('appointmentDate'),
            time: fd.get('appointmentTime'),
            notes: fd.get('notes') || ''
        };
        const resp = await authenticatedFetch(`${API_BASE_URL}/appointments/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!resp.ok) throw new Error(await resp.text());
        showNotification('Appointment scheduled successfully', 'success');
        try { bootstrap.Modal.getInstance(document.getElementById('appointmentModal'))?.hide(); } catch (_) {}
        
        // Refresh appointments and dashboard (may show appointment counts)
        await loadAppointmentsTable();
        if (typeof window.loadDashboardStats === 'function') {
            try { await window.loadDashboardStats(); } catch (_) {}
        }
    } catch (e) {
        console.error('submitAppointment error:', e);
        showNotification('Error scheduling appointment: ' + e.message, 'danger');
    }
}

// View appointment details
async function viewAppointment(id) {
    try {
        const resp = await authenticatedFetch(`${API_BASE_URL}/appointments/${id}/`);
        if (!resp.ok) throw new Error('Appointment not found');
        const a = await resp.json();
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Appointment #${a.id || id}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div><strong>Patient:</strong> ${a.patient?.full_name || '—'}</div>
                        <div><strong>Test:</strong> ${a.test_type || '—'}</div>
                        <div><strong>Date:</strong> ${a.date ? new Date(a.date).toLocaleString() : '—'}</div>
                        <div><strong>Status:</strong> ${a.status || '—'}</div>
                        <div class="mt-2"><strong>Notes:</strong><br>${a.notes || '—'}</div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        new bootstrap.Modal(modal).show();
        modal.addEventListener('hidden.bs.modal', () => modal.remove());
    } catch (e) {
        console.error('viewAppointment error:', e);
        showNotification('Failed to open appointment: ' + e.message, 'danger');
    }
}

// Delete appointment
async function deleteAppointment(id) {
    if (!confirm('Delete this appointment?')) return;
    try {
        const resp = await authenticatedFetch(`${API_BASE_URL}/appointments/${id}/`, { method: 'DELETE' });
        if (!resp.ok) throw new Error('Failed to delete');
        showNotification('Appointment deleted', 'success');
        
        // Refresh appointments and dashboard
        await loadAppointmentsTable();
        if (typeof window.loadDashboardStats === 'function') {
            try { await window.loadDashboardStats(); } catch (_) {}
        }
    } catch (e) {
        console.error('deleteAppointment error:', e);
        showNotification('Failed to delete appointment: ' + e.message, 'danger');
    }
}

// Export to window
window.loadAppointmentsTable = loadAppointmentsTable;
window.submitAppointment = submitAppointment;
window.viewAppointment = viewAppointment;
window.deleteAppointment = deleteAppointment;

