from pydantic import BaseModel
from typing import List, Optional


# Ingrediente padrão dentro de um produto (ex: 1x Alface, 2x Queijo)
class DefaultIngredient(BaseModel):
    ingredientId: int
    qty: int


# Model for creating/updating a Product (sent from admin panel)
class ProdutoSchema(BaseModel):
    name: str
    price: float
    cat: str
    img: str
    default_ingredients: List[DefaultIngredient] = []  # Ingredientes que compõem o produto


# Model for an item inside a finalized order (sent from totem)
class OrderItem(BaseModel):
    productId: int
    name: str
    img: str
    basePrice: float
    extras: float
    mods: List[str]             # Names of added/modified ingredients
    modsDetail: List[dict] = [] # [{name, qty}] detail for stock deduction
    qty: int


# Model for a finalized order (sent from totem via POST /orders)
class PedidoFinalizado(BaseModel):
    items: List[OrderItem]
    total: float
    dineOption: str
    timestamp: str


# Model for creating/updating an Ingredient (sent from admin panel)
class IngredienteSchema(BaseModel):
    name: str
    price: float
    img: str
    cats: List[str]
    stock: int