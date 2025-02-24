from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CandidateViewSet, CandidateUploadView, filter_candidates

router = DefaultRouter()
router.register(r'candidates', CandidateViewSet, basename='candidate')

urlpatterns = [
    path('', include(router.urls)),
    path('upload/', CandidateUploadView.as_view(), name='upload-cv'),
     path('filter/', filter_candidates, name='filter-candidates'),
]
