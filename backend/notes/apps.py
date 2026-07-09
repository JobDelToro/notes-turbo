from django.apps import AppConfig


class NotesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "notes"

    def ready(self) -> None:
        """Wire the post-save signal that seeds each new user's default categories.

        Connected here (not at import time) so the models are fully loaded, and
        with a ``dispatch_uid`` so it can't be registered twice.
        """
        from django.contrib.auth import get_user_model
        from django.db.models.signals import post_save

        from . import signals

        post_save.connect(
            signals.seed_default_categories,
            sender=get_user_model(),
            dispatch_uid="notes.seed_default_categories",
        )
