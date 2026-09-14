from pydantic import BaseModel


class SupportRequest(BaseModel):
    name: str = ""
    email: str = ""
    category: str = ""
    message: str
