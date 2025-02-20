from rest_framework.response import Response
from rest_framework import status, viewsets, filters
from .models import Candidate
from .serializers import CandidateSerializer

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

