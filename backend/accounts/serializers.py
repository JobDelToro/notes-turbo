"""Serializers for registration, login and the current-user payload."""

from __future__ import annotations

from django.contrib.auth import get_user_model, password_validation
from rest_framework import serializers

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Read-only public shape of a user (id, email, joined date)."""

    class Meta:
        model = User
        fields = ["id", "email", "date_joined"]
        read_only_fields = fields


class RegisterSerializer(serializers.ModelSerializer):
    """Validate and create a user; email is normalised and checked case-insensitively,
    and the password runs through Django's validators."""

    # Declared explicitly so uniqueness is enforced case-insensitively below,
    # instead of by the model's case-sensitive UniqueValidator.
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, style={"input_type": "password"})

    class Meta:
        model = User
        fields = ["id", "email", "password"]

    def validate_email(self, value: str) -> str:
        value = value.lower()
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate_password(self, value: str) -> str:
        password_validation.validate_password(value)
        return value

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class LoginSerializer(serializers.Serializer):
    """Validate login input; lowercases the email to match stored addresses."""

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, style={"input_type": "password"})

    def validate_email(self, value: str) -> str:
        return value.lower()
