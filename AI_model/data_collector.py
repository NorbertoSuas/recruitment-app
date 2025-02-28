import logging
from typing import List, Dict, Any
from datetime import datetime, timedelta
import requests
from model_config import DATA_SOURCES

class DataCollector:
    def __init__(self, db_connection=None):
        self.logger = logging.getLogger(__name__)
        self.db_connection = db_connection
        self.last_refresh = {
            'sql_database': None,
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
            if source == 'sql_database':
                return self._collect_from_database()
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

    def _collect_from_database(self) -> List[Dict[str, Any]]:
        """Collect data from SQL database"""
        if not self.db_connection:
            raise ValueError("Database connection not initialized")

        query = f"""
            SELECT * FROM {DATA_SOURCES['sql_database']['doc_table']}
            WHERE last_processed IS NULL
            OR last_processed < NOW() - INTERVAL '1 day'
        """
        
        try:
            cursor = self.db_connection.cursor()
            cursor.execute(query)
            results = cursor.fetchall()
            return [dict(zip([col[0] for col in cursor.description], row))
                    for row in results]
        except Exception as e:
            self.logger.error(f"Database query error: {str(e)}")
            raise

    def _collect_from_linkedin(self) -> List[Dict[str, Any]]:
        """Collect data from LinkedIn API"""
        # Note: Implementation requires LinkedIn API credentials
        self.logger.info("LinkedIn data collection - Requires API implementation")
        return []

    def _collect_from_occ(self) -> List[Dict[str, Any]]:
        """Collect data from OCC API"""
        # Note: Implementation requires OCC API credentials
        self.logger.info("OCC data collection - Requires API implementation")
        return []

    def update_processing_status(self, doc_id: int, status: str) -> None:
        """Update the processing status of a document in the database"""
        if not self.db_connection:
            raise ValueError("Database connection not initialized")

        query = """
            UPDATE candidate_documents
            SET last_processed = NOW(),
                processing_status = %s
            WHERE id = %s
        """
        
        try:
            cursor = self.db_connection.cursor()
            cursor.execute(query, (status, doc_id))
            self.db_connection.commit()
        except Exception as e:
            self.logger.error(f"Error updating processing status: {str(e)}")
            raise 