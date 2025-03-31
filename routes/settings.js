const express = require('express');
const router = express.Router();
const Settings = require('../models/settings');
const LinkedIn = require('node-linkedin');

// Initialize LinkedIn
const linkedin = new LinkedIn(
    process.env.LINKEDIN_CLIENT_ID,
    process.env.LINKEDIN_CLIENT_SECRET,
    process.env.LINKEDIN_REDIRECT_URI
);

// Get settings
router.get('/settings', async (req, res) => {
    try {
        // In production, get userId from authenticated session
        const userId = 'default-user'; // Temporary for development
        
        let settings = await Settings.findOne({ userId });
        
        if (!settings) {
            settings = new Settings({
                userId,
                company: {
                    name: '',
                    industry: '',
                    description: '',
                    website: '',
                    size: ''
                }
            });
            await settings.save();
        }

        // Remove sensitive data before sending to client
        const safeSettings = {
            company: settings.company,
            linkedin: {
                connected: settings.linkedin.connected,
                email: settings.linkedin.email,
                companyPages: settings.linkedin.companyPages,
                selectedCompanyPage: settings.linkedin.selectedCompanyPage
            },
            occ: {
                connected: settings.occ.connected,
                companyId: settings.occ.companyId
            }
        };

        res.json(safeSettings);
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ error: 'Error fetching settings' });
    }
});

// Update company profile
router.post('/settings/company', async (req, res) => {
    try {
        const userId = 'default-user'; // Temporary for development
        
        const settings = await Settings.findOneAndUpdate(
            { userId },
            { 
                $set: { 
                    'company': req.body 
                }
            },
            { new: true, upsert: true }
        );

        res.json({ success: true, company: settings.company });
    } catch (error) {
        console.error('Error updating company profile:', error);
        res.status(500).json({ error: 'Error updating company profile' });
    }
});

// LinkedIn OAuth routes
router.get('/auth/linkedin', (req, res) => {
    const state = Math.random().toString(36).substring(7);
    // Store state in session for validation
    req.session.linkedinState = state;
    
    const authUrl = linkedin.auth.authorize({
        scope: ['r_liteprofile', 'r_organization_social', 'w_organization_social'],
        state: state
    });
    
    res.redirect(authUrl);
});

router.get('/auth/linkedin/callback', async (req, res) => {
    try {
        const { code, state } = req.query;
        
        // Validate state
        if (state !== req.session.linkedinState) {
            throw new Error('Invalid state parameter');
        }

        const userId = 'default-user'; // Temporary for development

        // Exchange code for access token
        const { accessToken, refreshToken, expiresIn } = await linkedin.auth.getAccessToken(code);
        
        // Get user profile
        const profile = await linkedin.people.me();
        
        // Get company pages
        const companyPages = await linkedin.companies.getManagedCompanies();

        // Update settings
        await Settings.findOneAndUpdate(
            { userId },
            {
                $set: {
                    'linkedin.connected': true,
                    'linkedin.email': profile.emailAddress,
                    'linkedin.accessToken': accessToken,
                    'linkedin.refreshToken': refreshToken,
                    'linkedin.expiresAt': new Date(Date.now() + expiresIn * 1000),
                    'linkedin.companyPages': companyPages.map(page => ({
                        id: page.id,
                        name: page.name
                    }))
                }
            },
            { new: true }
        );

        res.redirect('/settings.html?linkedin=connected');
    } catch (error) {
        console.error('LinkedIn OAuth error:', error);
        res.redirect('/settings.html?linkedin=error');
    }
});

router.post('/auth/linkedin/disconnect', async (req, res) => {
    try {
        const userId = 'default-user'; // Temporary for development

        await Settings.findOneAndUpdate(
            { userId },
            {
                $set: {
                    'linkedin.connected': false,
                    'linkedin.accessToken': null,
                    'linkedin.refreshToken': null,
                    'linkedin.email': null,
                    'linkedin.companyPages': [],
                    'linkedin.selectedCompanyPage': null
                }
            }
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Error disconnecting LinkedIn:', error);
        res.status(500).json({ error: 'Error disconnecting LinkedIn' });
    }
});

// Update LinkedIn company page selection
router.post('/settings/linkedin/company', async (req, res) => {
    try {
        const userId = 'default-user'; // Temporary for development
        const { companyPageId } = req.body;

        await Settings.findOneAndUpdate(
            { userId },
            { $set: { 'linkedin.selectedCompanyPage': companyPageId } }
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Error updating LinkedIn company page:', error);
        res.status(500).json({ error: 'Error updating LinkedIn company page' });
    }
});

// Save OCC credentials
router.post('/settings/occ', async (req, res) => {
    try {
        const userId = 'default-user'; // Temporary for development
        const { apiKey, apiSecret, companyId } = req.body;

        // Validate credentials with OCC API
        try {
            const response = await axios.post(`${process.env.OCC_API_URL}/auth/validate`, {
                apiKey,
                apiSecret
            });

            if (!response.data.valid) {
                throw new Error('Invalid OCC credentials');
            }
        } catch (error) {
            throw new Error('Failed to validate OCC credentials');
        }

        await Settings.findOneAndUpdate(
            { userId },
            {
                $set: {
                    'occ.connected': true,
                    'occ.apiKey': apiKey,
                    'occ.apiSecret': apiSecret,
                    'occ.companyId': companyId
                }
            }
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Error saving OCC credentials:', error);
        res.status(500).json({ error: 'Error saving OCC credentials' });
    }
});

module.exports = router; 