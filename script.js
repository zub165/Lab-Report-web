// Database connection configuration
const dbConfig = {
    database: 'Medi_Lab.mdb',
    connectionString: 'Provider=Microsoft.Jet.OLEDB.4.0;Data Source=Medi_Lab.mdb'
};

// API Configuration
const API_BASE_URL = window.location.origin + '/api';

// Utility Functions
const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
};

const showNotification = (message, type = 'success') => {
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type} border-0 position-fixed top-0 end-0 m-3`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    document.body.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    setTimeout(() => toast.remove(), 3000);
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

// Patient Management Functions
const addPatient = async (patientData) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/patients`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patientData)
        });
        if (!response.ok) throw new Error('Failed to add patient');
        showNotification('Patient added successfully');
        return await response.json();
    } catch (error) {
        showNotification(error.message, 'danger');
        throw error;
    }
};

const getPatients = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/patients`);
        if (!response.ok) throw new Error('Failed to fetch patients');
        return await response.json();
    } catch (error) {
        showNotification(error.message, 'danger');
        throw error;
    }
};

// Test Management Functions
const addTest = async (testData) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/tests`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testData)
        });
        if (!response.ok) throw new Error('Failed to add test');
        showNotification('Test added successfully');
        return await response.json();
    } catch (error) {
        showNotification(error.message, 'danger');
        throw error;
    }
};

const getTests = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/tests`);
        if (!response.ok) throw new Error('Failed to fetch tests');
        return await response.json();
    } catch (error) {
        showNotification(error.message, 'danger');
        throw error;
    }
};

const updateTestStatus = async (testId, status) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/tests/${testId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        if (!response.ok) throw new Error('Failed to update test status');
        showNotification('Test status updated successfully');
        return await response.json();
    } catch (error) {
        showNotification(error.message, 'danger');
        throw error;
    }
};

// Report Generation Functions
const generateReport = async (testId) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/reports/${testId}`);
        if (!response.ok) throw new Error('Failed to generate report');
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `test-report-${testId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
    } catch (error) {
        showNotification(error.message, 'danger');
        throw error;
    }
};

// Report Templates
const reportTemplates = {
    standard: {
        name: 'Standard Report',
        template: (testData) => `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Laboratory Test Report</title>
                <style>
                    @page {
                        size: A4;
                        margin: 0;
                    }
                    body {
                        font-family: 'Times New Roman', Times, serif;
                        margin: 0;
                        padding: 20px;
                        font-size: 12pt;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 20px;
                        border-bottom: 2px solid #000;
                        padding-bottom: 10px;
                    }
                    .header h1 {
                        font-size: 24pt;
                        margin: 0;
                        padding: 0;
                        color: #000;
                    }
                    .header p {
                        margin: 5px 0;
                        font-size: 12pt;
                    }
                    .patient-info {
                        margin: 20px 0;
                        border: 1px solid #000;
                        padding: 10px;
                    }
                    .patient-info table {
                        width: 100%;
                        border-collapse: collapse;
                    }
                    .patient-info td {
                        padding: 5px;
                        border: 1px solid #000;
                    }
                    .test-results {
                        margin: 20px 0;
                        border: 1px solid #000;
                    }
                    .test-results table {
                        width: 100%;
                        border-collapse: collapse;
                    }
                    .test-results th, .test-results td {
                        border: 1px solid #000;
                        padding: 8px;
                        text-align: left;
                    }
                    .test-results th {
                        background-color: #f0f0f0;
                    }
                    .footer {
                        margin-top: 30px;
                        text-align: center;
                        font-size: 10pt;
                    }
                    .signature {
                        margin-top: 50px;
                        text-align: right;
                    }
                    .signature-line {
                        border-top: 1px solid #000;
                        width: 200px;
                        margin-left: auto;
                        margin-top: 50px;
                    }
                    .lab-info {
                        text-align: center;
                        margin-bottom: 20px;
                    }
                    .lab-info p {
                        margin: 2px 0;
                    }
                    .report-number {
                        text-align: right;
                        margin-bottom: 10px;
                    }
                    .report-date {
                        text-align: right;
                        margin-bottom: 20px;
                    }
                    .normal-range {
                        color: #666;
                        font-size: 10pt;
                    }
                    .abnormal {
                        color: #ff0000;
                        font-weight: bold;
                    }
                    @media print {
                        .no-print {
                            display: none;
                        }
                        body {
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="lab-info">
                    <h1>${testData.lab_name}</h1>
                    <p>${testData.lab_address}</p>
                    <p>Phone: ${testData.lab_phone} | Email: ${testData.lab_email}</p>
                </div>

                <div class="report-number">
                    <strong>Report No:</strong> ${testData.id}
                </div>

                <div class="report-date">
                    <strong>Date:</strong> ${new Date(testData.date).toLocaleDateString()}
                </div>

                <div class="patient-info">
                    <table>
                        <tr>
                            <td width="25%"><strong>Patient Name:</strong></td>
                            <td width="25%">${testData.patient_name}</td>
                            <td width="25%"><strong>Age:</strong></td>
                            <td width="25%">${calculateAge(testData.patient_dob)}</td>
                        </tr>
                        <tr>
                            <td><strong>Gender:</strong></td>
                            <td>${testData.patient_gender}</td>
                            <td><strong>Contact:</strong></td>
                            <td>${testData.patient_contact}</td>
                        </tr>
                        <tr>
                            <td><strong>Test Type:</strong></td>
                            <td>${testData.test_type}</td>
                            <td><strong>Status:</strong></td>
                            <td>${testData.status}</td>
                        </tr>
                    </table>
                </div>

                <div class="test-results">
                    <table>
                        <thead>
                            <tr>
                                <th width="30%">Test Parameter</th>
                                <th width="20%">Result</th>
                                <th width="30%">Reference Range</th>
                                <th width="20%">Unit</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${testData.results.map(result => {
                                const isAbnormal = result.isAbnormal || false;
                                const referenceRange = result.referenceRange || result.reference_range || 'N/A';
                                return `
                                    <tr>
                                        <td>${result.parameter}</td>
                                        <td class="${isAbnormal ? 'abnormal' : ''}">${result.value}</td>
                                        <td class="normal-range">${referenceRange}</td>
                                        <td>${result.unit || 'N/A'}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>

                <div class="signature">
                    <p>Authorized by:</p>
                    <div class="signature-line"></div>
                    <p>Laboratory Technician</p>
                    <p>${testData.technician}</p>
                </div>

                <div class="footer">
                    <p>This is a computer-generated report and does not require a signature.</p>
                    <p>Report generated on: ${new Date().toLocaleString()}</p>
                    <p>For any queries, please contact the laboratory.</p>
                </div>
            </body>
            </html>
        `
    },
    modern: {
        name: 'Modern Report',
        template: (testData) => `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Laboratory Test Report</title>
                <style>
                    @page {
                        size: A4;
                        margin: 0;
                    }
                    body {
                        font-family: Arial, sans-serif;
                        margin: 0;
                        padding: 30px;
                        font-size: 12pt;
                        color: #333;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 30px;
                        padding-bottom: 20px;
                        border-bottom: 3px solid #2c3e50;
                    }
                    .header h1 {
                        font-size: 28pt;
                        color: #2c3e50;
                        margin: 0;
                        padding: 0;
                    }
                    .header p {
                        margin: 8px 0;
                        font-size: 12pt;
                        color: #666;
                    }
                    .patient-info {
                        margin: 30px 0;
                        background: #f8f9fa;
                        padding: 20px;
                        border-radius: 8px;
                    }
                    .patient-info table {
                        width: 100%;
                        border-collapse: collapse;
                    }
                    .patient-info td {
                        padding: 10px;
                        border: none;
                    }
                    .test-results {
                        margin: 30px 0;
                        background: white;
                        border-radius: 8px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    }
                    .test-results table {
                        width: 100%;
                        border-collapse: collapse;
                    }
                    .test-results th, .test-results td {
                        padding: 12px;
                        text-align: left;
                        border-bottom: 1px solid #eee;
                    }
                    .test-results th {
                        background-color: #2c3e50;
                        color: white;
                    }
                    .test-results tr:nth-child(even) {
                        background-color: #f8f9fa;
                    }
                    .footer {
                        margin-top: 40px;
                        text-align: center;
                        font-size: 10pt;
                        color: #666;
                    }
                    .signature {
                        margin-top: 60px;
                        text-align: right;
                    }
                    .signature-line {
                        border-top: 2px solid #2c3e50;
                        width: 200px;
                        margin-left: auto;
                        margin-top: 50px;
                    }
                    .lab-info {
                        text-align: center;
                        margin-bottom: 30px;
                    }
                    .lab-info p {
                        margin: 5px 0;
                        color: #666;
                    }
                    .report-number {
                        text-align: right;
                        margin-bottom: 15px;
                        color: #2c3e50;
                    }
                    .report-date {
                        text-align: right;
                        margin-bottom: 25px;
                        color: #2c3e50;
                    }
                    .normal-range {
                        color: #666;
                        font-size: 10pt;
                    }
                    .abnormal {
                        color: #e74c3c;
                        font-weight: bold;
                    }
                    @media print {
                        .no-print {
                            display: none;
                        }
                        body {
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="lab-info">
                    <h1>${testData.lab_name}</h1>
                    <p>${testData.lab_address}</p>
                    <p>Phone: ${testData.lab_phone} | Email: ${testData.lab_email}</p>
                </div>

                <div class="report-number">
                    <strong>Report No:</strong> ${testData.id}
                </div>

                <div class="report-date">
                    <strong>Date:</strong> ${new Date(testData.date).toLocaleDateString()}
                </div>

                <div class="patient-info">
                    <table>
                        <tr>
                            <td width="25%"><strong>Patient Name:</strong></td>
                            <td width="25%">${testData.patient_name}</td>
                            <td width="25%"><strong>Age:</strong></td>
                            <td width="25%">${calculateAge(testData.patient_dob)}</td>
                        </tr>
                        <tr>
                            <td><strong>Gender:</strong></td>
                            <td>${testData.patient_gender}</td>
                            <td><strong>Contact:</strong></td>
                            <td>${testData.patient_contact}</td>
                        </tr>
                        <tr>
                            <td><strong>Test Type:</strong></td>
                            <td>${testData.test_type}</td>
                            <td><strong>Status:</strong></td>
                            <td>${testData.status}</td>
                        </tr>
                    </table>
                </div>

                <div class="test-results">
                    <table>
                        <thead>
                            <tr>
                                <th width="30%">Test Parameter</th>
                                <th width="20%">Result</th>
                                <th width="30%">Reference Range</th>
                                <th width="20%">Unit</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${testData.results.map(result => {
                                const isAbnormal = result.isAbnormal || false;
                                const referenceRange = result.referenceRange || result.reference_range || 'N/A';
                                return `
                                    <tr>
                                        <td>${result.parameter}</td>
                                        <td class="${isAbnormal ? 'abnormal' : ''}">${result.value}</td>
                                        <td class="normal-range">${referenceRange}</td>
                                        <td>${result.unit || 'N/A'}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>

                <div class="signature">
                    <p>Authorized by:</p>
                    <div class="signature-line"></div>
                    <p>Laboratory Technician</p>
                    <p>${testData.technician || 'Dr. James Wilson'}</p>
                </div>

                <div class="footer">
                    <p>This is a computer-generated report and does not require a signature.</p>
                    <p>Report generated on: ${new Date().toLocaleString()}</p>
                    <p>For any queries, please contact the laboratory.</p>
                </div>
            </body>
            </html>
        `
    },
    quest: {
        name: 'Quest Diagnostics',
        template: (testData) => {
            // For demo, use the first result for the main panel
            const mainResult = testData.results && testData.results.length > 0 ? testData.results[0] : {
                parameter: 'N/A', value: 'N/A', unit: '', referenceRange: '', isAbnormal: false
            };
            // Parse reference range for bar
            let refLow = 0, refHigh = 100;
            if (mainResult.referenceRange && mainResult.referenceRange.includes('-')) {
                const parts = mainResult.referenceRange.split('-');
                refLow = parseFloat(parts[0]);
                refHigh = parseFloat(parts[1]);
            }
            const val = parseFloat(mainResult.value);
            const percent = (!isNaN(val) && refHigh > refLow) ? ((val - refLow) / (refHigh - refLow)) * 100 : 50;
            const status = mainResult.isAbnormal ? 'REVIEW' : 'NORMAL';
            const statusColor = mainResult.isAbnormal ? '#e74c3c' : '#27ae60';
            return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Saeed Laboratory Lab Report</title>
                <style>
                    body { font-family: Arial, sans-serif; background: #f6f7fb; margin: 0; padding: 0; }
                    .header { background: #2d6b37; color: #fff; padding: 20px 30px; display: flex; align-items: center; }
                    /* .header-logo { font-size: 2em; font-weight: bold; margin-right: 20px; } */
                    .header-title { font-size: 1.5em; font-weight: bold; }
                    .main { display: flex; padding: 30px; }
                    .sidebar { width: 260px; background: #fff; border-radius: 10px; box-shadow: 0 2px 8px #0001; margin-right: 30px; padding: 20px; }
                    .sidebar h4 { margin-top: 0; font-size: 1.1em; }
                    .sidebar ul { list-style: none; padding: 0; margin: 0; }
                    .sidebar li { margin-bottom: 10px; }
                    .sidebar .active { font-weight: bold; color: #2d6b37; }
                    .sidebar .status-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 6px; }
                    .content { flex: 1; background: #fff; border-radius: 10px; box-shadow: 0 2px 8px #0001; padding: 30px; }
                    .content h2 { margin-top: 0; }
                    .result-bar { height: 18px; background: #eee; border-radius: 9px; position: relative; margin: 18px 0; }
                    .result-bar .bar { position: absolute; height: 100%; border-radius: 9px; background: #e74c3c; left: 0; top: 0; }
                    .result-bar .bar.normal { background: #27ae60; }
                    .result-bar .marker { position: absolute; top: -6px; width: 4px; height: 30px; background: #2d6b37; left: calc(${percent}% - 2px); }
                    .result-labels { display: flex; justify-content: space-between; font-size: 0.95em; color: #888; }
                    .status-label { color: ${statusColor}; font-weight: bold; margin-left: 10px; }
                    .print-btn { float: right; background: #2d6b37; color: #fff; border: none; padding: 8px 18px; border-radius: 5px; cursor: pointer; }
                    .info-box { background: #f6f7fb; border-radius: 8px; padding: 18px; margin-top: 20px; }
                    .additional { margin-top: 30px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <!-- Removed the logo letter -->
                    <div class="header-title">SAEED LABORATORY</div>
                    <button class="print-btn" onclick="window.print()">PRINT REPORT</button>
                </div>
                <div style="padding: 0 30px; margin-top: 18px;">
                    <div style="display: flex; justify-content: space-between;">
                        <div>
                            <strong>${testData.patient_name || 'Last, First'}</strong><br>
                            Sex: ${testData.patient_gender || 'N/A'}<br>
                            Report Status: <span style="color:#e67e22;">${testData.status ? testData.status.toUpperCase() : 'PARTIAL'}</span>
                        </div>
                        <div>
                            Reported Date: ${testData.date ? new Date(testData.date).toLocaleString() : ''}
                        </div>
                    </div>
                </div>
                <div class="main">
                    <div class="sidebar">
                        <h4>Available tests (${testData.results ? testData.results.length : 1})</h4>
                        <ul>
                            ${(testData.results || [mainResult]).map((r, i) => `<li class="${i === 0 ? 'active' : ''}"><span class="status-dot" style="background:${r.isAbnormal ? '#e74c3c' : '#27ae60'}"></span>${r.parameter} <span style="float:right; color:#888; font-size:0.9em;">${r.isAbnormal ? 'REVIEW' : 'NORMAL'}</span></li>`).join('')}
                        </ul>
                        <hr>
                        <div style="font-size:0.95em;">
                            <div><span class="status-dot" style="background:#27ae60"></span>Expected Results</div>
                            <div><span class="status-dot" style="background:#e74c3c"></span>Results Need Your Review</div>
                        </div>
                    </div>
                    <div class="content">
                        <h2>Your ${mainResult.parameter} Result</h2>
                        <div style="display:flex; gap:30px;">
                            <div style="flex:1;">
                                <div style="font-size:1.1em; font-weight:bold;">${mainResult.parameter} <span class="status-label">${status}</span></div>
                                <div class="result-bar">
                                    <div class="bar ${mainResult.isAbnormal ? '' : 'normal'}" style="width:100%"></div>
                                    <div class="marker"></div>
                                </div>
                                <div class="result-labels">
                                    <span>${refLow}</span>
                                    <span>${mainResult.value} ${mainResult.unit || ''}</span>
                                    <span>${refHigh}</span>
                                </div>
                                <div style="margin-top:10px;">Current Result: <strong>${mainResult.value} ${mainResult.unit || ''}</strong></div>
                                <div>Desired Range: <strong>${mainResult.referenceRange || mainResult.reference_range || 'N/A'}</strong></div>
                            </div>
                            <div style="flex:1;">
                                <div style="font-size:1.05em; font-weight:bold; margin-bottom:8px;">What is ${mainResult.parameter}?</div>
                                <div style="font-size:0.98em; color:#444;">
                                    ${mainResult.parameter === 'Glucose (Blood Sugar)' ? `Glucose ("blood sugar") is the chief source of energy for all cells in the body. Glucose levels are regulated by hormones produced by your pancreas, including insulin. A glucose level outside the optimal range could be a sign that the body is not correctly producing or using insulin. These conditions are hypoglycemia (low blood sugar), prediabetes (elevated blood sugar), and diabetes (high blood sugar). For the most accurate result you should fast (not eat or drink anything but water) for at least 8 hours before your screening. If you were not fasting at the time of your screening, you should interpret your result against an optimal range of less than 140 mg/dL.` : 'No explanation available.'}
                                </div>
                            </div>
                        </div>
                        <div class="info-box">
                            <strong>SHOW LAB NOTES</strong><br>
                            ${testData.notes || 'No additional notes.'}
                        </div>
                        <div class="additional">
                            <h4>Additional Information</h4>
                            <div>Diabetes Management</div>
                        </div>
                    </div>
                </div>
            </body>
            </html>
            `;
        }
    }
};

// Report Preview Modal
const showReportPreview = (testId, templateName = 'standard') => {
    // Remove existing modal if any
    const existingModal = document.getElementById('reportPreviewModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Create new modal
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = 'reportPreviewModal';
    modal.setAttribute('data-bs-backdrop', 'static');
    modal.setAttribute('data-bs-keyboard', 'false');
    modal.innerHTML = `
        <div class="modal-dialog modal-xl">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Report Preview</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div class="mb-3">
                        <label class="form-label">Select Template</label>
                        <select class="form-select" id="templateSelect">
                            ${Object.entries(reportTemplates).map(([key, template]) => 
                                `<option value="${key}" ${key === templateName ? 'selected' : ''}>${template.name}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="report-preview">
                        <iframe id="reportFrame" style="width: 100%; height: 600px; border: none;"></iframe>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    <button type="button" class="btn btn-primary" onclick="printCurrentReport()">Print</button>
                    <button type="button" class="btn btn-success" onclick="downloadPDF()">Download PDF</button>
                </div>
            </div>
        </div>
    `;

    // Add modal to document
    document.body.appendChild(modal);

    // Initialize and show modal
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();

    // Load report preview after modal is shown
    modal.addEventListener('shown.bs.modal', () => {
        loadReportPreview(testId, templateName);
    });

    // Handle template change
    document.getElementById('templateSelect').addEventListener('change', (e) => {
        loadReportPreview(testId, e.target.value);
    });
};

// Load report preview
const loadReportPreview = async (testId, templateName) => {
    try {
        // Get test data from mock data
        const tests = storage.get('mockTests');
        const patients = storage.get('mockPatients');
        
        if (!tests || !patients) {
            throw new Error('No data available');
        }

        const test = tests.find(t => t.id === parseInt(testId));
        if (!test) {
            throw new Error('Test not found');
        }

        // Get patient data
        const patient = patients.find(p => p.id === test.patientId);
        if (!patient) {
            throw new Error('Patient not found');
        }

        // Prepare test data for template
        const testData = {
            id: test.id,
            patient_name: patient.fullName,
            patient_dob: patient.dateOfBirth,
            patient_gender: patient.gender,
            patient_contact: patient.contactNumber,
            test_type: test.testType,
            date: test.testDate,
            status: test.status,
            results: test.results || [],
            technician: 'Dr. James Wilson',
            lab_name: 'SAEED LABORATORY',
            lab_address: '123 Medical Center Dr, Healthcare City',
            lab_phone: '555-0126',
            lab_email: 'info@saeedlab.com'
        };

        const frame = document.getElementById('reportFrame');
        if (!frame) {
            throw new Error('Report frame not found');
        }

        // Get template and render
        const template = reportTemplates[templateName].template(testData);
        
        // Write to iframe
        frame.contentWindow.document.open();
        frame.contentWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <script>
                    // Add calculateAge function to iframe
                    function calculateAge(dob) {
                        const birthDate = new Date(dob);
                        const today = new Date();
                        let age = today.getFullYear() - birthDate.getFullYear();
                        const monthDiff = today.getMonth() - birthDate.getMonth();
                        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                            age--;
                        }
                        return age;
                    }
                </script>
                ${template}
            </head>
            <body>
                ${template}
            </body>
            </html>
        `);
        frame.contentWindow.document.close();

        // Add print styles
        const style = frame.contentWindow.document.createElement('style');
        style.textContent = `
            @media print {
                body { margin: 0; padding: 20px; }
                .no-print { display: none; }
            }
        `;
        frame.contentWindow.document.head.appendChild(style);

    } catch (error) {
        console.error('Error loading report preview:', error);
        showNotification('Error loading report preview: ' + error.message, 'danger');
    }
};

// Print current report
const printCurrentReport = () => {
    const frame = document.getElementById('reportFrame');
    if (frame) {
        frame.contentWindow.print();
    } else {
        showNotification('Report frame not found', 'danger');
    }
};

// Download PDF
const downloadPDF = async () => {
    const testId = document.getElementById('reportPreviewModal').dataset.testId;
    const templateName = document.getElementById('templateSelect').value;
    await generatePDFReport(testId, templateName);
};

// Batch print reports
const batchPrintReports = async (testIds) => {
    try {
        const printWindow = window.open('', '_blank');
        const templateName = 'standard'; // or get from settings
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Batch Reports</title>
                <style>
                    @page {
                        size: A4;
                        margin: 0;
                    }
                    body {
                        margin: 0;
                        padding: 0;
                    }
                    .report {
                        page-break-after: always;
                    }
                    .report:last-child {
                        page-break-after: avoid;
                    }
                </style>
            </head>
            <body>
                <div id="reports"></div>
            </body>
            </html>
        `);
        
        printWindow.document.close();
        
        // Load each report
        for (const testId of testIds) {
            const response = await fetch(`/api/tests/${testId}`);
            const testData = await response.json();
            
            const reportDiv = printWindow.document.createElement('div');
            reportDiv.className = 'report';
            reportDiv.innerHTML = reportTemplates[templateName].template(testData);
            printWindow.document.getElementById('reports').appendChild(reportDiv);
        }
        
        // Wait for all reports to load
        setTimeout(() => {
            printWindow.print();
        }, 1000);
        
    } catch (error) {
        console.error('Error batch printing reports:', error);
        showNotification('Error printing reports', 'danger');
    }
};

// Update the print report function to use the new system
const printReport = async (testId) => {
    showReportPreview(testId);
};

// Add report settings to the settings tab
document.addEventListener('DOMContentLoaded', function() {
    const settingsForm = document.getElementById('settingsForm');
    if (settingsForm) {
        const reportSettings = document.createElement('div');
        reportSettings.className = 'mb-3';
        reportSettings.innerHTML = `
            <h5>Report Settings</h5>
            <div class="mb-3">
                <label class="form-label">Default Report Template</label>
                <select class="form-select" name="defaultTemplate">
                    ${Object.entries(reportTemplates).map(([key, template]) => 
                        `<option value="${key}">${template.name}</option>`
                    ).join('')}
                </select>
            </div>
            <div class="mb-3">
                <label class="form-label">Include QR Code</label>
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" name="includeQR" id="includeQR">
                    <label class="form-check-label" for="includeQR">
                        Add QR code to reports for digital verification
                    </label>
                </div>
            </div>
            <div class="mb-3">
                <label class="form-label">Default Printer</label>
                <select class="form-select" name="defaultPrinter">
                    <option value="default">System Default</option>
                    <option value="thermal">Thermal Printer</option>
                    <option value="laser">Laser Printer</option>
                </select>
            </div>
        `;
        settingsForm.insertBefore(reportSettings, settingsForm.firstChild);
    }
});

// Function to generate PDF report
const generatePDFReport = async (testId, templateName) => {
    try {
        const response = await fetch(`/api/reports/${testId}/pdf?template=${templateName}`);
        if (!response.ok) throw new Error('Failed to generate PDF');
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lab-report-${testId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        
        showNotification('PDF report downloaded successfully', 'success');
    } catch (error) {
        console.error('Error generating PDF:', error);
        showNotification('Error generating PDF report', 'danger');
    }
};

// Search Functions
const searchTests = async (query) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error('Failed to search tests');
        return await response.json();
    } catch (error) {
        showNotification(error.message, 'danger');
        throw error;
    }
};

// Dashboard Statistics Functions
const getDashboardStats = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/stats`);
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch dashboard stats');
        }
        return await response.json();
    } catch (error) {
        console.error('Error getting dashboard stats:', error);
        showNotification(error.message, 'danger');
        throw error;
    }
};

// System Status Functions
const checkSystemStatus = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/system/status`);
        if (!response.ok) throw new Error('Failed to check system status');
        return await response.json();
    } catch (error) {
        showNotification(error.message, 'danger');
        throw error;
    }
};

// Temporary Storage Functions
const storage = {
    // Save data to localStorage
    save: (key, data) => {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            return false;
        }
    },

    // Get data from localStorage
    get: (key) => {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return null;
        }
    },

    // Remove data from localStorage
    remove: (key) => {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Error removing from localStorage:', error);
            return false;
        }
    },

    // Clear all temporary data
    clear: () => {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('Error clearing localStorage:', error);
            return false;
        }
    }
};

// Event Listeners
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize dashboard
    try {
        const stats = await getDashboardStats();
        updateDashboardStats(stats);
    } catch (error) {
        console.error('Failed to initialize dashboard:', error);
    }

    // Search functionality
    const searchInput = document.querySelector('input[placeholder="Search..."]');
    const searchButton = searchInput.nextElementSibling;
    
    searchButton.addEventListener('click', async () => {
        const query = searchInput.value.trim();
        if (query) {
            try {
                const results = await searchTests(query);
                updateSearchResults(results);
            } catch (error) {
                console.error('Search failed:', error);
            }
        }
    });

    // Quick action buttons
    document.querySelector('.btn-primary').addEventListener('click', () => {
        const newTestModal = new bootstrap.Modal(document.getElementById('newTestModal'));
        newTestModal.show();
    });

    document.querySelector('.btn-outline-primary').addEventListener('click', () => {
        const addPatientModal = new bootstrap.Modal(document.getElementById('addPatientModal'));
        addPatientModal.show();
    });

    // System status check
    setInterval(async () => {
        try {
            const status = await checkSystemStatus();
            updateSystemStatus(status);
        } catch (error) {
            console.error('System status check failed:', error);
        }
    }, 30000); // Check every 30 seconds
});

// UI Update Functions
let testsChart, statusChart;

const updateDashboardStats = (stats) => {
    try {
        const statCards = document.querySelectorAll('.stat-card h2');
        if (statCards.length >= 4) {
            statCards[0].textContent = stats.totalTests || '0';
            statCards[1].textContent = stats.pendingTests || '0';
            statCards[2].textContent = stats.todayPatients || '0';
            statCards[3].textContent = stats.completedTests || '0';
        } else {
            console.warn('Dashboard stat cards not found in the DOM');
        }
        updateCharts(stats);
    } catch (error) {
        console.warn('Error updating dashboard stats:', error);
    }
};

const updateCharts = (stats) => {
    const ctx1 = document.getElementById('testsChart')?.getContext('2d');
    const ctx2 = document.getElementById('statusChart')?.getContext('2d');
    
    if (testsChart) testsChart.destroy();
    if (statusChart) statusChart.destroy();
    
    if (ctx1) {
        testsChart = new Chart(ctx1, {
            type: 'bar',
            data: {
                labels: ['Total', 'Pending', 'Today', 'Completed'],
                datasets: [{
                    label: 'Tests',
                    data: [stats.totalTests || 0, stats.pendingTests || 0, stats.todayPatients || 0, stats.completedTests || 0],
                    backgroundColor: ['#2c3e50', '#e74c3c', '#34db', '#2ecc71']
                }]
            },
            options: { responsive: true, plugins: { legend: { display: false } } }
        });
    }
    
    if (ctx2) {
        statusChart = new Chart(ctx2, {
            type: 'doughnut',
            data: {
                labels: ['Completed', 'Pending', 'Other'],
                datasets: [{
                    data: [stats.completedTests || 0, stats.pendingTests || 0, Math.max(0, (stats.totalTests || 0) - (stats.completedTests || 0) - (stats.pendingTests || 0))],
                    backgroundColor: ['#2ecc71', '#f39c12', '#e74c3c']
                }]
            },
            options: { responsive: true }
        });
    }
};

const updateSearchResults = (results) => {
    const tbody = document.querySelector('.table tbody');
    tbody.innerHTML = results.map(test => `
        <tr>
            <td>#${test.id}</td>
            <td>${test.patientName}</td>
            <td>${test.testType}</td>
            <td><span class="badge bg-${test.status === 'Completed' ? 'success' : 'warning'}">${test.status}</span></td>
            <td>${formatDate(test.date)}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="viewTest(${test.id})">View</button>
                <button class="btn btn-sm btn-outline-secondary" onclick="printReport(${test.id})">Print</button>
            </td>
        </tr>
    `).join('');
};

const updateSystemStatus = (status) => {
    const statusElements = document.querySelectorAll('.card-body .d-flex');
    statusElements[0].querySelector('span:last-child').innerHTML = 
        `<i class="fas fa-${status.database ? 'check' : 'times'}-circle"></i> ${status.database ? 'Connected' : 'Disconnected'}`;
    statusElements[1].querySelector('span:last-child').innerHTML = 
        `<i class="fas fa-${status.printer ? 'check' : 'times'}-circle"></i> ${status.printer ? 'Ready' : 'Not Ready'}`;
    statusElements[2].querySelector('span:last-child').innerHTML = 
        `<i class="fas fa-${status.updates ? 'exclamation' : 'check'}-circle"></i> ${status.updates ? 'Available' : 'Up to date'}`;
};

// Modal Functions
const showNewTestModal = () => {
    // Implementation for new test modal
};

const showAddPatientModal = () => {
    // Implementation for add patient modal
};

// Export functions for use in HTML
window.addPatient = addPatient;
window.getPatients = getPatients;
window.addTest = addTest;
window.getTests = getTests;
window.updateTestStatus = updateTestStatus;
window.generateReport = generateReport;
window.printReport = printReport;
window.searchTests = searchTests;
window.getDashboardStats = getDashboardStats;
window.checkSystemStatus = checkSystemStatus;

// Initialize Bootstrap tooltips and popovers
document.addEventListener('DOMContentLoaded', function() {
    // Load initial data
    loadDashboardStats();
    loadRecentTests();
    loadPatients();

    // Add event listeners
    document.querySelector('.btn-primary').addEventListener('click', () => {
        const newTestModal = new bootstrap.Modal(document.getElementById('newTestModal'));
        newTestModal.show();
    });

    document.querySelector('.btn-outline-primary').addEventListener('click', () => {
        const addPatientModal = new bootstrap.Modal(document.getElementById('addPatientModal'));
        addPatientModal.show();
    });
});

// Load dashboard statistics
async function loadDashboardStats() {
    try {
        const stats = await getDashboardStats();
        
        // Update dashboard statistics
        const statCards = document.querySelectorAll('.stat-card h2');
        if (statCards.length >= 4) {
            statCards[0].textContent = stats.totalTests;
            statCards[1].textContent = stats.pendingTests;
            statCards[2].textContent = stats.todayPatients;
            statCards[3].textContent = stats.completedTests;
        }
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        showNotification('Error loading dashboard statistics', 'danger');
    }
}

// Load recent tests
async function loadRecentTests() {
    try {
        const response = await fetch(`${API_BASE_URL}/tests/recent`);
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch recent tests');
        }
        const tests = await response.json();
        
        const tbody = document.querySelector('table tbody');
        tbody.innerHTML = tests.map(test => `
            <tr>
                <td>#${test.id}</td>
                <td>${test.patient_name}</td>
                <td>${test.test_type}</td>
                <td><span class="badge bg-${test.status === 'completed' ? 'success' : 'warning'}">${test.status}</span></td>
                <td>${new Date(test.date).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="viewTest(${test.id})">View</button>
                    <button class="btn btn-sm btn-outline-secondary" onclick="printReport(${test.id})">Print</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading recent tests:', error);
        showNotification(error.message, 'danger');
    }
}

// Load patients for dropdown
async function loadPatients() {
    try {
        const response = await fetch('/api/patients');
        const patients = await response.json();
        
        const select = document.querySelector('select[name="patientId"]');
        select.innerHTML = '<option value="">Select Patient</option>';
        
        patients.forEach(patient => {
            const option = document.createElement('option');
            option.value = patient.id;
            option.textContent = patient.name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading patients:', error);
    }
}

// Submit new test
async function submitNewTest() {
    const form = document.getElementById('newTestForm');
    const formData = new FormData(form);
    
    try {
        const response = await fetch(`${API_BASE_URL}/tests`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                patient_id: formData.get('patientId'),
                test_type: formData.get('testType'),
                date: formData.get('testDate'),
                priority: formData.get('priority'),
                notes: formData.get('notes')
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to add test');
        }

        const newTestModal = bootstrap.Modal.getInstance(document.getElementById('newTestModal'));
        newTestModal.hide();
        form.reset();
        showNotification('Test added successfully');
        loadRecentTests();
        loadDashboardStats();
    } catch (error) {
        console.error('Error submitting new test:', error);
        showNotification(error.message, 'danger');
    }
}

// Submit new patient
async function submitNewPatient() {
    const form = document.getElementById('addPatientForm');
    const formData = new FormData(form);
    
    try {
        const response = await fetch(`${API_BASE_URL}/patients`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: formData.get('fullName'),
                dob: formData.get('dob'),
                gender: formData.get('gender'),
                contact_number: formData.get('contactNumber'),
                email: formData.get('email'),
                address: formData.get('address')
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to add patient');
        }

        const addPatientModal = bootstrap.Modal.getInstance(document.getElementById('addPatientModal'));
        addPatientModal.hide();
        form.reset();
        showNotification('Patient added successfully');
        loadPatients();
    } catch (error) {
        console.error('Error submitting new patient:', error);
        showNotification(error.message, 'danger');
    }
}

// View test details
const viewTest = async (testId) => {
    try {
        const response = await fetch(`${API_BASE_URL}/tests/${testId}`);
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch test details');
        }
        const test = await response.json();
        
        if (test) {
            showReportPreview(testId);
        } else {
            throw new Error('Test not found');
        }
    } catch (error) {
        console.error('Error viewing test:', error);
        showNotification(error.message, 'danger');
    }
};

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Bootstrap tabs
    const tabLinks = document.querySelectorAll('.nav-link');
    tabLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            // Remove active class from all links
            tabLinks.forEach(l => l.classList.remove('active'));
            // Add active class to clicked link
            this.classList.add('active');
        });
    });

    // Load data for each tab when it's shown
    const tabPanes = document.querySelectorAll('.tab-pane');
    tabPanes.forEach(pane => {
        pane.addEventListener('shown.bs.tab', function() {
            const tabId = this.id;
            switch(tabId) {
                case 'lab-tests':
                    loadTests();
                    break;
                case 'patients':
                    loadPatients();
                    break;
                case 'reports':
                    loadReports();
                    break;
                case 'settings':
                    loadSettings();
                    break;
            }
        });
    });

    // Function to load tests
    async function loadTests() {
        try {
            const response = await fetch(`${API_BASE_URL}/tests`);
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to fetch tests');
            }
            const data = await response.json();
            updateTestsTable(data);
        } catch (error) {
            console.error('Error loading tests:', error);
            showNotification(error.message, 'danger');
        }
    }

    // Function to load patients
    async function loadPatients() {
        try {
            const response = await fetch(`${API_BASE_URL}/patients`);
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to fetch patients');
            }
            const data = await response.json();
            updatePatientsTable(data);
        } catch (error) {
            console.error('Error loading patients:', error);
            showNotification(error.message, 'danger');
        }
    }

    // Function to load reports
    async function loadReports() {
        try {
            const response = await fetch(`${API_BASE_URL}/reports`);
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to fetch reports');
            }
            const data = await response.json();
            
            const tbody = document.getElementById('reportsTableBody');
            tbody.innerHTML = data.map(report => `
                <tr>
                    <td>#${report.id}</td>
                    <td>${report.patient_name}</td>
                    <td>${report.test_type}</td>
                    <td>${new Date(report.date).toLocaleDateString()}</td>
                    <td><span class="badge bg-${report.status === 'completed' ? 'success' : 'warning'}">${report.status}</span></td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" onclick="viewReport(${report.id})">View</button>
                        <button class="btn btn-sm btn-outline-secondary" onclick="printReport(${report.id})">Print</button>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Error loading reports:', error);
            showNotification(error.message, 'danger');
        }
    }

    // Function to load settings
    async function loadSettings() {
        try {
            const response = await fetch(`${API_BASE_URL}/settings`);
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to fetch settings');
            }
            const data = await response.json();
            
            document.querySelector('input[name="labName"]').value = data.labName || '';
            document.querySelector('textarea[name="address"]').value = data.address || '';
            document.querySelector('input[name="contactNumber"]').value = data.contactNumber || '';
        } catch (error) {
            console.error('Error loading settings:', error);
            showNotification(error.message, 'danger');
        }
    }

    // Helper function to calculate age from date of birth
    function calculateAge(dob) {
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    }

    // Handle form submissions
    document.getElementById('newTestForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(this);
        fetch('/api/tests', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(Object.fromEntries(formData))
        })
        .then(response => response.json())
        .then(data => {
            alert('Test added successfully!');
            loadTests();
            bootstrap.Modal.getInstance(document.getElementById('newTestModal')).hide();
        })
        .catch(error => console.error('Error adding test:', error));
    });

    document.getElementById('addPatientForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(this);
        fetch('/api/patients', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(Object.fromEntries(formData))
        })
        .then(response => response.json())
        .then(data => {
            alert('Patient added successfully!');
            loadPatients();
            bootstrap.Modal.getInstance(document.getElementById('addPatientModal')).hide();
        })
        .catch(error => console.error('Error adding patient:', error));
    });

    document.getElementById('settingsForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(this);
        fetch('/api/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(Object.fromEntries(formData))
        })
        .then(response => response.json())
        .then(data => {
            alert('Settings saved successfully!');
        })
        .catch(error => console.error('Error saving settings:', error));
    });
});

// Modified loadTests function to use temporary storage
function loadTests() {
    // First try to get from localStorage
    const cachedTests = storage.get('tests');
    if (cachedTests) {
        updateTestsTable(cachedTests);
    }

    // Then fetch from server
    fetch('/api/tests')
        .then(response => response.json())
        .then(data => {
            // Save to localStorage
            storage.save('tests', data);
            // Update table
            updateTestsTable(data);
        })
        .catch(error => {
            console.error('Error loading tests:', error);
            // If server fails, use cached data if available
            if (cachedTests) {
                showNotification('Using cached data. Some information may be outdated.', 'warning');
            }
        });
}

// Modified loadPatients function to use temporary storage
function loadPatients() {
    // First try to get from localStorage
    const cachedPatients = storage.get('patients');
    if (cachedPatients) {
        updatePatientsTable(cachedPatients);
    }

    // Then fetch from server
    fetch('/api/patients')
        .then(response => response.json())
        .then(data => {
            // Save to localStorage
            storage.save('patients', data);
            // Update table
            updatePatientsTable(data);
        })
        .catch(error => {
            console.error('Error loading patients:', error);
            // If server fails, use cached data if available
            if (cachedPatients) {
                showNotification('Using cached data. Some information may be outdated.', 'warning');
            }
        });
}

// Helper function to update tests table
function updateTestsTable(tests) {
    const tbody = document.getElementById('testsTableBody');
    tbody.innerHTML = tests.map(test => `
        <tr>
            <td>#${test.id}</td>
            <td>${test.patient_name}</td>
            <td>${test.test_type}</td>
            <td><span class="badge bg-${test.status === 'completed' ? 'success' : 'warning'}">${test.status}</span></td>
            <td>${new Date(test.date).toLocaleDateString()}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="viewTest(${test.id})">View</button>
                <button class="btn btn-sm btn-outline-secondary" onclick="printReport(${test.id})">Print</button>
            </td>
        </tr>
    `).join('');
}

// Helper function to update patients table
function updatePatientsTable(patients) {
    const tbody = document.getElementById('patientsTableBody');
    tbody.innerHTML = patients.map(patient => `
        <tr>
            <td>${patient.id}</td>
            <td>${patient.name}</td>
            <td>${calculateAge(patient.dob)}</td>
            <td>${patient.gender}</td>
            <td>${patient.contact_number}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="viewPatient(${patient.id})">View</button>
                <button class="btn btn-sm btn-outline-danger" onclick="deletePatient(${patient.id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

// Add offline support
window.addEventListener('online', () => {
    showNotification('Back online. Syncing data...', 'success');
    loadTests();
    loadPatients();
});

window.addEventListener('offline', () => {
    showNotification('You are offline. Using cached data.', 'warning');
});

// Report Management Functions
const loadReports = async (page = 1, filters = {}) => {
    try {
        // Try to get mock data from localStorage
        let reports = storage.get('mockReports');
        
        // If no mock data exists, generate it
        if (!reports) {
            const { mockReports } = generateMockData();
            reports = mockReports;
        }

        // Apply filters if any
        if (filters.date) {
            reports = reports.filter(report => report.date === filters.date);
        }
        if (filters.type && filters.type !== 'all') {
            reports = reports.filter(report => report.test_type.toLowerCase().includes(filters.type.toLowerCase()));
        }

        // Calculate statistics
        const stats = {
            total: reports.length,
            completed: reports.filter(r => r.status === 'completed').length,
            pending: reports.filter(r => r.status === 'pending').length,
            today: reports.filter(r => r.date === new Date().toLocaleDateString('en-CA')).length
        };

        // Update statistics
        document.getElementById('totalReports').textContent = stats.total;
        document.getElementById('completedReports').textContent = stats.completed;
        document.getElementById('pendingReports').textContent = stats.pending;
        document.getElementById('todayReports').textContent = stats.today;

        // Update table
        const tbody = document.getElementById('reportsTableBody');
        tbody.innerHTML = reports.map(report => `
            <tr>
                <td>
                    <input type="checkbox" class="form-check-input report-checkbox" value="${report.id}">
                </td>
                <td>#${report.id}</td>
                <td>${report.patient_name}</td>
                <td>${report.test_type}</td>
                <td>${new Date(report.date).toLocaleDateString()}</td>
                <td>
                    <span class="badge bg-${report.status === 'completed' ? 'success' : 'warning'}">
                        ${report.status}
                    </span>
                </td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-outline-info" onclick="showReportPreview(${report.id})">
                            <i class="fas fa-eye"></i> Preview
                        </button>
                        <button class="btn btn-sm btn-outline-primary" onclick="viewReport(${report.id})">
                            <i class="fas fa-file-alt"></i> View
                        </button>
                        <button class="btn btn-sm btn-outline-secondary" onclick="printReport(${report.id})">
                            <i class="fas fa-print"></i> Print
                        </button>
                        <button class="btn btn-sm btn-outline-success" onclick="exportReport(${report.id})">
                            <i class="fas fa-file-export"></i> Export
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        // Update pagination
        updatePagination({
            currentPage: page,
            totalPages: Math.ceil(reports.length / 10)
        });

    } catch (error) {
        console.error('Error loading reports:', error);
        showNotification('Error loading reports', 'danger');
    }
};

const filterReports = () => {
    const date = document.getElementById('reportDate').value;
    const type = document.getElementById('reportType').value;
    
    loadReports(1, { date, type });
};

const updatePagination = (pagination) => {
    const ul = document.getElementById('reportsPagination');
    ul.innerHTML = '';
    
    // Previous button
    ul.innerHTML += `
        <li class="page-item ${pagination.currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="loadReports(${pagination.currentPage - 1})">Previous</a>
        </li>
    `;
    
    // Page numbers
    for (let i = 1; i <= pagination.totalPages; i++) {
        ul.innerHTML += `
            <li class="page-item ${i === pagination.currentPage ? 'active' : ''}">
                <a class="page-link" href="#" onclick="loadReports(${i})">${i}</a>
            </li>
        `;
    }
    
    // Next button
    ul.innerHTML += `
        <li class="page-item ${pagination.currentPage === pagination.totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="loadReports(${pagination.currentPage + 1})">Next</a>
        </li>
    `;
};

const exportReports = async () => {
    try {
        const response = await fetch('/api/reports/export');
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reports-${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        
        showNotification('Reports exported successfully', 'success');
    } catch (error) {
        console.error('Error exporting reports:', error);
        showNotification('Error exporting reports', 'danger');
    }
};

const batchPrintSelected = () => {
    const selectedIds = Array.from(document.querySelectorAll('.report-checkbox:checked'))
        .map(checkbox => checkbox.value);
    
    if (selectedIds.length > 0) {
        batchPrintReports(selectedIds);
    } else {
        showNotification('Please select reports to print', 'warning');
    }
};

const batchExportSelected = async () => {
    const selectedIds = Array.from(document.querySelectorAll('.report-checkbox:checked'))
        .map(checkbox => checkbox.value);
    
    if (selectedIds.length > 0) {
        try {
            const response = await fetch('/api/reports/export', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ reportIds: selectedIds })
            });
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `selected-reports-${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
            
            showNotification('Selected reports exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting selected reports:', error);
            showNotification('Error exporting reports', 'danger');
        }
    } else {
        showNotification('Please select reports to export', 'warning');
    }
};

const batchDeleteSelected = async () => {
    const selectedIds = Array.from(document.querySelectorAll('.report-checkbox:checked'))
        .map(checkbox => checkbox.value);
    
    if (selectedIds.length > 0) {
        if (confirm(`Are you sure you want to delete ${selectedIds.length} reports?`)) {
            try {
                const response = await fetch('/api/reports/delete', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ reportIds: selectedIds })
                });
                
                if (response.ok) {
                    showNotification('Reports deleted successfully', 'success');
                    loadReports(); // Reload the reports
                } else {
                    throw new Error('Failed to delete reports');
                }
            } catch (error) {
                console.error('Error deleting reports:', error);
                showNotification('Error deleting reports', 'danger');
            }
        }
    } else {
        showNotification('Please select reports to delete', 'warning');
    }
};

// Add event listeners for report management
document.addEventListener('DOMContentLoaded', function() {
    // Select all reports checkbox
    const selectAllCheckbox = document.getElementById('selectAllReports');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('.report-checkbox');
            checkboxes.forEach(checkbox => checkbox.checked = this.checked);
            document.getElementById('batchActions').style.display = this.checked ? 'block' : 'none';
        });
    }
    
    // Individual report checkboxes
    document.addEventListener('change', function(e) {
        if (e.target.classList.contains('report-checkbox')) {
            const checkedBoxes = document.querySelectorAll('.report-checkbox:checked');
            document.getElementById('batchActions').style.display = checkedBoxes.length > 0 ? 'block' : 'none';
        }
    });
    
    // Load initial reports
    loadReports();
});

// Mock Data Generation
const generateMockData = () => {
    // Mock Patients
    const mockPatients = [
        {
            id: 1,
            fullName: "John Smith",
            dateOfBirth: "1980-05-15",
            gender: "Male",
            contactNumber: "555-0123",
            email: "john.smith@email.com",
            address: "123 Main St, City",
            createdAt: "2024-03-01T10:00:00",
            updatedAt: "2024-03-01T10:00:00"
        },
        {
            id: 2,
            fullName: "Sarah Johnson",
            dateOfBirth: "1992-08-23",
            gender: "Female",
            contactNumber: "555-0124",
            email: "sarah.j@email.com",
            address: "456 Oak Ave, Town",
            createdAt: "2024-03-02T11:30:00",
            updatedAt: "2024-03-02T11:30:00"
        },
        {
            id: 3,
            fullName: "Michael Brown",
            dateOfBirth: "1975-11-30",
            gender: "Male",
            contactNumber: "555-0125",
            email: "m.brown@email.com",
            address: "789 Pine Rd, Village",
            createdAt: "2024-03-03T09:15:00",
            updatedAt: "2024-03-03T09:15:00"
        }
    ];

    // Actual Test Types from database
    const testTypes = [
        { id: 1, name: "Blood Test", description: "Complete Blood Count (CBC)", price: 50.00 },
        { id: 2, name: "Urine Analysis", description: "Complete Urine Analysis", price: 30.00 },
        { id: 3, name: "X-Ray", description: "Chest X-Ray", price: 100.00 },
        { id: 4, name: "MRI", description: "Magnetic Resonance Imaging", price: 500.00 },
        { id: 5, name: "CT Scan", description: "Computed Tomography Scan", price: 400.00 },
        { id: 6, name: "Ultrasound", description: "Abdominal Ultrasound", price: 200.00 },
        { id: 7, name: "ECG", description: "Electrocardiogram", price: 80.00 },
        { id: 8, name: "Lipid Profile", description: "Cholesterol and Triglycerides Test", price: 60.00 },
        { id: 9, name: "Diabetes Test", description: "Blood Glucose Test", price: 40.00 },
        { id: 10, name: "Thyroid Test", description: "Thyroid Function Test", price: 70.00 }
    ];

    // Mock Tests with actual test types
    const mockTests = [
        {
            id: 1,
            patientId: 1,
            testType: "Blood Test",
            testDate: "2024-03-20",
            priority: "Normal",
            notes: "Regular checkup",
            status: "Completed",
            results: [
                { parameter: "Hemoglobin", value: "14.2", unit: "g/dL", referenceRange: "13.5-17.5", isAbnormal: false },
                { parameter: "White Blood Cells", value: "7.5", unit: "10^9/L", referenceRange: "4.5-11.0", isAbnormal: false },
                { parameter: "Platelets", value: "250", unit: "10^9/L", referenceRange: "150-450", isAbnormal: false }
            ],
            createdAt: "2024-03-20T09:00:00",
            updatedAt: "2024-03-20T10:30:00"
        },
        {
            id: 2,
            patientId: 2,
            testType: "Lipid Profile",
            testDate: "2024-03-21",
            priority: "Normal",
            notes: "Annual checkup",
            status: "Completed",
            results: [
                { parameter: "Total Cholesterol", value: "180", unit: "mg/dL", referenceRange: "<200", isAbnormal: false },
                { parameter: "HDL", value: "55", unit: "mg/dL", referenceRange: ">40", isAbnormal: false },
                { parameter: "LDL", value: "100", unit: "mg/dL", referenceRange: "<130", isAbnormal: false }
            ],
            createdAt: "2024-03-21T10:00:00",
            updatedAt: "2024-03-21T11:30:00"
        },
        {
            id: 3,
            patientId: 3,
            testType: "Diabetes Test",
            testDate: "2024-03-22",
            priority: "Urgent",
            notes: "Follow-up test",
            status: "Pending",
            results: [
                { parameter: "Fasting Glucose", value: "95", unit: "mg/dL", referenceRange: "70-99", isAbnormal: false },
                { parameter: "HbA1c", value: "5.6", unit: "%", referenceRange: "4.0-5.6", isAbnormal: false }
            ],
            createdAt: "2024-03-22T08:00:00",
            updatedAt: "2024-03-22T08:00:00"
        }
    ];

    // Mock Appointments
    const mockAppointments = [
        {
            id: 1,
            patientId: 1,
            testId: 1,
            appointmentDate: "2024-03-20",
            appointmentTime: "09:00",
            status: "Completed",
            notes: "Regular checkup"
        },
        {
            id: 2,
            patientId: 2,
            testId: 2,
            appointmentDate: "2024-03-21",
            appointmentTime: "10:00",
            status: "Completed",
            notes: "Annual checkup"
        },
        {
            id: 3,
            patientId: 3,
            testId: 3,
            appointmentDate: "2024-03-22",
            appointmentTime: "08:00",
            status: "Scheduled",
            notes: "Follow-up test"
        }
    ];

    // Mock Payments
    const mockPayments = [
        {
            id: 1,
            testId: 1,
            amount: 50.00,
            paymentDate: "2024-03-20T09:00:00",
            paymentMethod: "Card",
            status: "Completed",
            transactionId: "TXN123456"
        },
        {
            id: 2,
            testId: 2,
            amount: 60.00,
            paymentDate: "2024-03-21T10:00:00",
            paymentMethod: "Cash",
            status: "Completed",
            transactionId: "TXN123457"
        },
        {
            id: 3,
            testId: 3,
            amount: 40.00,
            paymentDate: "2024-03-22T08:00:00",
            paymentMethod: "Insurance",
            status: "Pending",
            transactionId: "TXN123458"
        }
    ];

    // Save mock data to localStorage
    storage.save('mockPatients', mockPatients);
    storage.save('mockTests', mockTests);
    storage.save('mockTestTypes', testTypes);
    storage.save('mockAppointments', mockAppointments);
    storage.save('mockPayments', mockPayments);

    return { 
        mockPatients, 
        mockTests, 
        mockTestTypes: testTypes, 
        mockAppointments, 
        mockPayments 
    };
};

// Initialize mock data and load it into the UI
document.addEventListener('DOMContentLoaded', function() {
    // Generate and store mock data
    const { mockPatients, mockTests, mockTestTypes, mockAppointments, mockPayments } = generateMockData();
    
    // Load data into respective tables
    const testsTableBody = document.getElementById('testsTableBody');
    if (testsTableBody) {
        testsTableBody.innerHTML = mockTests.map(test => `
            <tr>
                <td>#${test.id}</td>
                <td>${test.patient_name}</td>
                <td>${test.test_type}</td>
                <td><span class="badge bg-${test.status === 'completed' ? 'success' : 'warning'}">${test.status}</span></td>
                <td>${new Date(test.date).toLocaleDateString()}</td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-outline-info" onclick="showReportPreview(${test.id})">
                            <i class="fas fa-eye"></i> Preview
                        </button>
                        <button class="btn btn-sm btn-outline-primary" onclick="viewTest(${test.id})">
                            <i class="fas fa-file-alt"></i> View
                        </button>
                        <button class="btn btn-sm btn-outline-secondary" onclick="printReport(${test.id})">
                            <i class="fas fa-print"></i> Print
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    const patientsTableBody = document.getElementById('patientsTableBody');
    if (patientsTableBody) {
        patientsTableBody.innerHTML = mockPatients.map(patient => `
            <tr>
                <td>${patient.id}</td>
                <td>${patient.name}</td>
                <td>${calculateAge(patient.dob)}</td>
                <td>${patient.gender}</td>
                <td>${patient.contact_number}</td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-outline-primary" onclick="viewPatient(${patient.id})">
                            <i class="fas fa-eye"></i> View
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deletePatient(${patient.id})">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    const reportsTableBody = document.getElementById('reportsTableBody');
    if (reportsTableBody) {
        reportsTableBody.innerHTML = mockTests.map(test => `
            <tr>
                <td>
                    <input type="checkbox" class="form-check-input report-checkbox" value="${test.id}">
                </td>
                <td>#${test.id}</td>
                <td>${test.patient_name}</td>
                <td>${test.test_type}</td>
                <td>${new Date(test.date).toLocaleDateString()}</td>
                <td>
                    <span class="badge bg-${test.status === 'completed' ? 'success' : 'warning'}">
                        ${test.status}
                    </span>
                </td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-outline-info" onclick="showReportPreview(${test.id})">
                            <i class="fas fa-eye"></i> Preview
                        </button>
                        <button class="btn btn-sm btn-outline-primary" onclick="viewTest(${test.id})">
                            <i class="fas fa-file-alt"></i> View
                        </button>
                        <button class="btn btn-sm btn-outline-secondary" onclick="printReport(${test.id})">
                            <i class="fas fa-print"></i> Print
                        </button>
                        <button class="btn btn-sm btn-outline-success" onclick="exportReport(${test.id})">
                            <i class="fas fa-file-export"></i> Export
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // Update dashboard statistics
    const stats = {
        total: mockTests.length,
        completed: mockTests.filter(t => t.status === 'completed').length,
        pending: mockTests.filter(t => t.status === 'pending').length,
        today: mockTests.filter(t => t.date === new Date().toLocaleDateString('en-CA')).length
    };

    // Update statistics in the dashboard
    const statCards = document.querySelectorAll('.stat-card h2');
    if (statCards.length >= 4) {
        statCards[0].textContent = stats.total;
        statCards[1].textContent = stats.pending;
        statCards[2].textContent = stats.today;
        statCards[3].textContent = stats.completed;
    }

    // Update report statistics
    const reportStats = {
        total: mockTests.length,
        completed: mockTests.filter(t => t.status === 'completed').length,
        pending: mockTests.filter(t => t.status === 'pending').length,
        today: mockTests.filter(t => t.date === new Date().toLocaleDateString('en-CA')).length
    };

    // Update report statistics in the reports tab
    const reportStatElements = {
        total: document.getElementById('totalReports'),
        completed: document.getElementById('completedReports'),
        pending: document.getElementById('pendingReports'),
        today: document.getElementById('todayReports')
    };

    if (reportStatElements.total) reportStatElements.total.textContent = reportStats.total;
    if (reportStatElements.completed) reportStatElements.completed.textContent = reportStats.completed;
    if (reportStatElements.pending) reportStatElements.pending.textContent = reportStats.pending;
    if (reportStatElements.today) reportStatElements.today.textContent = reportStats.today;

    // Initialize Bootstrap tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
});

// Add event listeners for dashboard statistics cards
document.addEventListener('DOMContentLoaded', function() {
    // Add click handlers for dashboard stat cards
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach(card => {
        card.style.cursor = 'pointer';
        card.addEventListener('click', function() {
            const cardTitle = this.querySelector('h4').textContent.trim();
            showPatientList(cardTitle);
        });
    });
});

// Function to show patient list based on card type
const showPatientList = (cardType) => {
    // Get mock data
    const tests = storage.get('mockTests');
    const patients = storage.get('mockPatients');
    
    if (!tests || !patients) {
        showNotification('No data available', 'warning');
        return;
    }

    // Filter tests based on card type
    let filteredTests = [];
    const today = new Date().toLocaleDateString('en-CA');
    
    switch(cardType) {
        case 'Total Tests':
            filteredTests = tests;
            break;
        case 'Pending Tests':
            filteredTests = tests.filter(test => test.status === 'pending');
            break;
        case "Today's Patients":
            filteredTests = tests.filter(test => test.date === today);
            break;
        case 'Completed':
            filteredTests = tests.filter(test => test.status === 'completed');
            break;
    }

    // Create modal for patient list
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = 'patientListModal';
    modal.innerHTML = `
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">${cardType} - Patient List</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th>Patient Name</th>
                                    <th>Test Type</th>
                                    <th>Date</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${filteredTests.map(test => {
                                    const patient = patients.find(p => p.id === test.patient_id);
                                    return `
                                        <tr>
                                            <td>${patient ? patient.name : 'Unknown'}</td>
                                            <td>${test.test_type}</td>
                                            <td>${new Date(test.date).toLocaleDateString()}</td>
                                            <td>
                                                <span class="badge bg-${test.status === 'completed' ? 'success' : 'warning'}">
                                                    ${test.status}
                                                </span>
                                            </td>
                                            <td>
                                                <div class="btn-group">
                                                    <button class="btn btn-sm btn-outline-primary" onclick="viewTest(${test.id})">
                                                        <i class="fas fa-eye"></i> View
                                                    </button>
                                                    <button class="btn btn-sm btn-outline-secondary" onclick="printReport(${test.id})">
                                                        <i class="fas fa-print"></i> Print
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    <button type="button" class="btn btn-primary" onclick="exportPatientList('${cardType}')">
                        <i class="fas fa-file-export"></i> Export List
                    </button>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('patientListModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Add modal to document and show it
    document.body.appendChild(modal);
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
};

// Function to export patient list
const exportPatientList = (cardType) => {
    try {
        const tests = storage.get('mockTests');
        const patients = storage.get('mockPatients');
        
        if (!tests || !patients) {
            throw new Error('No data available');
        }

        // Filter tests based on card type
        let filteredTests = [];
        const today = new Date().toLocaleDateString('en-CA');
        
        switch(cardType) {
            case 'Total Tests':
                filteredTests = tests;
                break;
            case 'Pending Tests':
                filteredTests = tests.filter(test => test.status === 'pending');
                break;
            case "Today's Patients":
                filteredTests = tests.filter(test => test.date === today);
                break;
            case 'Completed':
                filteredTests = tests.filter(test => test.status === 'completed');
                break;
        }

        // Create CSV content
        const headers = ['Patient Name', 'Test Type', 'Date', 'Status'];
        const rows = filteredTests.map(test => {
            const patient = patients.find(p => p.id === test.patient_id);
            return [
                patient ? patient.name : 'Unknown',
                test.test_type,
                new Date(test.date).toLocaleDateString(),
                test.status
            ];
        });

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        // Create and trigger download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${cardType.toLowerCase().replace(/\s+/g, '-')}-list.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();

        showNotification('List exported successfully', 'success');
    } catch (error) {
        console.error('Error exporting list:', error);
        showNotification('Error exporting list', 'danger');
    }
};

// Add the missing viewReport function
const viewReport = async (reportId) => {
    try {
        // Get test data from mock data
        const tests = storage.get('mockTests');
        const test = tests.find(t => t.id === parseInt(reportId));
        
        if (test) {
            // Show report preview
            showReportPreview(reportId);
        } else {
            showNotification('Report not found', 'danger');
        }
    } catch (error) {
        console.error('Error viewing report:', error);
        showNotification('Error viewing report: ' + error.message, 'danger');
    }
};

// Add viewPatient function
const viewPatient = async (patientId) => {
    try {
        // Get patient data from mock data
        const patients = storage.get('mockPatients');
        const tests = storage.get('mockTests');
        
        if (!patients || !tests) {
            throw new Error('No data available');
        }

        const patient = patients.find(p => p.id === parseInt(patientId));
        if (!patient) {
            throw new Error('Patient not found');
        }

        // Get patient's tests
        const patientTests = tests.filter(t => t.patient_id === patient.id);

        // Create modal for patient details
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'viewPatientModal';
        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Patient Details</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row mb-4">
                            <div class="col-md-6">
                                <h6>Personal Information</h6>
                                <table class="table table-bordered">
                                    <tr>
                                        <th>Name</th>
                                        <td>${patient.name}</td>
                                    </tr>
                                    <tr>
                                        <th>Age</th>
                                        <td>${calculateAge(patient.dob)} years</td>
                                    </tr>
                                    <tr>
                                        <th>Gender</th>
                                        <td>${patient.gender}</td>
                                    </tr>
                                    <tr>
                                        <th>Contact</th>
                                        <td>${patient.contact_number}</td>
                                    </tr>
                                    <tr>
                                        <th>Email</th>
                                        <td>${patient.email || 'N/A'}</td>
                                    </tr>
                                    <tr>
                                        <th>Address</th>
                                        <td>${patient.address || 'N/A'}</td>
                                    </tr>
                                </table>
                            </div>
                            <div class="col-md-6">
                                <h6>Test History</h6>
                                <div class="table-responsive">
                                    <table class="table table-hover">
                                        <thead>
                                            <tr>
                                                <th>Test Type</th>
                                                <th>Date</th>
                                                <th>Status</th>
                                                <th>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${patientTests.map(test => `
                                                <tr>
                                                    <td>${test.test_type}</td>
                                                    <td>${new Date(test.date).toLocaleDateString()}</td>
                                                    <td>
                                                        <span class="badge bg-${test.status === 'completed' ? 'success' : 'warning'}">
                                                            ${test.status}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <button class="btn btn-sm btn-outline-primary" onclick="viewTest(${test.id})">
                                                            <i class="fas fa-eye"></i> View
                                                        </button>
                                                    </td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-primary" onclick="editPatient(${patient.id})">
                            <i class="fas fa-edit"></i> Edit Patient
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('viewPatientModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to document and show it
        document.body.appendChild(modal);
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();

    } catch (error) {
        console.error('Error viewing patient:', error);
        showNotification('Error viewing patient: ' + error.message, 'danger');
    }
};

// Add editPatient function (placeholder for now)
const editPatient = (patientId) => {
    showNotification('Edit patient functionality coming soon', 'info');
};

// Initialize database and load data
document.addEventListener('DOMContentLoaded', async function() {
    // Initialize database
    await db.init();
    
    // Generate and store mock data
    const { mockPatients, mockTests, mockTestTypes, mockAppointments, mockPayments } = generateMockData();
    
    // Load data into respective tables
    loadPatientsTable();
    loadTestsTable();
    loadAppointmentsTable();
    loadPaymentsTable();
    loadReportsTable();
    
    // Update dashboard statistics
    updateDashboardStats();
    
    // Initialize form selectors
    initializeFormSelectors();
});

// Initialize form selectors with data
async function initializeFormSelectors() {
    // Get all patients for selectors
    const patients = await db.patients.getAll();
    const patientSelectors = document.querySelectorAll('select[name="patientId"]');
    patientSelectors.forEach(selector => {
        selector.innerHTML = '<option value="">Select Patient</option>' +
            patients.map(p => `<option value="${p.id}">${p.fullName}</option>`).join('');
    });

    // Get all test types for selectors
    const testTypes = await db.testTypes.getAll();
    const testTypeSelectors = document.querySelectorAll('select[name="testType"]');
    testTypeSelectors.forEach(selector => {
        selector.innerHTML = '<option value="">Select Test Type</option>' +
            testTypes.map(t => `<option value="${t.id}">${t.name} - $${t.price}</option>`).join('');
    });

    // Get all tests for payment selector
    const tests = await db.tests.getAll();
    const testSelectors = document.querySelectorAll('select[name="testId"]');
    testSelectors.forEach(selector => {
        selector.innerHTML = '<option value="">Select Test</option>' +
            tests.map(t => `<option value="${t.id}">${t.testType} - ${t.testDate}</option>`).join('');
    });
}

// Load appointments table
async function loadAppointmentsTable() {
    const appointments = await db.appointments.getAll();
    const patients = await db.patients.getAll();
    const tests = await db.tests.getAll();
    
    const appointmentsTableBody = document.getElementById('appointmentsTableBody');
    if (appointmentsTableBody) {
        appointmentsTableBody.innerHTML = appointments.map(appointment => {
            const patient = patients.find(p => p.id === appointment.patientId);
            const test = tests.find(t => t.id === appointment.testId);
            return `
                <tr>
                    <td>#${appointment.id}</td>
                    <td>${patient ? patient.fullName : 'N/A'}</td>
                    <td>${test ? test.testType : 'N/A'}</td>
                    <td>${appointment.appointmentDate}</td>
                    <td>${appointment.appointmentTime}</td>
                    <td>
                        <span class="badge bg-${appointment.status === 'Completed' ? 'success' : 'warning'}">
                            ${appointment.status}
                        </span>
                    </td>
                    <td>
                        <div class="btn-group">
                            <button class="btn btn-sm btn-outline-primary" onclick="viewAppointment(${appointment.id})">
                                <i class="fas fa-eye"></i> View
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteAppointment(${appointment.id})">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }
}

// Load payments table
async function loadPaymentsTable() {
    const payments = await db.payments.getAll();
    const tests = await db.tests.getAll();
    
    const paymentsTableBody = document.getElementById('paymentsTableBody');
    if (paymentsTableBody) {
        paymentsTableBody.innerHTML = payments.map(payment => {
            const test = tests.find(t => t.id === payment.testId);
            return `
                <tr>
                    <td>#${payment.id}</td>
                    <td>${test ? test.testType : 'N/A'}</td>
                    <td>$${payment.amount.toFixed(2)}</td>
                    <td>${new Date(payment.paymentDate).toLocaleDateString()}</td>
                    <td>${payment.paymentMethod}</td>
                    <td>
                        <span class="badge bg-${payment.status === 'Completed' ? 'success' : 'warning'}">
                            ${payment.status}
                        </span>
                    </td>
                    <td>
                        <div class="btn-group">
                            <button class="btn btn-sm btn-outline-primary" onclick="viewPayment(${payment.id})">
                                <i class="fas fa-eye"></i> View
                            </button>
                            <button class="btn btn-sm btn-outline-success" onclick="printReceipt(${payment.id})">
                                <i class="fas fa-print"></i> Receipt
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }
}

// Handle appointment submission
async function submitAppointment() {
    const form = document.getElementById('appointmentForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const formData = new FormData(form);
    const appointmentData = {
        patientId: parseInt(formData.get('patientId')),
        testId: parseInt(formData.get('testType')),
        appointmentDate: formData.get('appointmentDate'),
        appointmentTime: formData.get('appointmentTime'),
        notes: formData.get('notes')
    };

    try {
        await db.appointments.create(appointmentData);
        showNotification('Appointment scheduled successfully!', 'success');
        bootstrap.Modal.getInstance(document.getElementById('appointmentModal')).hide();
        loadAppointmentsTable();
        form.reset();
    } catch (error) {
        showNotification('Error scheduling appointment: ' + error.message, 'error');
    }
}

// Handle payment submission
async function submitPayment() {
    const form = document.getElementById('paymentForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const formData = new FormData(form);
    const paymentData = {
        testId: parseInt(formData.get('testId')),
        amount: parseFloat(formData.get('amount')),
        paymentMethod: formData.get('paymentMethod'),
        notes: formData.get('notes')
    };

    try {
        await db.payments.create(paymentData);
        showNotification('Payment processed successfully!', 'success');
        bootstrap.Modal.getInstance(document.getElementById('paymentModal')).hide();
        loadPaymentsTable();
        form.reset();
    } catch (error) {
        showNotification('Error processing payment: ' + error.message, 'error');
    }
}

// View appointment details
async function viewAppointment(id) {
    const appointment = await db.appointments.getById(id);
    if (!appointment) {
        showNotification('Appointment not found', 'error');
        return;
    }

    const patient = await db.patients.getById(appointment.patientId);
    const test = await db.tests.getById(appointment.testId);

    const modal = new bootstrap.Modal(document.getElementById('viewAppointmentModal'));
    document.getElementById('viewAppointmentModal').querySelector('.modal-body').innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <h6>Patient Information</h6>
                <p>Name: ${patient.fullName}</p>
                <p>Contact: ${patient.contactNumber}</p>
            </div>
            <div class="col-md-6">
                <h6>Appointment Details</h6>
                <p>Date: ${appointment.appointmentDate}</p>
                <p>Time: ${appointment.appointmentTime}</p>
                <p>Status: ${appointment.status}</p>
            </div>
        </div>
        <div class="mt-3">
            <h6>Test Information</h6>
            <p>Type: ${test.testType}</p>
            <p>Notes: ${appointment.notes || 'None'}</p>
        </div>
    `;
    modal.show();
}

// View payment details
async function viewPayment(id) {
    const payment = await db.payments.getById(id);
    if (!payment) {
        showNotification('Payment not found', 'error');
        return;
    }

    const test = await db.tests.getById(payment.testId);
    const patient = await db.patients.getById(test.patientId);

    const modal = new bootstrap.Modal(document.getElementById('viewPaymentModal'));
    document.getElementById('viewPaymentModal').querySelector('.modal-body').innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <h6>Payment Information</h6>
                <p>Amount: $${payment.amount.toFixed(2)}</p>
                <p>Method: ${payment.paymentMethod}</p>
                <p>Status: ${payment.status}</p>
                <p>Date: ${new Date(payment.paymentDate).toLocaleDateString()}</p>
            </div>
            <div class="col-md-6">
                <h6>Test Information</h6>
                <p>Type: ${test.testType}</p>
                <p>Patient: ${patient.fullName}</p>
            </div>
        </div>
        <div class="mt-3">
            <h6>Transaction Details</h6>
            <p>Transaction ID: ${payment.transactionId}</p>
            <p>Notes: ${payment.notes || 'None'}</p>
        </div>
    `;
    modal.show();
}

// Print payment receipt
async function printReceipt(id) {
    const payment = await db.payments.getById(id);
    if (!payment) {
        showNotification('Payment not found', 'error');
        return;
    }

    const test = await db.tests.getById(payment.testId);
    const patient = await db.patients.getById(test.patientId);

    const receiptWindow = window.open('', '_blank');
    receiptWindow.document.write(`
        <html>
        <head>
            <title>Payment Receipt</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                .header { text-align: center; margin-bottom: 20px; }
                .details { margin-bottom: 20px; }
                .footer { text-align: center; margin-top: 40px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h2>SAEED LABORATORY</h2>
                <p>Payment Receipt</p>
            </div>
            <div class="details">
                <p><strong>Receipt No:</strong> ${payment.transactionId}</p>
                <p><strong>Date:</strong> ${new Date(payment.paymentDate).toLocaleDateString()}</p>
                <p><strong>Patient:</strong> ${patient.fullName}</p>
                <p><strong>Test:</strong> ${test.testType}</p>
                <p><strong>Amount:</strong> $${payment.amount.toFixed(2)}</p>
                <p><strong>Payment Method:</strong> ${payment.paymentMethod}</p>
            </div>
            <div class="footer">
                <p>Thank you for your business!</p>
                <p>SAEED LABORATORY</p>
            </div>
        </body>
        </html>
    `);
    receiptWindow.document.close();
    receiptWindow.print();
}

// Delete appointment
async function deleteAppointment(id) {
    if (!confirm('Are you sure you want to delete this appointment?')) {
        return;
    }

    try {
        await db.appointments.delete(id);
        showNotification('Appointment deleted successfully!', 'success');
        loadAppointmentsTable();
    } catch (error) {
        showNotification('Error deleting appointment: ' + error.message, 'error');
    }
}

// Update test amount when selected in payment form
document.querySelector('select[name="testId"]')?.addEventListener('change', async function() {
    const testId = this.value;
    if (!testId) return;

    const test = await db.tests.getById(parseInt(testId));
    const testType = await db.testTypes.getById(test.testType);
    if (testType) {
        document.querySelector('input[name="amount"]').value = testType.price;
    }
});