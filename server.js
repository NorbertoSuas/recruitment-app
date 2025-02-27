const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, 'frontend')));

// Update these credentials to match your MySQL setup
const db = mysql.createConnection({
    host: '127.0.0.1:3306',
    user: 'root',
    password: '3088780Nsh.',
    database: 'candidatos'  // Make sure this matches your database name
});



db.connect(err => {
    if (err) {
        console.error('Database connection failed:', err.stack);
        return;
    }
    console.log('Connected to database.');
});

// Update the query to match your candidates table structure
app.get('/api/candidates', (req, res) => {
    const query = 'SELECT * FROM candidatos';  // Update table name if different
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching candidates:', err);
            return res.status(500).json({ error: 'Error fetching candidates' });
        }
        res.json(results);
    });
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

const PORT = process.env.PORT || 5500;  // Changed port to 5500
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to view the website`);
}); 