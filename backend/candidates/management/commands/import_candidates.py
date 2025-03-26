from django.core.management.base import BaseCommand
from django.core.files.base import ContentFile
from candidates.models import Candidate
from datetime import datetime
import pandas as pd
import csv

class Command(BaseCommand):
    help = 'Import candidates from CSV file'

    def add_arguments(self, parser):
        parser.add_argument('C:/Users/Norbe/OneDrive - Universidad Tecmilenio/Desktop/Innovation meetup/IT_CV_Dataset.csv', type=str, help='Path to the CSV file')

    def handle(self, *args, **options):
        csv_file_path = options['C:/Users/Norbe/OneDrive - Universidad Tecmilenio/Desktop/Innovation meetup/IT_CV_Dataset.csv']
        
        try:
            df = pd.read_csv(csv_file_path)
            
            for _, row in df.iterrows():
                try:
                    candidate = Candidate(
                        first_name=row.get('first_name', ''),  # adjust field names according to your CSV
                        last_name=row.get('last_name', ''),
                        email=row.get('email', ''),
                        phone=row.get('phone', ''),
                        linkedin=row.get('linkedin', ''),
                        experience=row.get('experience', ''),
                        education=row.get('education', ''),
                        location=row.get('location', ''),
                        skills=row.get('skills', ''),
                        status='pending'
                    )
                    candidate.save()
                    self.stdout.write(
                        self.style.HTTP_SUCCESS(f'Successfully imported candidate: {candidate.email}')
                    )
                except Exception as e:
                    self.stdout.write(
                        self.style.WARNING(f'Error importing candidate: {str(e)}')
                    )
                    continue

        except Exception as e:
            self.stdout.write(
                self.style.error(f'Error reading CSV file: {str(e)}')
            )