import time

from starlette.middleware.base import BaseHTTPMiddleware

from app.services.audit_service import record_request_audit


class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        started_at = time.perf_counter()
        status_code = 500

        try:
            response = await call_next(request)
            status_code = response.status_code
            return response
        finally:
            await record_request_audit(
                request=request,
                status_code=status_code,
                started_at=started_at,
            )

