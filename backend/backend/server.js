const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
// Update the path to point to the frontend folder
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Rest of your server code...

// Update the catch-all route path
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// Rest of your server code... 