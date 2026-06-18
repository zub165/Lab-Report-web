// Database operations using fetch API to communicate with the server
const db = {
    // Base URL for API endpoints - use relative URL for local development
    baseUrl: window.location.origin + '/api',

    // Initialize
    async init() {
        try {
            // Test connection
            const response = await fetch(`${this.baseUrl}/health`);
            if (!response.ok) throw new Error('API connection failed');
            console.log('API connection initialized');
            return true;
        } catch (error) {
            console.error('API initialization error:', error);
            // Fallback to mock data if API is not available
            console.log('Falling back to mock data');
            return false;
        }
    },

    // Patient operations
    patients: {
        async getAll() {
            try {
                const response = await fetch(`${db.baseUrl}/patients`);
                if (!response.ok) throw new Error('Failed to fetch patients');
                return response.json();
            } catch (error) {
                console.error('Error fetching patients:', error);
                // Return mock data as fallback
                return storage.get('mockPatients') || [];
            }
        },

        async getById(id) {
            try {
                const response = await fetch(`${db.baseUrl}/patients/${id}`);
                if (!response.ok) throw new Error('Failed to fetch patient');
                return response.json();
            } catch (error) {
                console.error('Error fetching patient:', error);
                // Return mock data as fallback
                const patients = storage.get('mockPatients') || [];
                return patients.find(p => p.id === parseInt(id));
            }
        },

        async create(patientData) {
            try {
                const response = await fetch(`${db.baseUrl}/patients`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(patientData)
                });
                if (!response.ok) throw new Error('Failed to create patient');
                return response.json();
            } catch (error) {
                console.error('Error creating patient:', error);
                // Create in mock data as fallback
                const patients = storage.get('mockPatients') || [];
                const newPatient = {
                    id: patients.length + 1,
                    ...patientData,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                patients.push(newPatient);
                storage.save('mockPatients', patients);
                return newPatient;
            }
        },

        async update(id, patientData) {
            try {
                const response = await fetch(`${db.baseUrl}/patients/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(patientData)
                });
                if (!response.ok) throw new Error('Failed to update patient');
                return response.json();
            } catch (error) {
                console.error('Error updating patient:', error);
                // Update in mock data as fallback
                const patients = storage.get('mockPatients') || [];
                const index = patients.findIndex(p => p.id === parseInt(id));
                if (index !== -1) {
                    patients[index] = { ...patients[index], ...patientData, updatedAt: new Date().toISOString() };
                    storage.save('mockPatients', patients);
                    return patients[index];
                }
                throw error;
            }
        },

        async delete(id) {
            try {
                const response = await fetch(`${db.baseUrl}/patients/${id}`, {
                    method: 'DELETE'
                });
                if (!response.ok) throw new Error('Failed to delete patient');
                return true;
            } catch (error) {
                console.error('Error deleting patient:', error);
                // Delete from mock data as fallback
                const patients = storage.get('mockPatients') || [];
                const filteredPatients = patients.filter(p => p.id !== parseInt(id));
                storage.save('mockPatients', filteredPatients);
                return true;
            }
        }
    },

    // Test operations
    tests: {
        async getAll() {
            try {
                const response = await fetch(`${db.baseUrl}/tests`);
                if (!response.ok) throw new Error('Failed to fetch tests');
                return response.json();
            } catch (error) {
                console.error('Error fetching tests:', error);
                // Return mock data as fallback
                return storage.get('mockTests') || [];
            }
        },

        async getById(id) {
            try {
                const response = await fetch(`${db.baseUrl}/tests/${id}`);
                if (!response.ok) throw new Error('Failed to fetch test');
                return response.json();
            } catch (error) {
                console.error('Error fetching test:', error);
                // Return mock data as fallback
                const tests = storage.get('mockTests') || [];
                return tests.find(t => t.id === parseInt(id));
            }
        },

        async create(testData) {
            try {
                const response = await fetch(`${db.baseUrl}/tests`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(testData)
                });
                if (!response.ok) throw new Error('Failed to create test');
                return response.json();
            } catch (error) {
                console.error('Error creating test:', error);
                // Create in mock data as fallback
                const tests = storage.get('mockTests') || [];
                const newTest = {
                    id: tests.length + 1,
                    ...testData,
                    status: 'Pending',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                tests.push(newTest);
                storage.save('mockTests', tests);
                return newTest;
            }
        },

        async update(id, testData) {
            try {
                const response = await fetch(`${db.baseUrl}/tests/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(testData)
                });
                if (!response.ok) throw new Error('Failed to update test');
                return response.json();
            } catch (error) {
                console.error('Error updating test:', error);
                // Update in mock data as fallback
                const tests = storage.get('mockTests') || [];
                const index = tests.findIndex(t => t.id === parseInt(id));
                if (index !== -1) {
                    tests[index] = { ...tests[index], ...testData, updatedAt: new Date().toISOString() };
                    storage.save('mockTests', tests);
                    return tests[index];
                }
                throw error;
            }
        },

        async delete(id) {
            try {
                const response = await fetch(`${db.baseUrl}/tests/${id}`, {
                    method: 'DELETE'
                });
                if (!response.ok) throw new Error('Failed to delete test');
                return true;
            } catch (error) {
                console.error('Error deleting test:', error);
                // Delete from mock data as fallback
                const tests = storage.get('mockTests') || [];
                const filteredTests = tests.filter(t => t.id !== parseInt(id));
                storage.save('mockTests', filteredTests);
                return true;
            }
        }
    },

    // Test Types operations
    testTypes: {
        async getAll() {
            try {
                const response = await fetch(`${db.baseUrl}/test-types`);
                if (!response.ok) throw new Error('Failed to fetch test types');
                return response.json();
            } catch (error) {
                console.error('Error fetching test types:', error);
                // Return mock data as fallback
                return storage.get('mockTestTypes') || [];
            }
        },

        async getById(id) {
            try {
                const response = await fetch(`${db.baseUrl}/test-types/${id}`);
                if (!response.ok) throw new Error('Failed to fetch test type');
                return response.json();
            } catch (error) {
                console.error('Error fetching test type:', error);
                // Return mock data as fallback
                const types = storage.get('mockTestTypes') || [];
                return types.find(t => t.id === parseInt(id));
            }
        }
    },

    // Appointment operations
    appointments: {
        async getAll() {
            return storage.get('mockAppointments') || [];
        },

        async getById(id) {
            const appointments = await this.getAll();
            return appointments.find(a => a.id === id);
        },

        async create(appointmentData) {
            const appointments = await this.getAll();
            const newAppointment = {
                id: appointments.length + 1,
                ...appointmentData,
                status: 'Scheduled',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            appointments.push(newAppointment);
            storage.save('mockAppointments', appointments);
            return newAppointment;
        },

        async update(id, appointmentData) {
            const appointments = await this.getAll();
            const index = appointments.findIndex(a => a.id === id);
            if (index === -1) return null;
            
            appointments[index] = {
                ...appointments[index],
                ...appointmentData,
                updatedAt: new Date().toISOString()
            };
            storage.save('mockAppointments', appointments);
            return appointments[index];
        },

        async delete(id) {
            const appointments = await this.getAll();
            const filteredAppointments = appointments.filter(a => a.id !== id);
            storage.save('mockAppointments', filteredAppointments);
            return true;
        }
    },

    // Payment operations
    payments: {
        async getAll() {
            return storage.get('mockPayments') || [];
        },

        async getById(id) {
            const payments = await this.getAll();
            return payments.find(p => p.id === id);
        },

        async create(paymentData) {
            const payments = await this.getAll();
            const newPayment = {
                id: payments.length + 1,
                ...paymentData,
                status: 'Pending',
                paymentDate: new Date().toISOString(),
                transactionId: `TXN${Date.now()}`
            };
            payments.push(newPayment);
            storage.save('mockPayments', payments);
            return newPayment;
        },

        async update(id, paymentData) {
            const payments = await this.getAll();
            const index = payments.findIndex(p => p.id === id);
            if (index === -1) return null;
            
            payments[index] = {
                ...payments[index],
                ...paymentData,
                updatedAt: new Date().toISOString()
            };
            storage.save('mockPayments', payments);
            return payments[index];
        },

        async delete(id) {
            const payments = await this.getAll();
            const filteredPayments = payments.filter(p => p.id !== id);
            storage.save('mockPayments', filteredPayments);
            return true;
        }
    },

    // Statistics operations
    stats: {
        async getDashboardStats() {
            try {
                const response = await fetch(`${db.baseUrl}/stats`);
                if (!response.ok) throw new Error('Failed to fetch dashboard stats');
                return response.json();
            } catch (error) {
                console.error('Error fetching dashboard stats:', error);
                // Return mock stats as fallback
                const tests = storage.get('mockTests') || [];
                const today = new Date().toISOString().split('T')[0];
                return {
                    totalTests: tests.length,
                    pendingTests: tests.filter(t => t.status === 'Pending').length,
                    todayPatients: tests.filter(t => t.testDate === today).length,
                    completedTests: tests.filter(t => t.status === 'Completed').length
                };
            }
        }
    },

    // System operations
    system: {
        async getStatus() {
            try {
                const response = await fetch(`${db.baseUrl}/system/status`);
                if (!response.ok) throw new Error('Failed to fetch system status');
                return response.json();
            } catch (error) {
                console.error('Error fetching system status:', error);
                // Return mock status as fallback
                return {
                    database: false,
                    printer: true,
                    updates: false
                };
            }
        }
    }
};

// Make db available globally
window.db = db; 