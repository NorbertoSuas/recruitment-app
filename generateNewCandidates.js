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

// Define new vacancies
const newVacancies = [
    {
        title: 'Senior Accountant',
        company: 'Tech Mahindra',
        location: 'New York, NY',
        type: 'Full-time',
        description: 'We are seeking an experienced Senior Accountant to join our finance team. The ideal candidate will be responsible for managing financial records, preparing reports, and ensuring compliance with accounting standards.',
        requirements: 'Bachelor\'s degree in Accounting or Finance, CPA preferred, 5+ years of experience in accounting, proficiency in ERP systems',
        responsibilities: 'Prepare financial statements, manage month-end close process, oversee accounts payable/receivable, ensure tax compliance',
        skills_required: [
            'Financial Reporting',
            'GAAP',
            'Tax Compliance',
            'Budgeting',
            'Forecasting',
            'Financial Analysis',
            'ERP Systems',
            'Audit',
            'Internal Controls'
        ],
        experience_level: 'Senior Level',
        salary_range: {
            min: 80000,
            max: 120000,
            currency: 'MXN'
        },
        benefits: ['Health Insurance', '401(k)', 'Paid Time Off', 'Professional Development'],
        application_deadline: new Date('2024-04-30'),
        remote_option: true,
        status: 'Active',
        created_by: 'HR Admin',
        department: 'Finance'
    },
    {
        title: 'Sales Manager',
        company: 'Tech Mahindra',
        location: 'Los Angeles, CA',
        type: 'Full-time',
        description: 'We are looking for a dynamic Sales Manager to lead our sales team. The ideal candidate will drive revenue growth through effective team leadership and strategic sales planning.',
        requirements: 'Bachelor\'s degree in Business or related field, 4+ years of sales experience, proven track record of meeting sales targets',
        responsibilities: 'Lead sales team, develop sales strategies, manage key client relationships, achieve revenue targets',
        skills_required: [
            'Sales Strategy',
            'CRM Management',
            'Business Development',
            'Team Leadership',
            'Sales Forecasting',
            'Negotiation',
            'Market Analysis',
            'Customer Relationship Management'
        ],
        experience_level: 'Senior Level',
        salary_range: {
            min: 90000,
            max: 150000,
            currency: 'MXN'
        },
        benefits: ['Health Insurance', 'Commission Structure', 'Company Car', 'Expense Account'],
        application_deadline: new Date('2024-04-30'),
        remote_option: false,
        status: 'Active',
        created_by: 'HR Admin',
        department: 'Sales'
    },
    {
        title: 'Marketing Specialist',
        company: 'Tech Mahindra',
        location: 'Chicago, IL',
        type: 'Full-time',
        description: 'We are seeking a creative Marketing Specialist to develop and implement marketing strategies. The ideal candidate will have experience in digital marketing and content creation.',
        requirements: 'Bachelor\'s degree in Marketing or related field, 3+ years of marketing experience, proficiency in digital marketing tools',
        responsibilities: 'Create marketing campaigns, manage social media presence, analyze marketing metrics, develop content strategy',
        skills_required: [
            'Digital Marketing',
            'Social Media',
            'Content Strategy',
            'SEO/SEM',
            'Analytics',
            'Campaign Management',
            'Brand Management',
            'Market Research',
            'Email Marketing'
        ],
        experience_level: 'Mid Level',
        salary_range: {
            min: 60000,
            max: 90000,
            currency: 'MXN'
        },
        benefits: ['Health Insurance', 'Professional Development', 'Flexible Hours', 'Remote Work Options'],
        application_deadline: new Date('2024-04-30'),
        remote_option: true,
        status: 'Active',
        created_by: 'HR Admin',
        department: 'Marketing'
    }
];

const educationLevels = [
    'Bachelor in Accounting, NYU',
    'Master in Finance, Columbia',
    'Bachelor in Business Administration, Wharton',
    'Master in Marketing, Northwestern',
    'Bachelor in Sales Management, Harvard',
    'Master in Business Analytics, MIT'
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

// Define Vacancy Schema
const vacancySchema = new mongoose.Schema({
    title: { type: String, required: true },
    company: { type: String, required: true },
    location: { type: String, required: true },
    type: { type: String, required: true },
    description: { type: String, required: true },
    requirements: { type: String, required: true },
    responsibilities: { type: String, required: true },
    skills_required: [String],
    experience_level: { type: String, required: true },
    salary_range: {
        min: Number,
        max: Number,
        currency: { type: String, default: 'MXN' }
    },
    benefits: [String],
    application_deadline: Date,
    remote_option: { type: Boolean, default: false },
    status: { type: String, default: 'Active' },
    external_postings: {
        linkedin: { type: String },
        occ: { type: String }
    },
    created_by: { type: String, required: true },
    department: { type: String, required: true }
}, { timestamps: true });

const Vacancy = mongoose.model('Vacancy', vacancySchema);

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

function generateRandomCandidate(vacancy) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`;
    const phone = `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`;
    const location = locations[Math.floor(Math.random() * locations.length)];
    const education = educationLevels[Math.floor(Math.random() * educationLevels.length)];
    const experience = Math.floor(Math.random() * (experiences[vacancy.title].max - experiences[vacancy.title].min + 1)) + experiences[vacancy.title].min;
    const linkedin = `https://linkedin.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}`;
    const isFromOCC = Math.random() > 0.5;
    
    // Get position-specific skills from the vacancy
    const positionSkills = vacancy.skills_required;
    const numSkills = Math.floor(Math.random() * 3) + 4; // 4-6 skills
    
    // Randomly select multiple skills without duplicates
    const shuffledSkills = [...positionSkills].sort(() => Math.random() - 0.5);
    const selectedSkills = shuffledSkills.slice(0, numSkills);
    const skills = selectedSkills.join(', ');

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
        vacancy: vacancy.title,
        status: ['Pending', 'Interviewed', 'Accepted', 'Rejected'][Math.floor(Math.random() * 4)],
        source: isFromOCC ? 'OCC' : 'Direct Application'
    };
}

async function main() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // Create resumes directory if it doesn't exist
        const resumesDir = path.join(__dirname, 'frontend', 'resumes');
        await fs.mkdir(resumesDir, { recursive: true });

        // First, create the new vacancies if they don't exist
        console.log('Creating new vacancies...');
        for (const vacancy of newVacancies) {
            const existingVacancy = await Vacancy.findOne({ title: vacancy.title });
            if (!existingVacancy) {
                const newVacancy = new Vacancy(vacancy);
                await newVacancy.save();
                console.log(`Created vacancy: ${vacancy.title}`);
            } else {
                console.log(`Vacancy ${vacancy.title} already exists`);
            }
        }

        // Get all active vacancies
        console.log('\nFetching all active vacancies...');
        const activeVacancies = await Vacancy.find({ status: 'Active' });
        console.log(`Found ${activeVacancies.length} active vacancies`);

        // Delete existing candidates
        console.log('\nDeleting existing candidates...');
        await Candidate.deleteMany({});

        // Generate 10 candidates for each active vacancy
        const candidates = [];
        for (const vacancy of activeVacancies) {
            console.log(`\nGenerating candidates for ${vacancy.title}...`);
            for (let i = 0; i < 10; i++) {
                const candidate = generateRandomCandidate(vacancy);
                const resumePdf = await generateResume(candidate);
                const resumeFilename = `${candidate.first_name}_${candidate.last_name}_resume.pdf`;
                const resumePath = path.join(resumesDir, resumeFilename);
                await fs.writeFile(resumePath, resumePdf);
                candidate.resume = resumeFilename;
                candidates.push(candidate);
            }
        }

        // Save candidates to database
        await Candidate.insertMany(candidates);
        console.log(`\nSuccessfully generated ${candidates.length} candidates (10 per active vacancy)`);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

main(); 