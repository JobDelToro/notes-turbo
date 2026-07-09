"""Auth flow: registration, login, cookie session, logout."""

from __future__ import annotations

import pytest

pytestmark = pytest.mark.django_db


def test_register_creates_user_seeds_categories_and_sets_cookies(api, django_user_model):
    resp = api.post(
        "/api/auth/register",
        {"email": "new@example.com", "password": "Sup3r-secret-123"},
        format="json",
    )
    assert resp.status_code == 201
    assert resp.data["user"]["email"] == "new@example.com"

    created = django_user_model.objects.get(email="new@example.com")
    assert set(created.categories.values_list("name", flat=True)) == {
        "Random Thoughts",
        "School",
        "Personal",
        "Drama",
    }
    assert "access_token" in resp.cookies
    assert "refresh_token" in resp.cookies
    assert resp.cookies["access_token"]["httponly"] is True


def test_register_rejects_duplicate_email(api, user):
    resp = api.post(
        "/api/auth/register",
        {"email": user.email, "password": "Sup3r-secret-123"},
        format="json",
    )
    assert resp.status_code == 400


def test_register_rejects_weak_password(api):
    resp = api.post(
        "/api/auth/register",
        {"email": "weak@example.com", "password": "123"},
        format="json",
    )
    assert resp.status_code == 400


def test_login_sets_cookies_and_me_reads_them(api, user):
    login = api.post(
        "/api/auth/login",
        {"email": user.email, "password": "Sup3r-secret-123"},
        format="json",
    )
    assert login.status_code == 200
    assert "access_token" in login.cookies

    # The test client persists the cookie; /me authenticates purely from it.
    me = api.get("/api/auth/me")
    assert me.status_code == 200
    assert me.data["user"]["email"] == user.email


def test_login_rejects_bad_password(api, user):
    resp = api.post(
        "/api/auth/login",
        {"email": user.email, "password": "totally-wrong"},
        format="json",
    )
    assert resp.status_code == 401


def test_me_requires_authentication(api):
    assert api.get("/api/auth/me").status_code == 401


def test_logout_clears_cookies(auth_api):
    resp = auth_api.post("/api/auth/logout")
    assert resp.status_code == 205
    assert resp.cookies["access_token"].value == ""
    assert resp.cookies["refresh_token"].value == ""


def test_logout_blacklists_the_refresh_token(api, user):
    login = api.post(
        "/api/auth/login",
        {"email": user.email, "password": "Sup3r-secret-123"},
        format="json",
    )
    refresh = login.cookies["refresh_token"].value

    assert api.post("/api/auth/logout").status_code == 205

    # Logout blacklists the presented refresh token, so a stolen copy can't
    # outlive the session: replaying it against /refresh is rejected.
    api.cookies["refresh_token"] = refresh
    assert api.post("/api/auth/refresh").status_code == 401


def test_refresh_without_cookie_is_unauthorized(api):
    assert api.post("/api/auth/refresh").status_code == 401


def test_refresh_rotates_and_invalidates_the_old_token(api, user):
    login = api.post(
        "/api/auth/login",
        {"email": user.email, "password": "Sup3r-secret-123"},
        format="json",
    )
    old_refresh = login.cookies["refresh_token"].value

    first = api.post("/api/auth/refresh")
    assert first.status_code == 200
    # Rotation issues a brand-new refresh cookie...
    assert "refresh_token" in first.cookies
    assert first.cookies["refresh_token"].value != old_refresh

    # ...and the old refresh token is blacklisted — replaying it is rejected.
    api.cookies["refresh_token"] = old_refresh
    assert api.post("/api/auth/refresh").status_code == 401


def test_login_is_rate_limited(api):
    creds = {"email": "nobody@example.com", "password": "wrong-password"}
    for _ in range(10):
        api.post("/api/auth/login", creds, format="json")
    # The 11th attempt in the window is throttled (auth scope = 10/min).
    assert api.post("/api/auth/login", creds, format="json").status_code == 429
