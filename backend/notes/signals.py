"""Signal receivers for the notes app."""

from __future__ import annotations

from .models import Category

# The four fixed, color-coded categories from the design (exact palette hexes).
DEFAULT_CATEGORIES: list[tuple[str, str]] = [
    ("Random Thoughts", "#EF9C66"),
    ("School", "#FCDC94"),
    ("Personal", "#78ABA8"),
    ("Drama", "#C8CFA0"),
]


def seed_default_categories(sender, instance, created, **kwargs) -> None:
    """Give every newly-created user their four default categories."""
    if not created:
        return
    Category.objects.bulk_create(
        [Category(user=instance, name=name, color=color) for name, color in DEFAULT_CATEGORIES],
        ignore_conflicts=True,
    )
