"""Notes CRUD, category filtering and — critically — ownership isolation."""

from __future__ import annotations

import pytest

from notes.models import Note

from .factories import NoteFactory

pytestmark = pytest.mark.django_db


def test_create_note_returns_category_color(auth_api, user):
    school = user.categories.get(name="School")
    resp = auth_api.post(
        "/api/notes/",
        {"title": "Homework", "content": "Math ch.3", "category": school.id},
        format="json",
    )
    assert resp.status_code == 201
    assert resp.data["title"] == "Homework"
    assert resp.data["category_detail"]["color"] == "#FCDC94"
    assert Note.objects.filter(user=user).count() == 1


def test_list_returns_only_own_notes(auth_api, user, other_user):
    NoteFactory(user=user, title="mine")
    NoteFactory(user=other_user, title="theirs")
    resp = auth_api.get("/api/notes/")
    assert resp.status_code == 200
    assert [n["title"] for n in resp.data["results"]] == ["mine"]


def test_filter_by_category(auth_api, user):
    school = user.categories.get(name="School")
    personal = user.categories.get(name="Personal")
    NoteFactory(user=user, category=school, title="s")
    NoteFactory(user=user, category=personal, title="p")
    resp = auth_api.get(f"/api/notes/?category={school.id}")
    assert [n["title"] for n in resp.data["results"]] == ["s"]


def test_invalid_category_param_returns_400_not_500(auth_api):
    resp = auth_api.get("/api/notes/?category=abc")
    assert resp.status_code == 400


def test_patch_note_autosave(auth_api, user):
    note = NoteFactory(user=user, title="draft", content="")
    resp = auth_api.patch(
        f"/api/notes/{note.id}/", {"content": "pour your heart out"}, format="json"
    )
    assert resp.status_code == 200
    note.refresh_from_db()
    assert note.content == "pour your heart out"


def test_delete_note(auth_api, user):
    note = NoteFactory(user=user)
    resp = auth_api.delete(f"/api/notes/{note.id}/")
    assert resp.status_code == 204
    assert not Note.objects.filter(id=note.id).exists()


def test_notes_require_authentication(api):
    assert api.get("/api/notes/").status_code == 401


# --- Ownership isolation: another user's note must appear to not exist (404) ---


def test_cannot_read_another_users_note(auth_api, other_user):
    note = NoteFactory(user=other_user, title="secret")
    assert auth_api.get(f"/api/notes/{note.id}/").status_code == 404


def test_cannot_update_another_users_note(auth_api, other_user):
    note = NoteFactory(user=other_user, title="secret")
    resp = auth_api.patch(f"/api/notes/{note.id}/", {"title": "hacked"}, format="json")
    assert resp.status_code == 404


def test_cannot_delete_another_users_note(auth_api, other_user):
    note = NoteFactory(user=other_user, title="secret")
    assert auth_api.delete(f"/api/notes/{note.id}/").status_code == 404


def test_cannot_assign_another_users_category(auth_api, other_user):
    others_category = other_user.categories.first()
    resp = auth_api.post(
        "/api/notes/",
        {"title": "x", "category": others_category.id},
        format="json",
    )
    assert resp.status_code == 400
