const LinkedIn = require('node-linkedin');
const axios = require('axios');
require('dotenv').config();

// LinkedIn API setup
const linkedin = new LinkedIn(
    process.env.LINKEDIN_CLIENT_ID,
    process.env.LINKEDIN_CLIENT_SECRET,
    process.env.LINKEDIN_REDIRECT_URI
);

// LinkedIn posting function
async function postToLinkedIn(vacancy) {
    try {
        // This is a simplified example. In production, you'll need to handle OAuth flow
        // and store access tokens securely
        const postData = {
            author: 'urn:li:organization:YOUR_ORGANIZATION_ID',
            lifecycleState: 'PUBLISHED',
            specificContent: {
                'com.linkedin.ugc.ShareContent': {
                    shareCommentary: {
                        text: `${vacancy.title} - ${vacancy.company}\n\n${vacancy.description}`
                    },
                    shareMediaCategory: 'NONE'
                }
            },
            visibility: {
                'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
            }
        };

        // You'll need to implement proper OAuth flow and token management
        const response = await linkedin.posts.create(postData);
        return {
            success: true,
            url: `https://www.linkedin.com/feed/update/${response.id}`,
            postId: response.id
        };
    } catch (error) {
        console.error('LinkedIn posting error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// OCC Mundial posting function
async function postToOCC(vacancy) {
    try {
        const occPostData = {
            title: vacancy.title,
            description: vacancy.description,
            company: vacancy.company,
            location: vacancy.location,
            employmentType: vacancy.type,
            requirements: vacancy.requirements,
            responsibilities: vacancy.responsibilities,
            skills: vacancy.skills_required,
            experienceLevel: vacancy.experience_level,
            salaryRange: vacancy.salary_range,
            benefits: vacancy.benefits,
            applicationDeadline: vacancy.application_deadline,
            isRemote: vacancy.remote_option
        };

        const response = await axios.post(
            `${process.env.OCC_API_URL}/jobs`,
            occPostData,
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OCC_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return {
            success: true,
            url: response.data.jobUrl,
            postId: response.data.jobId
        };
    } catch (error) {
        console.error('OCC posting error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Function to post to all platforms
async function postToAllPlatforms(vacancy) {
    const results = {
        linkedin: await postToLinkedIn(vacancy),
        occ: await postToOCC(vacancy)
    };

    return {
        success: results.linkedin.success || results.occ.success,
        platforms: {
            linkedin: results.linkedin,
            occ: results.occ
        }
    };
}

module.exports = {
    postToLinkedIn,
    postToOCC,
    postToAllPlatforms
}; 