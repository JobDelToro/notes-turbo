"""Serializers for categories and notes."""

from __future__ import annotations

from rest_framework import serializers

from .models import Category, Note


class CategorySerializer(serializers.ModelSerializer):
    """A user's category with its annotated ``note_count``; fully read-only."""

    note_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Category
        fields = ["id", "name", "color", "note_count"]
        read_only_fields = fields


class CategoryMiniSerializer(serializers.ModelSerializer):
    """Minimal category shape (id/name/color) nested inside a note for rendering."""

    class Meta:
        model = Category
        fields = ["id", "name", "color"]


class NoteSerializer(serializers.ModelSerializer):
    """A note. ``category`` is writable by id; ``category_detail`` is a nested
    read-only view for rendering; a note may only reference a category its owner
    holds (see ``validate_category``). ``user`` is never client-settable."""

    # Nested, read-only view of the category so the client can render the color
    # without a second request; writes still use the plain ``category`` id.
    category_detail = CategoryMiniSerializer(source="category", read_only=True)
    # Bound the write size — the model's TextField is otherwise unbounded, leaving
    # only Django's generic DATA_UPLOAD_MAX_MEMORY_SIZE as a guard (a 400 with no
    # field detail). 100k chars is far beyond any real note yet caps abuse.
    content = serializers.CharField(
        allow_blank=True, trim_whitespace=False, required=False, max_length=100_000
    )

    class Meta:
        model = Note
        fields = [
            "id",
            "title",
            "content",
            "category",
            "category_detail",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "category_detail", "created_at", "updated_at"]

    def validate_category(self, category):
        """A note may only be filed under a category the requester owns."""
        if category is not None:
            request = self.context.get("request")
            if request is not None and category.user_id != request.user.id:
                raise serializers.ValidationError("Invalid category.")
        return category


class AIContentSerializer(serializers.Serializer):
    """Request body for the AI helpers — type-checks and bounds the input.

    Without this, a non-string ``content`` (e.g. a list) would crash the service
    with a 500 on ``.strip()``.
    """

    content = serializers.CharField(allow_blank=True, trim_whitespace=False, max_length=10_000)
