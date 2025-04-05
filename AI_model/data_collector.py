import logging
from typing import List, Dict, Any
from datetime import datetime, timedelta
from model_config import DATA_SOURCES
from pymongo import MongoClient # type: ignore
from bson import ObjectId
from api_integration import APIIntegration

class DataCollector:
    def __init__(self, mongo_uri=None):
        self.logger = logging.getLogger(__name__)
        self.mongo_client = MongoClient(mongo_uri) if mongo_uri else None
        self.db = self.mongo_client.innovation if self.mongo_client else None
        self.last_refresh = {
            'mongodb': None,
            'linkedin': None,
            'occ': None
        }

    def collect_data(self, source: str) -> List[Dict[str, Any]]:
        """Collect data from specified source"""
        if source not in DATA_SOURCES:
            raise ValueError(f"Unknown data source: {source}")

        if not DATA_SOURCES[source]['enabled']:
            self.logger.warning(f"Data source {source} is disabled")
            return []

        if not self._should_refresh(source):
            return []

        try:
            if source == 'mongodb':
                return self._collect_from_mongodb()
            elif source == 'linkedin':
                return self._collect_from_linkedin()
            elif source == 'occ':
                return self._collect_from_occ()
        except Exception as e:
            self.logger.error(f"Error collecting data from {source}: {str(e)}")
            raise
        finally:
            self.last_refresh[source] = datetime.now()

    def _should_refresh(self, source: str) -> bool:
        """Check if data source should be refreshed based on refresh interval"""
        if self.last_refresh[source] is None:
            return True

        refresh_interval = timedelta(
            seconds=DATA_SOURCES[source]['refresh_interval']
        )
        return datetime.now() - self.last_refresh[source] >= refresh_interval

    def _collect_from_mongodb(self) -> List[Dict[str, Any]]:
        """Collect data from MongoDB"""
        if not self.db:
            raise ValueError("MongoDB connection not initialized")

        try:
            # Get candidates that haven't been processed or were processed more than a day ago
            candidates = self.db.candidates.find({
                '$or': [
                    {'last_processed': {'$exists': False}},
                    {'last_processed': {'$lt': datetime.now() - timedelta(days=1)}}
                ]
            })
            
            # Convert ObjectId to string for JSON serialization
            return [{
                **candidate,
                '_id': str(candidate['_id']),
                'applied_for': str(candidate.get('applied_for', ''))
            } for candidate in candidates]
        except Exception as e:
            self.logger.error(f"MongoDB query error: {str(e)}")
            raise

    def update_processing_status(self, candidate_id: str, status: str) -> None:
        """Update the processing status of a candidate in MongoDB"""
        if not self.db:
            raise ValueError("MongoDB connection not initialized")

        try:
            self.db.candidates.update_one(
                {'_id': ObjectId(candidate_id)},
                {
                    '$set': {
                        'last_processed': datetime.now(),
                        'processing_status': status
                    }
                }
            )
        except Exception as e:
            self.logger.error(f"Error updating processing status: {str(e)}")
            raise

    def _collect_from_linkedin(self) -> List[Dict[str, Any]]:
        """Collect data from LinkedIn API"""
        try:
            # Initialize API integration
            api = APIIntegration('linkedin')
            
            # Get candidates from LinkedIn
            candidates = api.get_candidates()
            
            # Process and store candidates
            processed_candidates = []
            for candidate in candidates:
                # Transform LinkedIn data to match our schema
                candidate_data = {
                    'first_name': candidate.get('firstName', ''),
                    'last_name': candidate.get('lastName', ''),
                    'email': candidate.get('emailAddress', ''),
                    'phone': candidate.get('phoneNumber', ''),
                    'linkedin': candidate.get('profileUrl', ''),
                    'experience': self._calculate_experience(candidate.get('experience', [])),
                    'education': self._format_education(candidate.get('education', [])),
                    'location': candidate.get('location', {}).get('name', ''),
                    'skills': ', '.join(candidate.get('skills', [])),
                    'resume': None,  # LinkedIn doesn't provide resumes
                    'status': 'Pending',
                    'applied_at': datetime.now(),
                    'source': 'linkedin',
                    'raw_data': candidate  # Store original data for reference
                }
                
                # Store in MongoDB
                result = self.db.candidates.insert_one(candidate_data)
                processed_candidates.append(str(result.inserted_id))
            
            return processed_candidates
            
        except Exception as e:
            self.logger.error(f"Error collecting LinkedIn data: {str(e)}")
            return []

    def _collect_from_occ(self) -> List[Dict[str, Any]]:
        """Collect data from OCC API"""
        try:
            # Initialize API integration
            api = APIIntegration('occ')
            
            # Get candidates from OCC
            candidates = api.get_candidates()
            
            # Process and store candidates
            processed_candidates = []
            for candidate in candidates:
                # Transform OCC data to match our schema
                candidate_data = {
                    'first_name': candidate.get('firstName', ''),
                    'last_name': candidate.get('lastName', ''),
                    'email': candidate.get('email', ''),
                    'phone': candidate.get('phone', ''),
                    'linkedin': candidate.get('linkedinUrl', ''),
                    'experience': candidate.get('yearsOfExperience', 0),
                    'education': self._format_education(candidate.get('education', [])),
                    'location': candidate.get('location', ''),
                    'skills': ', '.join(candidate.get('skills', [])),
                    'resume': candidate.get('resumeUrl', None),
                    'status': 'Pending',
                    'applied_at': datetime.now(),
                    'source': 'occ',
                    'raw_data': candidate  # Store original data for reference
                }
                
                # Store in MongoDB
                result = self.db.candidates.insert_one(candidate_data)
                processed_candidates.append(str(result.inserted_id))
            
            return processed_candidates
            
        except Exception as e:
            self.logger.error(f"Error collecting OCC data: {str(e)}")
            return []

    def _calculate_experience(self, experience_list: List[Dict[str, Any]]) -> int:
        """Calculate total years of experience from LinkedIn experience data"""
        total_years = 0
        for exp in experience_list:
            start_date = exp.get('startDate', {})
            end_date = exp.get('endDate', {})
            
            if start_date and end_date:
                start = datetime(start_date.get('year', 0), start_date.get('month', 1), 1)
                end = datetime(end_date.get('year', 0), end_date.get('month', 1), 1)
                total_years += (end - start).days / 365.25
            elif start_date:  # Current position
                start = datetime(start_date.get('year', 0), start_date.get('month', 1), 1)
                total_years += (datetime.now() - start).days / 365.25
                
        return round(total_years)

    def _format_education(self, education_list: List[Dict[str, Any]]) -> str:
        """Format education data from API responses"""
        formatted_education = []
        for edu in education_list:
            school = edu.get('schoolName', '')
            degree = edu.get('degree', '')
            field = edu.get('fieldOfStudy', '')
            if school and degree:
                formatted_education.append(f"{degree} in {field}, {school}")
        return '; '.join(formatted_education) 