# Small helpers for HTTP-layer concerns.
# Keeping these tiny prevents copy/paste across controllers.

from fastapi import HTTPException


def internal_server_error() -> HTTPException:
    return HTTPException(status_code=500, detail="Internal server error")
