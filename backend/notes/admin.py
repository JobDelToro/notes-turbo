from django.contrib import admin

from .models import Category, Note


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "color", "user"]
    search_fields = ["name", "user__email"]
    raw_id_fields = ["user"]


@admin.register(Note)
class NoteAdmin(admin.ModelAdmin):
    list_display = ["title", "category", "user", "updated_at"]
    list_filter = ["category__name"]
    search_fields = ["title", "content", "user__email"]
    raw_id_fields = ["user", "category"]
