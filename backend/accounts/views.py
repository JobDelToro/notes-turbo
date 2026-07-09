"""Authentication endpoints.

Access + refresh JWTs are delivered as httpOnly cookies so the browser stores
them out of JavaScript's reach (XSS-safe). The frontend never reads the tokens;
it calls ``/auth/me`` to learn whether it is authenticated.
"""

from __future__ import annotations

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import LoginSerializer, RegisterSerializer, UserSerializer

User = get_user_model()


def _set_cookie(response, key, value, max_age):
    """Set one hardened auth cookie (httpOnly; Secure/SameSite/path from settings)."""
    response.set_cookie(
        key=key,
        value=str(value),
        max_age=max_age,
        httponly=True,
        secure=settings.AUTH_COOKIE_SECURE,
        samesite=settings.AUTH_COOKIE_SAMESITE,
        path=settings.AUTH_COOKIE_PATH,
    )


def _issue_tokens(user, response):
    """Attach a fresh access (+ refresh) cookie pair for ``user``."""
    refresh = RefreshToken.for_user(user)
    _set_cookie(
        response,
        settings.AUTH_COOKIE,
        refresh.access_token,
        int(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds()),
    )
    _set_cookie(
        response,
        settings.AUTH_REFRESH_COOKIE,
        refresh,
        int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds()),
    )
    return response


class RegisterView(APIView):
    """Create an account (categories are seeded via a signal) and set the auth cookies."""

    permission_classes = [AllowAny]
    throttle_scope = "auth"

    @extend_schema(request=RegisterSerializer, responses={201: UserSerializer})
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        response = Response({"user": UserSerializer(user).data}, status=status.HTTP_201_CREATED)
        return _issue_tokens(user, response)


class LoginView(APIView):
    """Authenticate by email + password; on success set the httpOnly cookie pair."""

    permission_classes = [AllowAny]
    throttle_scope = "auth"

    @extend_schema(request=LoginSerializer, responses={200: UserSerializer})
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = authenticate(
            request,
            username=serializer.validated_data["email"],
            password=serializer.validated_data["password"],
        )
        if user is None:
            return Response(
                {"detail": "Invalid email or password."}, status=status.HTTP_401_UNAUTHORIZED
            )
        response = Response({"user": UserSerializer(user).data})
        return _issue_tokens(user, response)


class LogoutView(APIView):
    """Clear the auth cookies and blacklist the presented refresh token (best-effort)."""

    permission_classes = [AllowAny]

    def post(self, request):
        response = Response(status=status.HTTP_205_RESET_CONTENT)
        raw_refresh = request.COOKIES.get(settings.AUTH_REFRESH_COOKIE)
        if raw_refresh:
            try:
                RefreshToken(raw_refresh).blacklist()
            except TokenError:
                pass
        response.delete_cookie(settings.AUTH_COOKIE, path=settings.AUTH_COOKIE_PATH)
        response.delete_cookie(settings.AUTH_REFRESH_COOKIE, path=settings.AUTH_COOKIE_PATH)
        return response


class RefreshView(APIView):
    """Mint a new access cookie from the refresh cookie, rotating the refresh token."""

    permission_classes = [AllowAny]
    throttle_scope = "auth"

    def post(self, request):
        raw_refresh = request.COOKIES.get(settings.AUTH_REFRESH_COOKIE)
        if not raw_refresh:
            return Response({"detail": "No refresh token."}, status=status.HTTP_401_UNAUTHORIZED)
        try:
            refresh = RefreshToken(raw_refresh)
        except TokenError:
            return Response(
                {"detail": "Invalid or expired refresh token."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        response = Response({"detail": "Token refreshed."})
        _set_cookie(
            response,
            settings.AUTH_COOKIE,
            refresh.access_token,
            int(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds()),
        )

        # Rotate the refresh token so a leaked one is single-use, not a 7-day key:
        # blacklist the presented token and issue a fresh one (honours the
        # ROTATE_REFRESH_TOKENS / BLACKLIST_AFTER_ROTATION settings).
        if settings.SIMPLE_JWT.get("ROTATE_REFRESH_TOKENS"):
            if settings.SIMPLE_JWT.get("BLACKLIST_AFTER_ROTATION"):
                try:
                    refresh.blacklist()
                except AttributeError:
                    pass
            refresh.set_jti()
            refresh.set_exp()
            refresh.set_iat()
            _set_cookie(
                response,
                settings.AUTH_REFRESH_COOKIE,
                refresh,
                int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds()),
            )
        return response


class MeView(APIView):
    """Return the current user — the frontend's source of truth for auth state."""

    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: UserSerializer})
    def get(self, request):
        return Response({"user": UserSerializer(request.user).data})
