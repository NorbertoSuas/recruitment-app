const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
const { PDFDocument } = require('pdf-lib');

// MongoDB connection
const MONGODB_URI = 'mongodb://localhost:27017/Innovation';

// Sample data arrays
const firstNames = ['John', 'Emma', 'Michael', 'Sophia', 'William', 'Olivia', 'James', 'Ava', 'Alexander', 'Isabella'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
const locations = ['New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Houston, TX', 'Phoenix, AZ', 'Philadelphia, PA'];
const skills = [
    'JavaScript, React, Node.js, MongoDB',
    'Python, Django, PostgreSQL, AWS',
    'Java, Spring Boot, MySQL, Docker',
    'C#, .NET, SQL Server, Azure',
    'PHP, Laravel, MySQL, Redis',
    'Ruby, Rails, PostgreSQL, Heroku'
];
const educationLevels = [
    'Bachelor in Computer Science, MIT',
    'Master in Software Engineering, Stanford',
    'Bachelor in Information Technology, Berkeley',
    'Master in Computer Engineering, Georgia Tech',
    'Bachelor in Software Development, Carnegie Mellon',
    'Master in Data Science, UCLA'
];
const experiences = [
    '5 years of full-stack development experience',
    '3 years of frontend development with React',
    '4 years of backend development with Node.js',
    '6 years of Java enterprise development',
    '3 years of Python development',
    '4 years of .NET development'
];

// Candidate Schema
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
    resume: { type: String, required: true },
    status: { type: String, default: 'Pending' },
    applied_at: { type: Date, default: Date.now }
}, { timestamps: true });

const Candidate = mongoose.model('Candidate', candidateSchema);

// Function to generate a random resume PDF
async function generateResume(candidateInfo) {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
    const { width, height } = page.getSize();
    
    page.drawText(`${candidateInfo.first_name} ${candidateInfo.last_name}`, {
        x: 50,
        y: height - 50,
        size: 20
    });
    
    page.drawText(`Email: ${candidateInfo.email}`, {
        x: 50,
        y: height - 80,
        size: 12
    });
    
    page.drawText(`Phone: ${candidateInfo.phone}`, {
        x: 50,
        y: height - 100,
        size: 12
    });
    
    page.drawText(`Education: ${candidateInfo.education}`, {
        x: 50,
        y: height - 140,
        size: 12
    });
    
    page.drawText(`Experience: ${candidateInfo.experience}`, {
        x: 50,
        y: height - 180,
        size: 12
    });
    
    page.drawText(`Skills: ${candidateInfo.skills}`, {
        x: 50,
        y: height - 220,
        size: 12
    });
    
    return await pdfDoc.save();
}

// Function to generate random candidate data
function generateRandomCandidate(index) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}@example.com`;
    const phone = `+1${Math.floor(Math.random() * 900 + 100)}${Math.floor(Math.random() * 900 + 100)}${Math.floor(Math.random() * 10000)}`;
    
    return {
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone: phone,
        linkedin: `https://linkedin.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}-${index}`,
        experience: experiences[Math.floor(Math.random() * experiences.length)],
        education: educationLevels[Math.floor(Math.random() * educationLevels.length)],
        location: locations[Math.floor(Math.random() * locations.length)],
        skills: skills[Math.floor(Math.random() * skills.length)],
        status: Math.random() > 0.5 ? 'Pending' : 'Reviewed',
        applied_at: new Date(Date.now() - Math.floor(Math.random() * 90) * 24 * 60 * 60 * 1000)
    };
}

// Main function to generate and save candidates
async function generateCandidates() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');
        
        // Create resumes directory if it doesn't exist
        const resumesDir = path.join(__dirname, 'frontend', 'resumes');
        await fs.mkdir(resumesDir, { recursive: true });
        
        // Generate and save 100 candidates
        for (let i = 0; i < 100; i++) {
            const candidateData = generateRandomCandidate(i);
            
            // Generate and save PDF resume
            const pdfBytes = await generateResume(candidateData);
            const resumePath = path.join('resumes', `resume_${candidateData.first_name}_${candidateData.last_name}_${i}.pdf`);
            await fs.writeFile(path.join(__dirname, 'frontend', resumePath), pdfBytes);
            
            // Add resume path to candidate data
            candidateData.resume = resumePath;
            
            // Save candidate to database
            const candidate = new Candidate(candidateData);
            await candidate.save();
            console.log(`Created candidate ${i + 1}/100: ${candidateData.first_name} ${candidateData.last_name}`);
        }
        
        console.log('Successfully generated 100 candidates with resumes');
        process.exit(0);
    } catch (error) {
        console.error('Error generating candidates:', error);
        process.exit(1);
    }
}

generateCandidates(); 