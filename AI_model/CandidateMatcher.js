class CandidateMatcher {
    constructor() {
        this.weights = {
            skills: 0.4,
            experience: 0.3,
            education: 0.2,
            description: 0.1
        };
    }

    match_candidate(candidateData, vacancyData) {
        try {
            // Calculate individual scores
            const skillsScore = this._calculateSkillsMatch(
                this._parseSkills(candidateData.skills),
                this._parseSkills(vacancyData.skills)
            );

            const experienceScore = this._calculateExperienceMatch(
                parseInt(candidateData.experience),
                vacancyData.experience
            );

            const educationScore = this._calculateEducationMatch(
                candidateData.education,
                vacancyData.education
            );

            const descriptionScore = this._calculateDescriptionMatch(
                candidateData.description || '',
                vacancyData.description || ''
            );

            // Calculate weighted score
            const matchScore = (
                this.weights.skills * skillsScore +
                this.weights.experience * experienceScore +
                this.weights.education * educationScore +
                this.weights.description * descriptionScore
            );

            return {
                match_score: Math.min(Math.max(matchScore, 0), 1), // Ensure score is between 0 and 1
                candidate_id: candidateData.id,
                vacancy_id: vacancyData.id,
                match_details: this._generateMatchDetails(matchScore)
            };
        } catch (error) {
            console.error('Error in match_candidate:', error);
            throw error;
        }
    }

    _parseSkills(skillsString) {
        return skillsString.toLowerCase().split(',').map(s => s.trim());
    }

    _calculateSkillsMatch(candidateSkills, vacancySkills) {
        const matchingSkills = candidateSkills.filter(skill =>
            vacancySkills.some(vs => vs.includes(skill) || skill.includes(vs))
        ).length;

        return matchingSkills / Math.max(vacancySkills.length, 1);
    }

    _calculateExperienceMatch(candidateExp, requiredExp) {
        // Convert experience level to years
        const expLevels = {
            'Entry Level': 0,
            'Mid Level': 3,
            'Senior Level': 5,
            'Executive': 8
        };

        const requiredYears = expLevels[requiredExp] || 0;
        
        if (candidateExp >= requiredYears) {
            return 1;
        } else {
            return Math.max(0, candidateExp / requiredYears);
        }
    }

    _calculateEducationMatch(candidateEdu, requiredEdu) {
        const eduLevels = {
            'High School': 1,
            'Bachelor': 2,
            'Master': 3,
            'PhD': 4
        };

        // Simple text matching for now
        if (candidateEdu.toLowerCase().includes(requiredEdu.toLowerCase())) {
            return 1;
        }
        return 0.5; // Partial match
    }

    _calculateDescriptionMatch(candidateDesc, vacancyDesc) {
        // Simple keyword matching for now
        const vacancyKeywords = vacancyDesc.toLowerCase().split(' ');
        const candidateKeywords = candidateDesc.toLowerCase().split(' ');

        const matchingKeywords = candidateKeywords.filter(word =>
            vacancyKeywords.includes(word)
        ).length;

        return matchingKeywords / Math.max(vacancyKeywords.length, 1);
    }

    _generateMatchDetails(score) {
        return {
            confidence: score,
            match_level: this._getMatchLevel(score),
            recommendation: this._getRecommendation(score)
        };
    }

    _getMatchLevel(score) {
        if (score >= 0.8) return 'Excellent Match';
        if (score >= 0.6) return 'Good Match';
        if (score >= 0.4) return 'Moderate Match';
        return 'Low Match';
    }

    _getRecommendation(score) {
        if (score >= 0.8) return 'Strongly recommended for interview';
        if (score >= 0.6) return 'Consider for interview';
        if (score >= 0.4) return 'May need additional screening';
        return 'Not recommended for this position';
    }
}

module.exports = CandidateMatcher; 