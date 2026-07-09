"""API endpoints for categories, notes and the AI helpers.

Every queryset is scoped to ``request.user`` — the whole ownership model. A
request for another user's note simply isn't in the queryset, so it returns
404 (we never leak that the row exists).
"""

from __future__ import annotations

from django.db.models import Count
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import mixins, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Category, Note
from .serializers import AIContentSerializer, CategorySerializer, NoteSerializer
from .services.ai import categorize_note, summarize_note


class NotesPagination(PageNumberPagination):
    """Bounds the notes list so it can never return an unbounded payload."""

    page_size = 100
    page_size_query_param = "page_size"
    max_page_size = 200


class CategoryViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    """Read-only list of the current user's categories, annotated with note counts."""

    serializer_class = CategorySerializer

    def get_queryset(self):
        return (
            Category.objects.filter(user=self.request.user)
            .annotate(note_count=Count("notes"))
            .order_by("id")
        )


@extend_schema_view(
    list=extend_schema(
        parameters=[
            OpenApiParameter(
                "category",
                int,
                description="Filter to notes in this category id.",
                required=False,
            )
        ]
    )
)
class NoteViewSet(viewsets.ModelViewSet):
    """Full CRUD over the current user's notes. Supports ``?category=<id>``."""

    serializer_class = NoteSerializer
    pagination_class = NotesPagination

    def get_queryset(self):
        queryset = Note.objects.filter(user=self.request.user).select_related("category")
        raw_category = self.request.query_params.get("category")
        if raw_category:
            try:
                category_id = int(raw_category)
            except (TypeError, ValueError):
                raise ValidationError({"category": "Must be an integer id."}) from None
            queryset = queryset.filter(category_id=category_id)
        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class AICategorizeView(APIView):
    """Suggest a category for the given note content."""

    throttle_scope = "ai"

    @extend_schema(request=AIContentSerializer)
    def post(self, request):
        serializer = AIContentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        content = serializer.validated_data["content"]
        categories = list(Category.objects.filter(user=request.user).values("id", "name", "color"))
        return Response(categorize_note(content, categories))


class AISummarizeView(APIView):
    """Summarize the given note content in one or two sentences."""

    throttle_scope = "ai"

    @extend_schema(request=AIContentSerializer)
    def post(self, request):
        serializer = AIContentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        content = serializer.validated_data["content"]
        return Response(summarize_note(content))
