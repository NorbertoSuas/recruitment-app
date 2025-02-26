from rest_framework.response import Response
from rest_framework import status, viewsets, filters
from .models import Candidate
from .serializers import CandidateSerializer
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.views import APIView
import PyPDF2
import docx
from rest_framework.decorators import api_view
from django.db.models import Q
import requests
from django.conf import settings

class CandidateViewSet(viewsets.ModelViewSet):
    queryset = Candidate.objects.all()
    serializer_class = CandidateSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['first_name', 'last_name', 'email', 'skills', 'location', 'status']
    ordering_fields = ['applied_at', 'first_name']

    def create(self, request, *args, **kwargs):
        first_name = request.data.get("first_name")
        last_name = request.data.get("last_name")
        email = request.data.get("email")
        status_candidate = request.data.get("status")

        # Verifica si ya existe un candidato con la misma información
        existing_candidate = Candidate.objects.filter(
            first_name=first_name,
            last_name=last_name,
            email=email,
            status=status_candidate
        ).first()

        if existing_candidate:
            return Response(
                {"error": "Este candidato ya existe con el mismo estado."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Si no existe, llama al método original para crearlo
        return super().create(request, *args, **kwargs)



class CandidateUploadView(APIView):
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, *args, **kwargs):
        file = request.FILES.get('resume')
        if not file:
            return Response({"error": "No file uploaded"}, status=status.HTTP_400_BAD_REQUEST)

        # Extraer texto del archivo
        text = self.extract_text(file)

        # Crear candidato con datos extraídos
        candidate = Candidate.objects.create(
            name=request.data.get('name', 'Desconocido'),
            email=request.data.get('email', 'unknown@example.com'),
            phone=request.data.get('phone', ''),
            skills=text,
            resume=file
        )

        return Response(CandidateSerializer(candidate).data, status=status.HTTP_201_CREATED)

    def extract_text(self, file):
        """Extrae texto de un archivo PDF o Word"""
        if file.name.endswith('.pdf'):
            return self.extract_text_from_pdf(file)
        elif file.name.endswith('.docx'):
            return self.extract_text_from_docx(file)
        return "Formato no soportado"

    def extract_text_from_pdf(self, file):
        reader = PyPDF2.PdfReader(file)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        return text

    def extract_text_from_docx(self, file):
        doc = docx.Document(file)
        return "\n".join([para.text for para in doc.paragraphs])



@api_view(['GET'])
def filter_candidates(request):
    skills = request.query_params.get('skills', '')  # Habilidades a buscar
    if not skills:
        return Response({"error": "Debes proporcionar habilidades a filtrar"}, status=400)

    skill_list = skills.split(',')  # Convertimos la cadena en lista

    # Filtramos candidatos que contengan alguna de las habilidades
    candidates = Candidate.objects.filter(
        Q(skills__icontains=skill_list[0]) |
        Q(skills__icontains=skill_list[1]) |
        Q(skills__icontains=skill_list[2])  # Puedes ajustar según la cantidad de skills esperada
    )

    return Response(CandidateSerializer(candidates, many=True).data)





@api_view(['GET'])
def search_linkedin_profiles(request):
    query = request.query_params.get('query', '')
    if not query:
        return Response({"error": "Debes proporcionar un término de búsqueda"}, status=400)

    url = f"https://api.linkedin.com/v2/people-search?q={query}"
    headers = {"Authorization": f"Bearer {settings.LINKEDIN_API_KEY}"}

    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        return Response(response.json())
    else:
        return Response({"error": "Error al consultar LinkedIn"}, status=response.status_code)
    
    
    
@api_view(['GET'])
def search_occ_profiles(request):
    query = request.query_params.get('query', '')
    if not query:
        return Response({"error": "Debes proporcionar un término de búsqueda"}, status=400)

    url = f"https://api.occ.com.mx/v1/search?q={query}"
    headers = {"Authorization": f"Bearer {settings.OCC_API_KEY}"}

    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        return Response(response.json())
    else:
        return Response({"error": "Error al consultar OCC"}, status=response.status_code)

@api_view(['POST'])
def post_linkedin_job(request):
    access_token = settings.LINKEDIN_API_KEY
    organization_id = "tu_organization_id"  # ID de la empresa que publica la vacante

    job_data = {
        "company": f"urn:li:organization:{organization_id}",
        "title": request.data.get("title"),
        "description": request.data.get("description"),
        "location": request.data.get("location"),
        "employmentType": request.data.get("employment_type", "FULL_TIME"),
        "applyMethod": {
            "com.linkedin.jobs.OffsiteApply": {
                "companyApplyUrl": request.data.get("apply_url")
            }
        }
    }

    url = "https://api.linkedin.com/v2/jobPostings"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }

    response = requests.post(url, json=job_data, headers=headers)

    if response.status_code == 201:
        return Response({"message": "Vacante publicada en LinkedIn"}, status=201)
    else:
        return Response({"error": "Error al publicar la vacante", "details": response.json()}, status=response.status_code)
