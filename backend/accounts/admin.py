from django.contrib import admin

from .models import User


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ["email", "is_staff", "is_active", "date_joined"]
    search_fields = ["email"]
    ordering = ["-date_joined"]
