"""Shared pytest fixtures."""

from __future__ import annotations

import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken


@pytest.fixture(autouse=True)
def _reset_throttle_cache():
    """Throttle counters live in the cache; clear it between tests so scoped rate
    limits never bleed across the suite."""
    from django.core.cache import cache

    cache.clear()
    yield


@pytest.fixture
def api() -> APIClient:
    return APIClient()


@pytest.fixture
def user(db, django_user_model):
    return django_user_model.objects.create_user(
        email="alice@example.com", password="Sup3r-secret-123"
    )


@pytest.fixture
def other_user(db, django_user_model):
    return django_user_model.objects.create_user(
        email="bob@example.com", password="Sup3r-secret-123"
    )


@pytest.fixture
def auth_api(api, user) -> APIClient:
    """An API client authenticated as ``user`` via a Bearer token."""
    token = RefreshToken.for_user(user).access_token
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return api
