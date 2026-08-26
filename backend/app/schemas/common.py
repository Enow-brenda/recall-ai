from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class Pagination(BaseModel):
    page: int
    page_size: int
    total_items: int
    total_pages: int


# generic response dto for all endpoints
class ApiResponse(BaseModel, Generic[T]):
    success: bool
    status_code: int
    message: str = ""
    data: T | None = None
    errors: str | None = None
    pagination: Pagination | None = None


def ok(data, message="Success", status=200):
    return ApiResponse(success=True, status_code=status, message=message, data=data)


def created(data, message="Created"):
    return ApiResponse(success=True, status_code=201, message=message, data=data)


def paginated(data, page, page_size, total_items, message="Fetched"):
    if page_size <= 0:
        page_size = 1
    total_pages = (total_items + page_size - 1) // page_size
    pagination = Pagination(
        page=page,
        page_size=page_size,
        total_items=total_items,
        total_pages=total_pages,
    )
    return ApiResponse(success=True, status_code=200, message=message, data=data, pagination=pagination)


def fail(status, message, errors=None):
    return ApiResponse(success=False, status_code=status, message=message, errors=errors)


def not_found(message="Not Found"):
    return fail(404, message)


def bad_request(message="Bad Request", errors=None):
    return fail(400, message, errors)
