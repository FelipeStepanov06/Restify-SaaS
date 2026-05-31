from pydantic import BaseModel, Field
from typing import List, Optional


# Ingrediente padrão dentro de um produto (ex: 1x Alface, 2x Queijo)
class DefaultIngredient(BaseModel):
    ingredientId: int
    qty: int = Field(ge=1, description="Quantity must be at least 1")


# Model for creating/updating a Product (sent from admin panel)
class ProdutoSchema(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    price: float = Field(gt=0, description="Price must be greater than zero")
    cat: str = Field(min_length=1)
    img: str
    default_ingredients: List[DefaultIngredient] = []  # Ingredientes que compõem o produto


# Structured detail for ingredient modifications in an order
class ModDetail(BaseModel):
    name: str
    qty: int = Field(ge=0, description="Quantity cannot be negative")


# Model for an item inside a finalized order (sent from totem)
class OrderItem(BaseModel):
    productId: int
    name: str
    img: str = ""
    basePrice: float = 0       # Sent by frontend, but IGNORED by backend (recalculated)
    extras: float = 0          # Sent by frontend, but IGNORED by backend (recalculated)
    mods: List[str] = []       # Names of added/modified ingredients
    modsDetail: List[ModDetail] = []  # Typed detail for stock deduction
    qty: int = Field(ge=1, description="Item quantity must be at least 1")


# Model for a finalized order (sent from totem via POST /orders)
class PedidoFinalizado(BaseModel):
    items: List[OrderItem] = Field(min_length=1, description="Order must have at least one item")
    total: float = 0           # Sent by frontend, but IGNORED by backend (recalculated)
    dineOption: str
    timestamp: str


# Model for creating/updating an Ingredient (sent from admin panel)
class IngredienteSchema(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    price: float = Field(ge=0, description="Price must be zero or positive")
    img: str
    cats: List[str]
    stock: int = Field(ge=0, description="Stock cannot be negative")


# Model for admin login
class LoginRequest(BaseModel):
    username: str = Field(min_length=1)
    password: str = Field(min_length=1)