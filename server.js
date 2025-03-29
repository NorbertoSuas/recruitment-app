const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// More permissive CORS configuration
app.use(cors());

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'frontend')));
app.use('/resumes', express.static(path.join(__dirname, 'frontend', 'resumes')));

// MongoDB connection with retry logic
const MONGODB_URI = 'mongodb://127.0.0.1:27017/Innovation';
const MAX_RETRIES = 5;
const RETRY_INTERVAL = 5000; // 5 seconds

async function connectWithRetry(retryCount = 0) {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB successfully');
        
        // Create indexes after successful connection
        const Candidate = mongoose.model('Candidate', candidateSchema);
        await Candidate.createIndexes();
        console.log('Database indexes created successfully');
        
    } catch (err) {
        console.error('MongoDB connection error:', err);
        if (retryCount < MAX_RETRIES) {
            console.log(`Retrying connection in ${RETRY_INTERVAL/1000} seconds... (Attempt ${retryCount + 1}/${MAX_RETRIES})`);
            setTimeout(() => connectWithRetry(retryCount + 1), RETRY_INTERVAL);
        } else {
            console.error('Max retry attempts reached. Please check if MongoDB is installed and running.');
            process.exit(1);
        }
    }
}

// Define Candidate Schema
const candidateSchema = new mongoose.Schema({
    first_name: { type: String, required: true },
    last_name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    linkedin: { type: String },
    experience: { type: String, required: true },
    education: { type: String, required: true },
    location: { type: String, required: true },
    skills: { type: String, required: true },
    resume: { type: String, required: true }, // Path to resume file
    status: { type: String, default: 'Pending' },
    applied_at: { type: Date, default: Date.now }
}, { timestamps: true });

const Candidate = mongoose.model('Candidate', candidateSchema);

// Health check endpoint
app.get('/api/health', (req, res) => {
    const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    res.json({
        status: 'ok',
        mongodb: mongoStatus,
        timestamp: new Date()
    });
});

// API Routes
app.get('/api/candidates', async (req, res) => {
    try {
        // Check MongoDB connection
        if (mongoose.connection.readyState !== 1) {
            throw new Error('MongoDB is not connected. Please try again later.');
        }

        console.log('Received GET request to /api/candidates');
        const candidates = await Candidate.find({});
        console.log(`Successfully fetched ${candidates.length} candidates`);
        res.json(candidates);
    } catch (err) {
        console.error('Error fetching candidates:', err);
        res.status(500).json({ 
            error: 'Error fetching candidates',
            details: err.message,
            mongoStatus: mongoose.connection.readyState
        });
    }
});

// Add new candidate
app.post('/api/candidates', async (req, res) => {
    try {
        const newCandidate = new Candidate(req.body);
        await newCandidate.save();
        res.status(201).json(newCandidate);
    } catch (err) {
        console.error('Error creating candidate:', err);
        res.status(500).json({ 
            error: 'Error creating candidate',
            details: err.message 
        });
    }
});

// Update candidate
app.put('/api/candidates/:id', async (req, res) => {
    try {
        const updatedCandidate = await Candidate.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        res.json(updatedCandidate);
    } catch (err) {
        console.error('Error updating candidate:', err);
        res.status(500).json({ 
            error: 'Error updating candidate',
            details: err.message 
        });
    }
});

// Delete candidate
app.delete('/api/candidates/:id', async (req, res) => {
    try {
        await Candidate.findByIdAndDelete(req.params.id);
        res.status(204).send();
    } catch (err) {
        console.error('Error deleting candidate:', err);
        res.status(500).json({ 
            error: 'Error deleting candidate',
            details: err.message 
        });
    }
});

// Error handler - Must come after all routes
app.use((err, req, res, next) => {
    console.error('Express error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
});

// Catch-all route - Must come after API routes but before error handler
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

const PORT = 8000;
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to view the website`);
    console.log(`API endpoints available at http://localhost:${PORT}/api/*`);
    
    // Start MongoDB connection
    connectWithRetry();
});

// Handle process errors
process.on('unhandledRejection', (err) => {
    console.error('Unhandled rejection:', err);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
}); 