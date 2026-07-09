"""factory-boy factories for tests."""

from __future__ import annotations

import factory
from django.contrib.auth import get_user_model

from notes.models import Note


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = get_user_model()
        skip_postgeneration_save = True

    email = factory.Sequence(lambda n: f"user{n}@example.com")
    password = factory.django.Password("Sup3r-secret-123")


class NoteFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Note

    title = factory.Sequence(lambda n: f"Note {n}")
    content = "Some note content."
