const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const multer = require('multer');
const { postToAllPlatforms } = require('./services/external-postings');
const settingsRoutes = require('./routes/settings');
const fs = require('fs');
const CandidateMatcher = require('./AI_model/CandidateMatcher');
require('dotenv').config();

const app = express();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, 'frontend', 'resumes'))
    },
    filename: function (req, file, cb) {
        // Create a more structured filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `resume_${uniqueSuffix}${ext}`);
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['.pdf', '.doc', '.docx'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF and Word documents are allowed.'));
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// More permissive CORS configuration
app.use(cors({
    origin: ['http://localhost:5500', 'http://127.0.0.1:5500', 'http://localhost:3000', 'null'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'frontend')));

// Dedicated route for resume files with error handling
app.get('/resumes/:filename', (req, res) => {
    try {
        const resumePath = path.join(__dirname, 'frontend', 'resumes', req.params.filename);
        // Check if file exists
        if (!fs.existsSync(resumePath)) {
            console.error(`Resume file not found: ${resumePath}`);
            // Try alternative path
            const altPath = path.join(__dirname, 'resumes', req.params.filename);
            if (!fs.existsSync(altPath)) {
                return res.status(404).json({ error: 'Resume file not found' });
            }
            // Use alternative path if found
            const fileStream = fs.createReadStream(altPath);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'inline; filename=' + req.params.filename);
            return fileStream.pipe(res);
        }
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename=' + req.params.filename);
        const fileStream = fs.createReadStream(resumePath);
        fileStream.pipe(res);
    } catch (error) {
        console.error('Error serving resume file:', error);
        res.status(500).json({ error: 'Error serving resume file', details: error.message });
    }
});

// Use settings routes
app.use('/api', settingsRoutes);

// MongoDB connection with retry logic
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/Innovation';
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
    experience: { type: Number, required: true },
    education: { type: String, required: true },
    location: { type: String, required: true },
    skills: { type: String, required: true },
    resume: { type: String, required: true }, // Path to resume file
    status: { type: String, default: 'Pending' },
    applied_at: { type: Date, default: Date.now },
    applied_for: { type: mongoose.Schema.Types.ObjectId, ref: 'Vacancy' }, // Reference to the vacancy
    current_position: String
}, { timestamps: true });

const Candidate = mongoose.model('Candidate', candidateSchema);

// Define Vacancy Schema
const vacancySchema = new mongoose.Schema({
    title: { type: String, required: true },
    company: { type: String, required: true },
    location: { type: String, required: true },
    type: { type: String, required: true }, // Full-time, Part-time, Contract, etc.
    description: { type: String, required: true },
    requirements: { type: String, required: true },
    responsibilities: { type: String, required: true },
    skills_required: [String],
    experience_level: { type: String, required: true }, // Entry, Mid, Senior, etc.
    salary_range: {
        min: Number,
        max: Number,
        currency: { type: String, default: 'MXN' }
    },
    benefits: [String],
    application_deadline: Date,
    remote_option: { type: Boolean, default: false },
    status: { type: String, default: 'Active' }, // Active, Filled, Closed
    external_postings: {
        linkedin: { type: String }, // LinkedIn post URL
        occ: { type: String }      // OCC post URL
    },
    created_by: { type: String, required: true },
    department: { type: String, required: true }
}, { timestamps: true });

const Vacancy = mongoose.model('Vacancy', vacancySchema);

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

// Update candidate status
app.put('/api/candidates/:id/status', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            throw new Error('MongoDB is not connected. Please try again later.');
        }

        const updatedCandidate = await Candidate.findByIdAndUpdate(
            req.params.id,
            { status: req.body.status },
            { new: true }
        );

        if (!updatedCandidate) {
            return res.status(404).json({ error: 'Candidate not found' });
        }

        console.log(`Successfully updated status for candidate ${req.params.id} to ${req.body.status}`);
        res.json(updatedCandidate);
    } catch (err) {
        console.error('Error updating candidate status:', err);
        res.status(500).json({ 
            error: 'Error updating candidate status',
            details: err.message 
        });
    }
});

// Vacancy API Routes
app.get('/api/vacancies', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            throw new Error('MongoDB is not connected. Please try again later.');
        }

        const vacancies = await Vacancy.find({ status: 'Active' });
        console.log(`Successfully fetched ${vacancies.length} vacancies`);
        res.json(vacancies);
    } catch (err) {
        console.error('Error fetching vacancies:', err);
        res.status(500).json({ 
            error: 'Error fetching vacancies',
            details: err.message,
            mongoStatus: mongoose.connection.readyState
        });
    }
});

app.post('/api/vacancies', async (req, res) => {
    try {
        const newVacancy = new Vacancy(req.body);
        await newVacancy.save();
        
        // Post to external platforms
        const externalPostings = await postToAllPlatforms(newVacancy);
        
        if (externalPostings.success) {
            // Update the vacancy with external posting URLs
            const platforms = externalPostings.platforms;
            newVacancy.external_postings = {
                linkedin: platforms.linkedin.success ? platforms.linkedin.url : null,
                occ: platforms.occ.success ? platforms.occ.url : null
            };
            await newVacancy.save();
        }

        res.status(201).json({
            vacancy: newVacancy,
            external_postings: externalPostings
        });
    } catch (err) {
        console.error('Error creating vacancy:', err);
        res.status(500).json({ 
            error: 'Error creating vacancy',
            details: err.message 
        });
    }
});

app.put('/api/vacancies/:id', async (req, res) => {
    try {
        const updatedVacancy = await Vacancy.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        res.json(updatedVacancy);
    } catch (err) {
        console.error('Error updating vacancy:', err);
        res.status(500).json({ 
            error: 'Error updating vacancy',
            details: err.message 
        });
    }
});

app.delete('/api/vacancies/:id', async (req, res) => {
    try {
        await Vacancy.findByIdAndDelete(req.params.id);
        res.status(204).send();
    } catch (err) {
        console.error('Error deleting vacancy:', err);
        res.status(500).json({ 
            error: 'Error deleting vacancy',
            details: err.message 
        });
    }
});

// Get candidates for a specific vacancy
app.get('/api/vacancies/:id/candidates', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            throw new Error('MongoDB is not connected. Please try again later.');
        }

        const candidates = await Candidate.find({ 
            applied_for: req.params.id
        })
        .select('first_name last_name email phone linkedin experience skills status resume')
        .populate('applied_for', 'title');

        console.log(`Successfully fetched ${candidates.length} candidates for vacancy ${req.params.id}`);
        res.json(candidates);
    } catch (err) {
        console.error('Error fetching candidates for vacancy:', err);
        res.status(500).json({ 
            error: 'Error fetching candidates',
            details: err.message 
        });
    }
});

// Get top candidates for a specific vacancy
app.get('/api/vacancies/:id/top-candidates', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            throw new Error('MongoDB is not connected. Please try again later.');
        }

        // Get the vacancy details
        const vacancy = await Vacancy.findById(req.params.id);
        if (!vacancy) {
            return res.status(404).json({ error: 'Vacancy not found' });
        }

        // Get all candidates for this vacancy
        const candidates = await Candidate.find({ 
            applied_for: req.params.id
        });

        // Initialize the AI model
        const matcher = new CandidateMatcher();
        
        // Calculate match scores for all candidates
        const candidatesWithScores = await Promise.all(candidates.map(async (candidate) => {
            const matchResult = await matcher.match_candidate(
                {
                    id: candidate._id,
                    description: candidate.current_position,
                    skills: candidate.skills,
                    experience: candidate.experience.toString(),
                    education: candidate.education
                },
                {
                    id: vacancy._id,
                    description: vacancy.description,
                    skills: vacancy.skills_required.join(', '),
                    experience: vacancy.experience_level,
                    education: vacancy.requirements
                }
            );

            return {
                ...candidate.toObject(),
                match_score: matchResult.match_score
            };
        }));

        // Sort candidates by match score
        candidatesWithScores.sort((a, b) => b.match_score - a.match_score);

        // Get top 30% of candidates
        const topCount = Math.ceil(candidatesWithScores.length * 0.3);
        const topCandidates = candidatesWithScores.slice(0, topCount);

        console.log(`Successfully fetched top ${topCandidates.length} candidates for vacancy ${req.params.id}`);
        res.json(topCandidates);
    } catch (err) {
        console.error('Error fetching top candidates for vacancy:', err);
        res.status(500).json({ 
            error: 'Error fetching top candidates',
            details: err.message 
        });
    }
});

// Resume upload endpoint
app.post('/api/upload-resume', upload.single('resume'), (req, res) => {
    try {
        if (!req.file) {
            throw new Error('No file uploaded');
        }
        res.json({ 
            filename: req.file.filename,
            message: 'File uploaded successfully' 
        });
    } catch (err) {
        console.error('Error uploading file:', err);
        res.status(400).json({ 
            error: 'Error uploading file',
            details: err.message 
        });
    }
});

// Assign vacancy to candidate
app.put('/api/candidates/:id/assign-vacancy', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            throw new Error('MongoDB is not connected. Please try again later.');
        }

        const updatedCandidate = await Candidate.findByIdAndUpdate(
            req.params.id,
            { 
                applied_for: req.body.vacancyId,
                status: 'Pending' // Reset status when reassigning
            },
            { new: true }
        ).populate('applied_for', 'title');

        if (!updatedCandidate) {
            return res.status(404).json({ error: 'Candidate not found' });
        }

        console.log(`Successfully assigned vacancy ${req.body.vacancyId} to candidate ${req.params.id}`);
        res.json(updatedCandidate);
    } catch (err) {
        console.error('Error assigning vacancy to candidate:', err);
        res.status(500).json({ 
            error: 'Error assigning vacancy',
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

const PORT = 3000;
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