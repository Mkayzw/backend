# Optional helper exceptions.
# You can raise these from Services (pure Python) and convert them into HTTP errors in Controllers.

class ServiceError(Exception):
    """Base error for service-layer failures."""


class NotFoundError(ServiceError):
    """Raised when a requested entity doesn't exist."""


class ConflictError(ServiceError):
    """Raised when an entity already exists (e.g. duplicate email)."""
