import os
from pathlib import Path

# Model Configuration
MODEL_CONFIG = {
    'model_name': 'candidate_matcher',
    'version': '1.0.0',
    'embedding_dim': 768,  # BERT base embedding dimension
    'max_sequence_length': 512,
    'batch_size': 32,
    'learning_rate': 2e-5,
}

# Document Processing Configuration
DOC_CONFIG = {
    'supported_formats': ['.pdf', '.doc', '.docx'],
    'max_file_size': 10 * 1024 * 1024,  # 10MB
    'extraction_timeout': 300,  # seconds
    'resume_dir': 'frontend/resumes'  # Directory where resumes are stored
}

# Data Source Configuration
DATA_SOURCES = {
    'mongodb': {
        'enabled': True,
        'collection': 'candidates',
        'refresh_interval': 3600,  # 1 hour
    },
    'linkedin': {
        'enabled': False,  # Will be enabled when API credentials are available
        'api_version': 'v2',
        'refresh_interval': 3600,
        'required_fields': [
            'profile_url',
            'headline',
            'summary',
            'experience',
            'education',
            'skills'
        ]
    },
    'occ': {
        'enabled': False,  # Will be enabled when API credentials are available
        'api_version': '1.0',
        'refresh_interval': 3600,
        'required_fields': [
            'job_title',
            'company',
            'location',
            'description',
            'requirements',
            'skills'
        ]
    }
}

# Model Storage Configuration
STORAGE_CONFIG = {
    'model_path': Path(__file__).parent / 'trained_models',
    'cache_path': Path(__file__).parent / 'cache',
    'log_path': Path(__file__).parent / 'logs',
    'api_cache_path': Path(__file__).parent / 'api_cache'  # For caching API responses
}

# Create necessary directories
for path in STORAGE_CONFIG.values():
    os.makedirs(path, exist_ok=True)

# API Configuration
API_CONFIG = {
    'linkedin': {
        'base_url': 'https://api.linkedin.com/v2',
        'auth_url': 'https://www.linkedin.com/oauth/v2/authorization',
        'token_url': 'https://www.linkedin.com/oauth/v2/accessToken',
        'scopes': ['r_liteprofile', 'r_emailaddress', 'w_member_social'],
        'redirect_uri': 'http://localhost:3000/auth/linkedin/callback'
    },
    'occ': {
        'base_url': 'https://api.occ.com/v1',
        'auth_url': 'https://api.occ.com/oauth/authorize',
        'token_url': 'https://api.occ.com/oauth/token',
        'scopes': ['read_jobs', 'read_candidates', 'write_jobs'],
        'redirect_uri': 'http://localhost:3000/auth/occ/callback'
    }
} 