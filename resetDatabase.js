const mongoose = require('mongoose');

// MongoDB connection
const MONGODB_URI = 'mongodb://localhost:27017/Innovation';

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Delete all existing candidates
    await mongoose.connection.collection('candidates').deleteMany({});
    console.log('Cleared existing candidates');
    
    // Run the sample data generation script
    require('./generateSampleData.js');
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  }); 