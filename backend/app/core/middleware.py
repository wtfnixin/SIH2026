"""
Security Headers Middleware.
Attaches OWASP-recommended security headers to all incoming HTTP requests.
"""
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)

        # Enforce MIME type sniffing prevention
        response.headers["X-Content-Type-Options"] = "nosniff"

        # Prevent clickjacking / framing attacks
        response.headers["X-Frame-Options"] = "DENY"

        # Enable XSS protection for older user agents
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # Referrer leakage protection
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Permissions policy
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"

        return response
