try:
    import torch
    import torch.nn as nn
    from transformers import AutoTokenizer, AutoModel
except ImportError:
    raise ImportError("Please install torch and transformers packages")

import numpy as np
from typing import List, Dict, Any
import model_config
import logging

class CandidateMatcher:
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.tokenizer = AutoTokenizer.from_pretrained('bert-base-multilingual-cased')
        self.model = AutoModel.from_pretrained('bert-base-multilingual-cased').to(self.device)
        self.embedding_dim = model_config.MODEL_CONFIG['embedding_dim']

    def generate_embeddings(self, text: str) -> np.ndarray:
        """Generate embeddings for input text using BERT"""
        try:
            inputs = self.tokenizer(
                text,
                max_length=model_config.MODEL_CONFIG.get('max_sequence_length', 512),
                padding=True,
                truncation=True,
                return_tensors='pt'
            ).to(self.device)

            with torch.no_grad():
                outputs = self.model(**inputs)
                embeddings = outputs.last_hidden_state.mean(dim=1).cpu().numpy()

            return embeddings[0]  # Return the first (and only) embedding
        except Exception as e:
            self.logger.error(f"Error generating embeddings: {str(e)}")
            raise

    def calculate_similarity(self, embedding1: np.ndarray, embedding2: np.ndarray) -> float:
        """Calculate cosine similarity between two embeddings"""
        return float(np.dot(embedding1, embedding2) / 
                    (np.linalg.norm(embedding1) * np.linalg.norm(embedding2)))

    def match_candidate(self, 
                       candidate_data: Dict[str, Any],
                       vacancy_data: Dict[str, Any]) -> Dict[str, Any]:
        """Match a candidate with a vacancy using their respective data"""
        try:
            # Generate embeddings for candidate and vacancy
            candidate_embedding = self.generate_embeddings(
                self._prepare_text(candidate_data)
            )
            vacancy_embedding = self.generate_embeddings(
                self._prepare_text(vacancy_data)
            )

            # Calculate similarity score
            similarity = self.calculate_similarity(candidate_embedding, vacancy_embedding)

            return {
                'match_score': similarity,
                'candidate_id': candidate_data.get('id'),
                'vacancy_id': vacancy_data.get('id'),
                'match_details': self._generate_match_details(similarity)
            }
        except Exception as e:
            self.logger.error(f"Error matching candidate: {str(e)}")
            raise

    def _prepare_text(self, data: Dict[str, Any]) -> str:
        """Prepare text data for embedding generation"""
        relevant_fields = [
            data.get('description', ''),
            data.get('skills', ''),
            data.get('experience', ''),
            data.get('education', '')
        ]
        return ' '.join(filter(None, relevant_fields))

    def _generate_match_details(self, similarity: float) -> Dict[str, Any]:
        """Generate detailed matching information"""
        return {
            'confidence': similarity,
            'match_level': self._get_match_level(similarity),
            'recommendation': self._get_recommendation(similarity)
        }

    def _get_match_level(self, similarity: float) -> str:
        """Convert similarity score to match level"""
        if similarity >= 0.8:
            return 'Excellent Match'
        elif similarity >= 0.6:
            return 'Good Match'
        elif similarity >= 0.4:
            return 'Moderate Match'
        else:
            return 'Low Match'

    def _get_recommendation(self, similarity: float) -> str:
        """Generate recommendation based on similarity score"""
        if similarity >= 0.8:
            return 'Strongly recommended for interview'
        elif similarity >= 0.6:
            return 'Consider for interview'
        elif similarity >= 0.4:
            return 'May need additional screening'
        else:
            return 'Not recommended for this position' 