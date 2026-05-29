from pydantic import BaseModel
from typing import List

class restify (BaseModel):
    productId: int
    name: str
    img: str
    basePrice: float
    extras: float
    mods: List[str]
    qty: int

class PedidoFinalizado(BaseModel):
    items: List[restify]
    total: float
    dineOption: str
    timestamp: str