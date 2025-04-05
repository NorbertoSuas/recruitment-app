import logging
from typing import Dict, Any, List
import numpy as np
from datetime import datetime
from pymongo import MongoClient
from bson import ObjectId
from candidate_matcher import CandidateMatcher
from document_processor import DocumentProcessor

class ContinuousLearner:
    def __init__(self, mongo_uri: str):
        self.logger = logging.getLogger(__name__)
        self.mongo_client = MongoClient(mongo_uri)
        self.db = self.mongo_client.innovation
        self.matcher = CandidateMatcher()
        self.processor = DocumentProcessor()
        
        # Initialize learning parameters
        self.learning_rate = 0.1
        self.min_samples = 10
        self.feature_weights = {
            'location': 1.0,
            'experience': 1.0,
            'skills': 1.0,
            'resume_content': 1.0
        }

    def update_weights(self, successful_matches: List[Dict[str, Any]]) -> None:
        """Update feature weights based on successful matches"""
        if len(successful_matches) < self.min_samples:
            return

        # Calculate new weights based on successful matches
        for match in successful_matches:
            candidate = self.db.candidates.find_one({'_id': ObjectId(match['candidate_id'])})
            vacancy = self.db.vacancies.find_one({'_id': ObjectId(match['vacancy_id'])})
            
            if not candidate or not vacancy:
                continue

            # Extract features
            features = self._extract_features(candidate, vacancy)
            
            # Update weights based on successful match
            for feature, value in features.items():
                if value > 0:  # Only update if feature was relevant
                    self.feature_weights[feature] += self.learning_rate * value

        # Normalize weights
        total = sum(self.feature_weights.values())
        self.feature_weights = {k: v/total for k, v in self.feature_weights.items()}

    def _extract_features(self, candidate: Dict[str, Any], vacancy: Dict[str, Any]) -> Dict[str, float]:
        """Extract and normalize features from candidate and vacancy"""
        features = {}
        
        # Location matching
        if candidate.get('location') and vacancy.get('location'):
            features['location'] = 1.0 if candidate['location'].lower() == vacancy['location'].lower() else 0.0
        
        # Experience matching
        if candidate.get('experience') and vacancy.get('experience_level'):
            exp_match = self._match_experience(candidate['experience'], vacancy['experience_level'])
            features['experience'] = exp_match
        
        # Skills matching
        if candidate.get('skills') and vacancy.get('skills_required'):
            skills_match = self._match_skills(candidate['skills'], vacancy['skills_required'])
            features['skills'] = skills_match
        
        # Resume content matching
        if candidate.get('resume'):
            resume_text = self.processor.process_document(candidate['resume'])['content']
            vacancy_text = f"{vacancy.get('description', '')} {vacancy.get('requirements', '')}"
            content_match = self.matcher.calculate_similarity(
                self.matcher.generate_embeddings(resume_text),
                self.matcher.generate_embeddings(vacancy_text)
            )
            features['resume_content'] = content_match

        return features

    def _match_experience(self, candidate_exp: int, vacancy_level: str) -> float:
        """Match candidate experience with vacancy level"""
        exp_ranges = {
            'Entry': (0, 2),
            'Mid': (2, 5),
            'Senior': (5, 10),
            'Expert': (10, float('inf'))
        }
        
        if vacancy_level not in exp_ranges:
            return 0.0
            
        min_exp, max_exp = exp_ranges[vacancy_level]
        if min_exp <= candidate_exp <= max_exp:
            return 1.0
        elif candidate_exp < min_exp:
            return candidate_exp / min_exp
        else:
            return 1.0 - ((candidate_exp - max_exp) / (max_exp * 2))

    def _match_skills(self, candidate_skills: str, required_skills: List[str]) -> float:
        """Match candidate skills with required skills"""
        candidate_skill_list = [s.strip().lower() for s in candidate_skills.split(',')]
        required_skill_list = [s.strip().lower() for s in required_skills]
        
        if not required_skill_list:
            return 0.0
            
        matches = sum(1 for skill in required_skill_list if skill in candidate_skill_list)
        return matches / len(required_skill_list)

    def process_new_candidate(self, candidate_data: Dict[str, Any]) -> None:
        """Process new candidate data and update learning model"""
        try:
            # Extract and store embeddings
            resume_text = self.processor.process_document(candidate_data['resume'])['content']
            embeddings = self.matcher.generate_embeddings(resume_text)
            
            # Store in MongoDB
            self.db.candidates.update_one(
                {'_id': ObjectId(candidate_data['_id'])},
                {
                    '$set': {
                        'embeddings': embeddings.tolist(),
                        'last_processed': datetime.now(),
                        'feature_weights': self.feature_weights
                    }
                }
            )
            
            # Update weights if this was a successful match
            if candidate_data.get('status') == 'Hired':
                self.update_weights([{
                    'candidate_id': candidate_data['_id'],
                    'vacancy_id': candidate_data.get('applied_for')
                }])
                
        except Exception as e:
            self.logger.error(f"Error processing new candidate: {str(e)}")
            raise

    def get_match_score(self, candidate: Dict[str, Any], vacancy: Dict[str, Any]) -> float:
        """Calculate weighted match score for a candidate and vacancy"""
        features = self._extract_features(candidate, vacancy)
        
        # Calculate weighted score
        weighted_score = sum(
            self.feature_weights[feature] * score
            for feature, score in features.items()
        )
        
        return weighted_score 