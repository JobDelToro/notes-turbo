"""Cookie-based JWT authentication.

Reads the access token from an httpOnly cookie (set at login), which keeps the
token out of reach of JavaScript/XSS. Falls back to the standard
``Authorization: Bearer`` header when present, which keeps the browsable API
and header-based tests working.
"""

from __future__ import annotations

from django.conf import settings
from rest_framework_simplejwt.authentication import JWTAuthentication


class CookieJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        header = self.get_header(request)
        raw_token = (
            self.get_raw_token(header)
            if header is not None
            else request.COOKIES.get(settings.AUTH_COOKIE)
        )
        if raw_token is None:
            return None
        validated_token = self.get_validated_token(raw_token)
        return self.get_user(validated_token), validated_token
