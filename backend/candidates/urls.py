from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CandidateViewSet, CandidateUploadView, filter_candidates, post_linkedin_job, search_linkedin_profiles, search_occ_profiles

router = DefaultRouter()
router.register(r'candidates', CandidateViewSet, basename='candidate')

urlpatterns = [
    path('', include(router.urls)),
    path('upload/', CandidateUploadView.as_view(), name='upload-cv'),
    path('filter/', filter_candidates, name='filter-candidates'),
    path('search/linkedin/', search_linkedin_profiles, name='search-linkedin'),
    path('search/occ/', search_occ_profiles, name='search-occ'),
    path('post/linkedin/', post_linkedin_job, name='post-linkedin-job')
]
