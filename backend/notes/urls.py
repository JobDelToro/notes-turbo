from django.urls import path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("notes", views.NoteViewSet, basename="note")
router.register("categories", views.CategoryViewSet, basename="category")

urlpatterns = [
    path("ai/categorize", views.AICategorizeView.as_view(), name="ai-categorize"),
    path("ai/summarize", views.AISummarizeView.as_view(), name="ai-summarize"),
    *router.urls,
]
