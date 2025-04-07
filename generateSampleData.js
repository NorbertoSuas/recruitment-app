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

// Define vacancies
const vacancies = [
    {
        title: 'Senior Software Engineer',
        skills: [
            'JavaScript, React, Node.js, System Design',
            'Java, Spring Boot, Microservices, AWS',
            'Python, Django, Cloud Architecture, CI/CD'
        ]
    },
    {
        title: 'Product Manager',
        skills: [
            'Product Strategy, Agile, JIRA, Roadmapping',
            'User Research, Data Analytics, A/B Testing',
            'Stakeholder Management, Product Development'
        ]
    },
    {
        title: 'UX Designer',
        skills: [
            'Figma, Adobe XD, User Research, Wireframing',
            'UI Design, Prototyping, User Testing',
            'Design Systems, Information Architecture'
        ]
    },
    {
        title: 'Senior Accountant',
        skills: [
            'Financial Reporting, GAAP, Tax Compliance',
            'Budgeting, Forecasting, Financial Analysis',
            'ERP Systems, Audit, Internal Controls'
        ]
    },
    {
        title: 'Sales Manager',
        skills: [
            'Sales Strategy, CRM Management, Business Development',
            'Team Leadership, Sales Forecasting, Negotiation',
            'Market Analysis, Customer Relationship Management'
        ]
    },
    {
        title: 'Marketing Specialist',
        skills: [
            'Digital Marketing, Social Media, Content Strategy',
            'SEO/SEM, Analytics, Campaign Management',
            'Brand Management, Market Research, Email Marketing'
        ]
    }
];

const educationLevels = [
    'Bachelor in Computer Science, MIT',
    'Master in Software Engineering, Stanford',
    'Bachelor in Information Technology, Berkeley',
    'Master in Computer Engineering, Georgia Tech',
    'Bachelor in Software Development, Carnegie Mellon',
    'Master in Data Science, UCLA'
];

const experiences = {
    'Senior Software Engineer': { min: 5, max: 12 },
    'Product Manager': { min: 4, max: 10 },
    'UX Designer': { min: 3, max: 8 },
    'Senior Accountant': { min: 5, max: 15 },
    'Sales Manager': { min: 4, max: 12 },
    'Marketing Specialist': { min: 3, max: 10 }
};

// Candidate Schema
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
    resume: { type: String, required: true },
    status: { type: String, default: 'Pending' },
    applied_at: { type: Date, default: Date.now },
    vacancy: { type: String, required: true },
    source: { type: String, required: true }
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
    
    page.drawText(`Position: ${candidateInfo.vacancy}`, {
        x: 50,
        y: height - 120,
        size: 12
    });
    
    page.drawText(`Education: ${candidateInfo.education}`, {
        x: 50,
        y: height - 140,
        size: 12
    });
    
    page.drawText(`Experience: ${candidateInfo.experience} years`, {
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
function generateRandomCandidate(position) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`;
    const phone = `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`;
    const location = "Phoenix, AZ";
    const education = "Master in Computer Engineering, Georgia Tech";
    
    // Generate experience based on position
    const experienceRanges = {
        'Senior Software Engineer': { min: 5, max: 12 },
        'Product Manager': { min: 4, max: 10 },
        'UX Designer': { min: 3, max: 8 },
        'Senior Accountant': { min: 5, max: 15 },
        'Sales Manager': { min: 4, max: 12 },
        'Marketing Specialist': { min: 3, max: 10 }
    };
    const range = experienceRanges[position];
    const experience = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;

    // Determine if candidate is from OCC (30% chance)
    const isFromOCC = Math.random() < 0.3;

    // Generate LinkedIn URL only for non-OCC candidates (70% chance for them to have LinkedIn)
    const hasLinkedIn = !isFromOCC && Math.random() < 0.7;
    const linkedin = hasLinkedIn ? `https://linkedin.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}-${Math.random().toString(36).substring(2, 8)}` : null;

    // Position-specific skills
    const skillSets = {
        'Senior Software Engineer': ['Python', 'Django', 'PostgreSQL', 'AWS', 'Docker', 'Kubernetes', 'React', 'Node.js', 'System Design'],
        'Product Manager': ['Product Strategy', 'Agile', 'JIRA', 'User Research', 'Data Analysis', 'Roadmapping', 'Stakeholder Management'],
        'UX Designer': ['Figma', 'Adobe XD', 'User Research', 'Wireframing', 'Prototyping', 'UI Design', 'Usability Testing'],
        'Senior Accountant': ['Financial Reporting', 'GAAP', 'Tax Compliance', 'Budgeting', 'Forecasting', 'Financial Analysis', 'ERP Systems', 'Audit', 'Internal Controls'],
        'Sales Manager': ['Sales Strategy', 'CRM Management', 'Business Development', 'Team Leadership', 'Sales Forecasting', 'Negotiation', 'Market Analysis', 'Customer Relationship Management'],
        'Marketing Specialist': ['Digital Marketing', 'Social Media', 'Content Strategy', 'SEO/SEM', 'Analytics', 'Campaign Management', 'Brand Management', 'Market Research', 'Email Marketing']
    };

    // Select 4-6 random skills from the position's skill set
    const positionSkills = skillSets[position];
    const numSkills = Math.floor(Math.random() * 3) + 4; // 4-6 skills
    const skills = shuffleArray([...positionSkills]).slice(0, numSkills).join(', ');

    return {
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone: phone,
        location: location,
        education: education,
        experience: experience,
        skills: skills,
        linkedin: linkedin,
        vacancy: position,
        status: ['Pending', 'Interviewed', 'Accepted', 'Rejected'][Math.floor(Math.random() * 4)],
        source: isFromOCC ? 'OCC' : 'Direct Application'
    };
}

// Helper function to shuffle array
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Main function to generate and save candidates
async function generateCandidates() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');
        
        // Create resumes directory if it doesn't exist
        const resumesDir = path.join(__dirname, 'frontend', 'resumes');
        await fs.mkdir(resumesDir, { recursive: true });
        
        // Generate 30 candidates for each position
        const positions = ['Senior Software Engineer', 'Product Manager', 'UX Designer', 'Senior Accountant', 'Sales Manager', 'Marketing Specialist'];
        const candidates = [];
        positions.forEach(position => {
            for (let i = 0; i < 30; i++) {
                const candidate = generateRandomCandidate(position);
                candidates.push(candidate);
            }
        });
        
        // Generate and save PDFs for candidates
        for (const candidate of candidates) {
            try {
                // Generate and save PDF resume
                const pdfBytes = await generateResume(candidate);
                const resumeFilename = `resume_${candidate.vacancy.replace(/\s+/g, '_')}_${candidate.first_name}_${candidate.last_name}_${Math.random().toString(36).substring(2, 8)}.pdf`;
                const resumePath = path.join(resumesDir, resumeFilename);
                
                // Write the PDF file
                await fs.writeFile(resumePath, pdfBytes);
                
                // Store only the filename in the database
                candidate.resume = resumeFilename;
                
                // Save candidate to database
                const candidateModel = new Candidate(candidate);
                await candidateModel.save();
                console.log(`Created candidate: ${candidate.first_name} ${candidate.last_name} for ${candidate.vacancy}`);
            } catch (error) {
                console.error(`Error creating resume for ${candidate.first_name} ${candidate.last_name}:`, error);
            }
        }
        
        console.log('\nSuccessfully generated 180 candidates with resumes');
        process.exit(0);
    } catch (error) {
        console.error('Error generating candidates:', error);
        process.exit(1);
    }
}

generateCandidates(); 