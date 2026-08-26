class AppError(Exception):
    status_code = 500
    message = "Internal server error"

    def __init__(self, message: str | None = None):
        self.message = message or self.message


class AuthenticationError(AppError):
    status_code = 401
    message = "Authentication required"


class PermissionDeniedError(AppError):
    status_code = 403
    message = "Permission denied"


class ProviderDisabledError(AppError):
    status_code = 403
    message = "Provider is not available"


class NotFoundError(AppError):
    status_code = 404
    message = "Resource not found"


class ConflictError(AppError):
    status_code = 409
    message = "Conflict"

class InvalidRequestError(AppError):
    status_code = 400
    message = "Invalid request"
