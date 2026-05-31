"""
============================================================================
 RESTIFY — FastAPI Backend (Security Hardened)
 ============================================================================
 Routes are separated into:
   /api/auth/    — Login (public)
   /api/public/  — Read-only + order creation (totem, no auth required)
   /api/admin/   — Full CRUD (admin panel, requires JWT)
 
 Key security measures:
   - JWT authentication on all admin routes
   - Server-side price recalculation on orders (never trusts frontend prices)
   - CORS restricted to known origins
   - Input validation via Pydantic (positive prices, non-negative quantities)
   - Rate limiting via SlowAPI
============================================================================
"""

import sqlite3
import json
import os
import shutil
import uuid
from fastapi import FastAPI, HTTPException, Depends, Request, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from models import (
    ProdutoSchema, PedidoFinalizado, IngredienteSchema,
    LoginRequest, ModDetail
)
from auth import require_admin, authenticate_user, create_access_token


# ============================================================================
# APP SETUP
# ============================================================================

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="Restify API", version="2.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# CORS — Restricted to known origins (VULN-03 fix)
# Add your production domain here when deploying
ALLOWED_ORIGINS = [
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://localhost:5501",
    "http://127.0.0.1:5501",
    "http://localhost:5502",
    "http://127.0.0.1:5502",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "null"  # Para acessos via file:///
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

DB_PATH = "restify.db"


def get_db():
    """Creates a new database connection for each request."""
    conexao = sqlite3.connect(DB_PATH)
    conexao.row_factory = sqlite3.Row
    return conexao


# ============================================================================
# AUTHENTICATION — /api/auth/
# ============================================================================

@app.post("/api/auth/login")
@limiter.limit("10/minute")
def login(request: Request, dados: LoginRequest):
    """
    Authenticates an admin user and returns a JWT token.
    Rate limited to 10 attempts per minute to prevent brute force.
    """
    user = authenticate_user(dados.username, dados.password)
    if not user:
        raise HTTPException(status_code=401, detail="Usuário ou senha inválidos")

    token = create_access_token(data={"sub": user["username"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "username": user["username"]
    }


# ============================================================================
# PUBLIC ROUTES — /api/public/ (No authentication required)
# ============================================================================

@app.get("/api/public/products")
@limiter.limit("60/minute")
def listar_produtos_publico(request: Request):
    """Returns product list for the totem. No auth required."""
    conexao = get_db()
    cursor = conexao.cursor()
    cursor.execute("SELECT id, name, price, cat, img, default_ingredients FROM Produtos")
    rows = cursor.fetchall()
    conexao.close()

    produtos = []
    for row in rows:
        di = row["default_ingredients"]
        try:
            default_ingredients = json.loads(di) if di else []
        except (json.JSONDecodeError, TypeError):
            default_ingredients = []

        produtos.append({
            "id": row["id"],
            "name": row["name"],
            "price": row["price"],
            "cat": row["cat"],
            "img": row["img"],
            "default_ingredients": default_ingredients
        })

    return produtos


@app.get("/api/public/ingredients")
@limiter.limit("60/minute")
def listar_ingredientes_publico(request: Request):
    """
    Returns ingredients for the totem.
    Note: Totem sees stock and price to display availability and extras cost.
    """
    conexao = get_db()
    cursor = conexao.cursor()
    cursor.execute("SELECT id, name, price, img, cats, stock FROM Ingredientes")
    rows = cursor.fetchall()
    conexao.close()

    ingredientes = []
    for row in rows:
        cats_value = row["cats"]
        try:
            cats_list = json.loads(cats_value) if cats_value else []
        except (json.JSONDecodeError, TypeError):
            cats_list = []

        ingredientes.append({
            "id": row["id"],
            "name": row["name"],
            "price": row["price"],
            "img": row["img"],
            "cats": cats_list,
            "stock": row["stock"] if row["stock"] is not None else 0
        })

    return ingredientes


@app.get("/api/public/categories")
@limiter.limit("60/minute")
def listar_categorias_publico(request: Request):
    """Returns category list for the totem."""
    conexao = get_db()
    cursor = conexao.cursor()
    cursor.execute("SELECT id, name FROM Categorias")
    categorias = [dict(row) for row in cursor.fetchall()]
    conexao.close()

    if len(categorias) == 0:
        return [
            {"id": "menu", "name": "Menu"},
            {"id": "promos", "name": "Promoções"},
            {"id": "popular", "name": "Mais pedidos"},
            {"id": "comida", "name": "Comida"},
            {"id": "acomp", "name": "Acompanhamentos"},
            {"id": "bebidas", "name": "Bebidas"},
            {"id": "sobremesas", "name": "Sobremesas"}
        ]
    return categorias


@app.get("/api/public/top-product")
@limiter.limit("60/minute")
def top_produto_publico(request: Request):
    """Returns the most ordered product ID to display in the carousel."""
    conexao = get_db()
    cursor = conexao.cursor()
    cursor.execute("SELECT items FROM PedidoFinalizado")
    pedidos = cursor.fetchall()
    conexao.close()
    
    product_counts = {}
    for p in pedidos:
        try:
            items = json.loads(p["items"])
            for item in items:
                pid = item.get("productId")
                if pid:
                    product_counts[pid] = product_counts.get(pid, 0) + item.get("qty", 1)
        except:
            continue
            
    if not product_counts:
        return {"productId": None}
        
    top_pid = max(product_counts, key=product_counts.get)
    return {"productId": top_pid}


@app.post("/api/public/orders")
@limiter.limit("30/minute")
def criar_pedido_publico(request: Request, pedido: PedidoFinalizado):
    """
    Creates a new order from the totem.
    
    SECURITY: Server-side price recalculation (VULN-02 fix).
    The frontend sends basePrice/extras/total, but we IGNORE them
    and recalculate everything from the database.
    """
    conexao = get_db()
    cursor = conexao.cursor()

    recalculated_total = 0.0
    validated_items = []

    for item in pedido.items:
        # 1. Fetch the REAL product price from the database
        cursor.execute("SELECT id, name, price, img FROM Produtos WHERE id = ?", (item.productId,))
        product_row = cursor.fetchone()
        if product_row is None:
            conexao.close()
            raise HTTPException(
                status_code=400,
                detail=f"Produto com ID {item.productId} não encontrado"
            )

        real_base_price = product_row["price"]

        # 2. Calculate extras from REAL ingredient prices in the database
        real_extras = 0.0
        validated_mods_detail = []

        for mod in item.modsDetail:
            cursor.execute("SELECT name, price, stock FROM Ingredientes WHERE name = ?", (mod.name,))
            ing_row = cursor.fetchone()
            if ing_row:
                # Validate stock availability
                if ing_row["stock"] is not None and ing_row["stock"] < mod.qty:
                    conexao.close()
                    raise HTTPException(
                        status_code=400,
                        detail=f"Ingrediente '{mod.name}' sem estoque suficiente (disponível: {ing_row['stock']}, solicitado: {mod.qty})"
                    )
                real_extras += ing_row["price"] * mod.qty
                validated_mods_detail.append({"name": mod.name, "qty": mod.qty})

        # 3. Recalculate item total with REAL prices
        item_total = (real_base_price + real_extras) * item.qty
        recalculated_total += item_total

        validated_items.append({
            "productId": item.productId,
            "name": product_row["name"],  # Use real name from DB
            "img": product_row["img"],
            "basePrice": real_base_price,  # Real price from DB
            "extras": real_extras,          # Real extras from DB
            "mods": item.mods,
            "modsDetail": validated_mods_detail,
            "qty": item.qty
        })

    # 4. Save order with SERVER-CALCULATED total
    itens_como_texto = json.dumps(validated_items)
    cursor.execute(
        "INSERT INTO PedidoFinalizado (items, total, dineOption, timestamp) VALUES (?, ?, ?, ?)",
        (itens_como_texto, recalculated_total, pedido.dineOption, pedido.timestamp)
    )
    id_gerado = cursor.lastrowid

    # 5. Deduct stock for EXTRA ingredients selected by customer
    for v_item in validated_items:
        if v_item["modsDetail"]:
            for mod in v_item["modsDetail"]:
                deduct_qty = mod["qty"] * v_item["qty"]
                cursor.execute(
                    "UPDATE Ingredientes SET stock = MAX(stock - ?, 0) WHERE name = ?",
                    (deduct_qty, mod["name"])
                )

        # 6. Deduct stock for DEFAULT ingredients of the product
        cursor.execute(
            "SELECT default_ingredients FROM Produtos WHERE id = ?",
            (v_item["productId"],)
        )
        row = cursor.fetchone()
        if row and row["default_ingredients"]:
            try:
                defaults = json.loads(row["default_ingredients"])
                for di in defaults:
                    ing_id = di.get("ingredientId")
                    di_qty = di.get("qty", 1) * v_item["qty"]
                    if ing_id:
                        cursor.execute(
                            "UPDATE Ingredientes SET stock = MAX(stock - ?, 0) WHERE id = ?",
                            (di_qty, ing_id)
                        )
            except (json.JSONDecodeError, TypeError):
                pass

    conexao.commit()
    conexao.close()

    return {
        "id": id_gerado,
        "total": round(recalculated_total, 2),
        "status": "sucesso"
    }


# ============================================================================
# ADMIN ROUTES — /api/admin/ (Requires JWT authentication)
# ============================================================================

# --- Products CRUD ---

@app.get("/api/admin/products", dependencies=[Depends(require_admin)])
@limiter.limit("120/minute")
def listar_produtos_admin(request: Request):
    """Admin view of products (same data, but auth-protected)."""
    conexao = get_db()
    cursor = conexao.cursor()
    cursor.execute("SELECT id, name, price, cat, img, default_ingredients FROM Produtos")
    rows = cursor.fetchall()
    conexao.close()

    produtos = []
    for row in rows:
        di = row["default_ingredients"]
        try:
            default_ingredients = json.loads(di) if di else []
        except (json.JSONDecodeError, TypeError):
            default_ingredients = []

        produtos.append({
            "id": row["id"],
            "name": row["name"],
            "price": row["price"],
            "cat": row["cat"],
            "img": row["img"],
            "default_ingredients": default_ingredients
        })

    return produtos


@app.post("/api/admin/products", dependencies=[Depends(require_admin)])
@limiter.limit("120/minute")
def cadastrar_produto(request: Request, produto: ProdutoSchema):
    conexao = get_db()
    cursor = conexao.cursor()
    di_json = json.dumps([d.model_dump() for d in produto.default_ingredients])
    cursor.execute(
        "INSERT INTO Produtos (name, price, cat, img, default_ingredients) VALUES (?, ?, ?, ?, ?)",
        (produto.name, produto.price, produto.cat, produto.img, di_json)
    )
    id_gerado = cursor.lastrowid
    conexao.commit()
    conexao.close()
    return {"id": id_gerado, "status": "sucesso"}


@app.put("/api/admin/products/{product_id}", dependencies=[Depends(require_admin)])
@limiter.limit("120/minute")
def atualizar_produto(request: Request, product_id: int, produto: ProdutoSchema):
    conexao = get_db()
    cursor = conexao.cursor()
    di_json = json.dumps([d.model_dump() for d in produto.default_ingredients])
    cursor.execute(
        "UPDATE Produtos SET name=?, price=?, cat=?, img=?, default_ingredients=? WHERE id=?",
        (produto.name, produto.price, produto.cat, produto.img, di_json, product_id)
    )
    conexao.commit()
    conexao.close()
    return {"id": product_id, "status": "atualizado"}


@app.delete("/api/admin/products/{product_id}", dependencies=[Depends(require_admin)])
@limiter.limit("120/minute")
def deletar_produto(request: Request, product_id: int):
    conexao = get_db()
    cursor = conexao.cursor()
    cursor.execute("DELETE FROM Produtos WHERE id=?", (product_id,))
    conexao.commit()
    conexao.close()
    return {"id": product_id, "status": "deletado"}


# --- Ingredients CRUD ---

@app.get("/api/admin/ingredients", dependencies=[Depends(require_admin)])
@limiter.limit("120/minute")
def listar_ingredientes_admin(request: Request):
    """Admin view of ingredients."""
    conexao = get_db()
    cursor = conexao.cursor()
    cursor.execute("SELECT id, name, price, img, cats, stock FROM Ingredientes")
    rows = cursor.fetchall()
    conexao.close()

    ingredientes = []
    for row in rows:
        cats_value = row["cats"]
        try:
            cats_list = json.loads(cats_value) if cats_value else []
        except (json.JSONDecodeError, TypeError):
            cats_list = []

        ingredientes.append({
            "id": row["id"],
            "name": row["name"],
            "price": row["price"],
            "img": row["img"],
            "cats": cats_list,
            "stock": row["stock"] if row["stock"] is not None else 0
        })

    return ingredientes


@app.post("/api/admin/ingredients", dependencies=[Depends(require_admin)])
@limiter.limit("120/minute")
def cadastrar_ingrediente(request: Request, ingrediente: IngredienteSchema):
    conexao = get_db()
    cursor = conexao.cursor()
    cats_json = json.dumps(ingrediente.cats)
    cursor.execute(
        "INSERT INTO Ingredientes (name, price, img, cats, stock) VALUES (?, ?, ?, ?, ?)",
        (ingrediente.name, ingrediente.price, ingrediente.img, cats_json, ingrediente.stock)
    )
    id_gerado = cursor.lastrowid
    conexao.commit()
    conexao.close()
    return {"id": id_gerado, "status": "sucesso"}


@app.put("/api/admin/ingredients/{ingredient_id}", dependencies=[Depends(require_admin)])
@limiter.limit("120/minute")
def atualizar_ingrediente(request: Request, ingredient_id: int, ingrediente: IngredienteSchema):
    conexao = get_db()
    cursor = conexao.cursor()
    cats_json = json.dumps(ingrediente.cats)
    cursor.execute(
        "UPDATE Ingredientes SET name=?, price=?, img=?, cats=?, stock=? WHERE id=?",
        (ingrediente.name, ingrediente.price, ingrediente.img, cats_json, ingrediente.stock, ingredient_id)
    )
    conexao.commit()
    conexao.close()
    return {"id": ingredient_id, "status": "atualizado"}


@app.delete("/api/admin/ingredients/{ingredient_id}", dependencies=[Depends(require_admin)])
@limiter.limit("120/minute")
def deletar_ingrediente(request: Request, ingredient_id: int):
    conexao = get_db()
    cursor = conexao.cursor()
    cursor.execute("DELETE FROM Ingredientes WHERE id=?", (ingredient_id,))
    conexao.commit()
    conexao.close()
    return {"id": ingredient_id, "status": "deletado"}


# --- Orders (Admin read-only) ---

@app.get("/api/admin/orders", dependencies=[Depends(require_admin)])
@limiter.limit("120/minute")
def listar_pedidos_admin(request: Request):
    """Admin view of all orders."""
    conexao = get_db()
    cursor = conexao.cursor()
    cursor.execute("SELECT id, items, total, dineOption, timestamp FROM PedidoFinalizado")
    pedidos = cursor.fetchall()
    conexao.close()

    pedidos_formatados = []
    for p in pedidos:
        pedidos_formatados.append({
            "id": p["id"],
            "items": json.loads(p["items"]),
            "total": p["total"],
            "dineOption": p["dineOption"],
            "timestamp": p["timestamp"]
        })
    return pedidos_formatados


# --- Image Upload ---

@app.post("/api/admin/upload-image", dependencies=[Depends(require_admin)])
@limiter.limit("60/minute")
def upload_image(request: Request, file: UploadFile = File(...)):
    """Receives an image file, saves it, and returns the public URL."""
    ext = os.path.splitext(file.filename)[1]
    if not ext:
        ext = ".png"
        
    unique_filename = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    base_url = str(request.base_url).rstrip("/")
    return {"url": f"{base_url}/uploads/{unique_filename}"}


# --- Price Estimation (Admin only) ---

@app.post("/api/admin/estimate-price", dependencies=[Depends(require_admin)])
@limiter.limit("120/minute")
def estimar_preco(request: Request, ingredientes_selecionados: list[dict]):
    """
    Receives [{ingredientId, qty}] and returns cost breakdown + suggested price.
    Admin only — this exposes cost margins.
    """
    conexao = get_db()
    cursor = conexao.cursor()

    custo_total = 0.0
    detalhes = []

    for item in ingredientes_selecionados:
        ing_id = item.get("ingredientId")
        qty = item.get("qty", 1)
        cursor.execute("SELECT name, price FROM Ingredientes WHERE id = ?", (ing_id,))
        row = cursor.fetchone()
        if row:
            custo_item = row["price"] * qty
            custo_total += custo_item
            detalhes.append({
                "name": row["name"],
                "qty": qty,
                "unitPrice": row["price"],
                "subtotal": custo_item
            })

    conexao.close()

    # Margem padrão: ingredientes são ~30-35% do preço final em fast food
    mao_de_obra = custo_total * 0.40
    margem_lucro = custo_total * 0.80
    preco_sugerido = custo_total + mao_de_obra + margem_lucro

    return {
        "custoIngredientes": round(custo_total, 2),
        "maoDeObra": round(mao_de_obra, 2),
        "margemLucro": round(margem_lucro, 2),
        "precoSugerido": round(preco_sugerido, 2),
        "detalhes": detalhes
    }


# ============================================================================
# BACKWARD COMPATIBILITY REDIRECTS
# ============================================================================
# These keep old URLs working during transition. Remove after migration.

@app.get("/products")
def compat_products(request: Request):
    return listar_produtos_publico(request)

@app.get("/ingredients")
def compat_ingredients(request: Request):
    return listar_ingredientes_publico(request)

@app.get("/categories")
def compat_categories(request: Request):
    return listar_categorias_publico(request)