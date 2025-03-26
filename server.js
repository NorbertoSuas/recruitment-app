const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors({
    origin: 'http://127.0.0.1:5500',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));
app.use(express.static(path.join(__dirname, 'frontend')));

// MySQL connection config
const db = mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '3088780Nsh.',
    database: 'candidatos'
});

// Connection error handling
db.connect(err => {
    if (err) {
        console.error('Database connection failed:', err);
        console.error('Error code:', err.code);
        console.error('Error message:', err.message);
        return;
    }
    console.log('Connected to database successfully.');
});

// API Routes - Must come BEFORE the catch-all route
app.get('/api/candidates', (req, res) => {
    console.log('Attempting to fetch candidates...');
    const query = 'SELECT * FROM candidates_candidate';
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Database query error:', err);
            console.error('Query:', query);
            return res.status(500).json({ 
                error: 'Error fetching candidates',
                details: err.message 
            });
        }
        console.log('Successfully fetched candidates:', results);
        res.json(results);
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Express error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
});

// Catch-all route - Must come AFTER API routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

const PORT = process.env.PORT || 5500;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to view the website`);
});

// Handle process errors
process.on('unhandledRejection', (err) => {
    console.error('Unhandled rejection:', err);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
}); 