const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    company: {
        name: { type: String, required: true },
        industry: { type: String, required: true },
        description: { type: String, required: true },
        website: String,
        size: { type: String, required: true }
    },
    linkedin: {
        connected: { type: Boolean, default: false },
        email: String,
        accessToken: String,
        refreshToken: String,
        expiresAt: Date,
        selectedCompanyPage: String,
        companyPages: [{
            id: String,
            name: String
        }]
    },
    occ: {
        connected: { type: Boolean, default: false },
        apiKey: String,
        apiSecret: String,
        companyId: String
    },
    userId: { type: String, required: true, unique: true }
}, { timestamps: true });

// Encrypt sensitive data before saving
settingsSchema.pre('save', function(next) {
    if (this.isModified('linkedin.accessToken')) {
        // In a production environment, you should encrypt these values
        // this.linkedin.accessToken = encrypt(this.linkedin.accessToken);
    }
    if (this.isModified('linkedin.refreshToken')) {
        // this.linkedin.refreshToken = encrypt(this.linkedin.refreshToken);
    }
    if (this.isModified('occ.apiKey')) {
        // this.occ.apiKey = encrypt(this.occ.apiKey);
    }
    if (this.isModified('occ.apiSecret')) {
        // this.occ.apiSecret = encrypt(this.occ.apiSecret);
    }
    next();
});

const Settings = mongoose.model('Settings', settingsSchema);

module.exports = Settings; 