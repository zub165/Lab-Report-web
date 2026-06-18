require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const path = require('path');
const app = express();
const port = process.env.PORT || 3003;

// Middleware
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true
}));
app.use(express.json());
app.use(express.static('.'));

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || null,
    database: process.env.DB_NAME || 'Medi_Lab',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: process.env.DB_SSL === 'true' ? {
        rejectUnauthorized: false
    } : false
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: 'healthy', environment: process.env.NODE_ENV });
    } catch (error) {
        console.error('Health check failed:', error);
        res.status(500).json({ error: 'Database connection failed' });
    }
});

// Patient endpoints
app.get('/api/patients', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM Patients ORDER BY FullName');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/patients/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM Patients WHERE PatientID = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Patient not found' });
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/patients', async (req, res) => {
    try {
        const { name, dob, gender, contact_number, email, address } = req.body;
        const [result] = await pool.query(
            'INSERT INTO Patients (FullName, DateOfBirth, Gender, ContactNumber, Email, Address) VALUES (?, ?, ?, ?, ?, ?)',
            [name, dob, gender, contact_number, email, address]
        );
        res.status(201).json({ PatientID: result.insertId, ...req.body });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/patients/:id', async (req, res) => {
    try {
        const { name, dob, gender, contact_number, email, address } = req.body;
        await pool.query(
            'UPDATE Patients SET FullName = ?, DateOfBirth = ?, Gender = ?, ContactNumber = ?, Email = ?, Address = ? WHERE PatientID = ?',
            [name, dob, gender, contact_number, email, address, req.params.id]
        );
        const [rows] = await pool.query('SELECT * FROM Patients WHERE PatientID = ?', [req.params.id]);
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/patients/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM Patients WHERE PatientID = ?', [req.params.id]);
        res.json({ message: 'Patient deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Test endpoints
app.get('/api/tests', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT t.*, p.FullName as patient_name 
            FROM Tests t 
            JOIN Patients p ON t.PatientID = p.PatientID 
            ORDER BY t.TestDate DESC
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/tests/:id', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT t.*, p.FullName as patient_name 
            FROM Tests t 
            JOIN Patients p ON t.PatientID = p.PatientID 
            WHERE t.TestID = ?
        `, [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Test not found' });
        
        // Get test results
        const [results] = await pool.query('SELECT * FROM TestResults WHERE TestID = ?', [req.params.id]);
        rows[0].results = results;
        
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/tests', async (req, res) => {
    try {
        const { patient_id, test_type, date, priority, notes } = req.body;
        const [result] = await pool.query(
            'INSERT INTO Tests (PatientID, TestType, TestDate, Priority, Notes) VALUES (?, ?, ?, ?, ?)',
            [patient_id, test_type, date, priority, notes]
        );
        const [rows] = await pool.query(`
            SELECT t.*, p.FullName as patient_name 
            FROM Tests t 
            JOIN Patients p ON t.PatientID = p.PatientID 
            WHERE t.TestID = ?
        `, [result.insertId]);
        res.status(201).json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/tests/:id', async (req, res) => {
    try {
        const { patient_id, test_type, date, priority, status, notes } = req.body;
        await pool.query(
            'UPDATE Tests SET PatientID = ?, TestType = ?, TestDate = ?, Priority = ?, Status = ?, Notes = ? WHERE TestID = ?',
            [patient_id, test_type, date, priority, status, notes, req.params.id]
        );
        const [rows] = await pool.query(`
            SELECT t.*, p.FullName as patient_name 
            FROM Tests t 
            JOIN Patients p ON t.PatientID = p.PatientID 
            WHERE t.TestID = ?
        `, [req.params.id]);
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.patch('/api/tests/:id', async (req, res) => {
    try {
        const { status } = req.body;
        await pool.query('UPDATE Tests SET Status = ? WHERE TestID = ?', [status, req.params.id]);
        const [rows] = await pool.query(`
            SELECT t.*, p.FullName as patient_name 
            FROM Tests t 
            JOIN Patients p ON t.PatientID = p.PatientID 
            WHERE t.TestID = ?
        `, [req.params.id]);
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/tests/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM Tests WHERE TestID = ?', [req.params.id]);
        res.json({ message: 'Test deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Test Types endpoints
app.get('/api/test-types', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM TestTypes ORDER BY TestName');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/test-types', async (req, res) => {
    try {
        const { TestName, Description, Price } = req.body;
        const [result] = await pool.query(
            'INSERT INTO TestTypes (TestName, Description, Price) VALUES (?, ?, ?)',
            [TestName, Description, Price]
        );
        res.status(201).json({ 
            TestTypeID: result.insertId,
            TestName,
            Description,
            Price
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/test-types/:id', async (req, res) => {
    try {
        const { TestName, Description, Price } = req.body;
        await pool.query(
            'UPDATE TestTypes SET TestName = ?, Description = ?, Price = ? WHERE TestTypeID = ?',
            [TestName, Description, Price, req.params.id]
        );
        const [rows] = await pool.query('SELECT * FROM TestTypes WHERE TestTypeID = ?', [req.params.id]);
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/test-types/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM TestResults WHERE TestID IN (SELECT TestID FROM Tests WHERE TestType = (SELECT TestName FROM TestTypes WHERE TestTypeID = ?))', [req.params.id]);
        await pool.query('DELETE FROM Tests WHERE TestType = (SELECT TestName FROM TestTypes WHERE TestTypeID = ?)', [req.params.id]);
        await pool.query('DELETE FROM TestTypes WHERE TestTypeID = ?', [req.params.id]);
        res.json({ message: 'Test type and associated data deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Test Results endpoints
app.get('/api/test-results/:testId', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM TestResults WHERE TestID = ?', [req.params.testId]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/test-results', async (req, res) => {
    try {
        const { TestID, Parameter, Value, Unit, ReferenceRange, IsAbnormal, Notes } = req.body;
        const [result] = await pool.query(
            'INSERT INTO TestResults (TestID, Parameter, Value, Unit, ReferenceRange, IsAbnormal, Notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [TestID, Parameter, Value, Unit, ReferenceRange, IsAbnormal, Notes]
        );
        res.status(201).json({ 
            ResultID: result.insertId,
            TestID,
            Parameter,
            Value,
            Unit,
            ReferenceRange,
            IsAbnormal,
            Notes
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Reports endpoints
app.get('/api/reports', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT t.*, p.FullName as patient_name 
            FROM Tests t 
            JOIN Patients p ON t.PatientID = p.PatientID 
            ORDER BY t.TestDate DESC
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/reports/:id', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT t.*, p.FullName as patient_name, p.DateOfBirth, p.Gender, p.ContactNumber
            FROM Tests t 
            JOIN Patients p ON t.PatientID = p.PatientID 
            WHERE t.TestID = ?
        `, [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Report not found' });
        
        // Get test results
        const [results] = await pool.query('SELECT * FROM TestResults WHERE TestID = ?', [req.params.id]);
        rows[0].results = results;
        
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Dashboard Statistics endpoint
app.get('/api/stats', async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        // Get total tests
        const [totalTests] = await pool.query('SELECT COUNT(*) as count FROM Tests');
        
        // Get pending tests
        const [pendingTests] = await pool.query("SELECT COUNT(*) as count FROM Tests WHERE Status = 'Pending'");
        
        // Get today's patients
        const [todayPatients] = await pool.query('SELECT COUNT(DISTINCT PatientID) as count FROM Tests WHERE DATE(TestDate) = ?', [today]);
        
        // Get completed tests
        const [completedTests] = await pool.query("SELECT COUNT(*) as count FROM Tests WHERE Status = 'Completed'");

        res.json({
            totalTests: totalTests[0].count,
            pendingTests: pendingTests[0].count,
            todayPatients: todayPatients[0].count,
            completedTests: completedTests[0].count
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Recent Tests endpoint
app.get('/api/tests/recent', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT t.*, p.FullName as patient_name 
            FROM Tests t 
            JOIN Patients p ON t.PatientID = p.PatientID 
            ORDER BY t.TestDate DESC 
            LIMIT 10
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Search endpoint
app.get('/api/search', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.json([]);
        
        const [rows] = await pool.query(`
            SELECT t.*, p.FullName as patient_name 
            FROM Tests t 
            JOIN Patients p ON t.PatientID = p.PatientID 
            WHERE p.FullName LIKE ? OR t.TestType LIKE ? OR t.TestID LIKE ?
            ORDER BY t.TestDate DESC
        `, [`%${q}%`, `%${q}%`, `%${q}%`]);
        
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// System status endpoint
app.get('/api/system/status', async (req, res) => {
    try {
        // Check database connection
        await pool.query('SELECT 1');
        
        res.json({
            database: true,
            printer: true, // Mock printer status
            updates: false // Mock update status
        });
    } catch (error) {
        res.json({
            database: false,
            printer: false,
            updates: false
        });
    }
});

// Settings endpoints
app.get('/api/settings', async (req, res) => {
    try {
        // Mock settings - in a real app, these would come from a database
        res.json({
            labName: 'SAEED LABORATORY',
            address: '123 Medical Center Dr, Healthcare City',
            contactNumber: '555-0126',
            email: 'info@saeedlab.com'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/settings', async (req, res) => {
    try {
        // Mock settings save - in a real app, these would be saved to a database
        res.json({ message: 'Settings saved successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Serve index.html for all routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 