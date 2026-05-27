from pydantic import BaseModel

class restify (BaseModel):
    id: int
    name: str
    price: float
    cat: str
    img: str