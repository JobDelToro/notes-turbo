"""Default categories are seeded per user and listed with note counts."""

from __future__ import annotations

import pytest

from notes.models import Note

pytestmark = pytest.mark.django_db


def test_new_user_gets_four_default_categories_with_exact_colors(user):
    colors = dict(user.categories.values_list("name", "color"))
    assert colors == {
        "Random Thoughts": "#EF9C66",
        "School": "#FCDC94",
        "Personal": "#78ABA8",
        "Drama": "#C8CFA0",
    }


def test_categories_list_is_scoped_and_counted(auth_api, user, other_user):
    school = user.categories.get(name="School")
    Note.objects.create(user=user, category=school, title="a")
    Note.objects.create(user=user, category=school, title="b")
    # Another user's note must not leak into our counts.
    Note.objects.create(user=other_user, category=other_user.categories.first(), title="x")

    resp = auth_api.get("/api/categories/")
    assert resp.status_code == 200
    assert len(resp.data) == 4
    counts = {c["name"]: c["note_count"] for c in resp.data}
    assert counts["School"] == 2
    assert counts["Personal"] == 0
