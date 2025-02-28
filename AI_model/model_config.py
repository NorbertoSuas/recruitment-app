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
}

# Data Source Configuration
DATA_SOURCES = {
    'sql_database': {
        'enabled': True,
        'doc_table': 'candidate_documents',
        'refresh_interval': 3600,  # 1 hour
    },
    'linkedin': {
        'enabled': True,
        'api_version': 'v2',
        'refresh_interval': 3600,
    },
    'occ': {
        'enabled': True,
        'api_version': '1.0',
        'refresh_interval': 3600,
    }
}

# Model Storage Configuration
STORAGE_CONFIG = {
    'model_path': Path(__file__).parent / 'trained_models',
    'cache_path': Path(__file__).parent / 'cache',
    'log_path': Path(__file__).parent / 'logs',
}

# Create necessary directories
for path in STORAGE_CONFIG.values():
    os.makedirs(path, exist_ok=True) 