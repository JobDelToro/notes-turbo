"""Project-wide DRF exception handling.

Wraps DRF error responses in a consistent envelope so clients always receive
``{"error": {"code", "message", "details?"}}`` regardless of the failure.
"""

from __future__ import annotations

from rest_framework.views import exception_handler as drf_exception_handler


def custom_exception_handler(exc, context):
    response = drf_exception_handler(exc, context)
    if response is None:
        return None

    data = response.data
    code = getattr(exc, "default_code", "error")
    message = "Request failed."
    details = None

    if isinstance(data, dict) and set(data.keys()) == {"detail"}:
        message = str(data["detail"])
    elif isinstance(data, list):
        details = data
        if data:
            message = str(data[0])
    elif isinstance(data, dict):
        details = data
        # Surface the first field error as a human-friendly message.
        first = next(iter(data.values()), None)
        if isinstance(first, (list, tuple)) and first:
            message = str(first[0])
        elif isinstance(first, str):
            message = first

    payload: dict = {"error": {"code": code, "message": message}}
    if details is not None:
        payload["error"]["details"] = details
    response.data = payload
    return response
