import sqlite3
import json
from fastapi import FastAPI, HTTPException
from models import ProdutoSchema, PedidoFinalizado, IngredienteSchema
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

DB_PATH = "restify.db"


def get_db():
    """Creates a new database connection for each request."""
    conexao = sqlite3.connect(DB_PATH)
    conexao.row_factory = sqlite3.Row
    return conexao


# ============================================================================
# PRODUCTS (Produtos)
# ============================================================================

@app.get("/products")
def listar_produtos():
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


@app.post("/products")
def cadastrar_produto(produto: ProdutoSchema):
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


@app.put("/products/{product_id}")
def atualizar_produto(product_id: int, produto: ProdutoSchema):
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


@app.delete("/products/{product_id}")
def deletar_produto(product_id: int):
    conexao = get_db()
    cursor = conexao.cursor()
    cursor.execute("DELETE FROM Produtos WHERE id=?", (product_id,))
    conexao.commit()
    conexao.close()
    return {"id": product_id, "status": "deletado"}


# ============================================================================
# INGREDIENTS (Ingredientes) — CRUD + Estoque
# ============================================================================

@app.get("/ingredients")
def listar_ingredientes():
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


@app.post("/ingredients")
def cadastrar_ingrediente(ingrediente: IngredienteSchema):
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


@app.put("/ingredients/{ingredient_id}")
def atualizar_ingrediente(ingredient_id: int, ingrediente: IngredienteSchema):
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


@app.delete("/ingredients/{ingredient_id}")
def deletar_ingrediente(ingredient_id: int):
    conexao = get_db()
    cursor = conexao.cursor()
    cursor.execute("DELETE FROM Ingredientes WHERE id=?", (ingredient_id,))
    conexao.commit()
    conexao.close()
    return {"id": ingredient_id, "status": "deletado"}


# ============================================================================
# ORDERS (Pedidos) — Com desconto automático de estoque
# ============================================================================

@app.get("/orders")
def listar_pedidos():
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


@app.post("/orders")
def criar_pedido(pedido: PedidoFinalizado):
    conexao = get_db()
    cursor = conexao.cursor()

    itens_como_texto = json.dumps([item.model_dump() for item in pedido.items])

    # 1. Salva o pedido no banco
    cursor.execute(
        "INSERT INTO PedidoFinalizado (items, total, dineOption, timestamp) VALUES (?, ?, ?, ?)",
        (itens_como_texto, pedido.total, pedido.dineOption, pedido.timestamp)
    )
    id_gerado = cursor.lastrowid

    # 2. Desconta estoque dos ingredientes EXTRAS selecionados pelo cliente
    for item in pedido.items:
        # modsDetail contém [{name, qty}] — cada ingrediente extra adicionado
        if item.modsDetail:
            for mod in item.modsDetail:
                deduct_qty = mod.get("qty", 1) * item.qty
                cursor.execute(
                    "UPDATE Ingredientes SET stock = MAX(stock - ?, 0) WHERE name = ?",
                    (deduct_qty, mod.get("name", ""))
                )

        # 3. Desconta estoque dos ingredientes PADRÃO do produto
        cursor.execute(
            "SELECT default_ingredients FROM Produtos WHERE id = ?",
            (item.productId,)
        )
        row = cursor.fetchone()
        if row and row["default_ingredients"]:
            try:
                defaults = json.loads(row["default_ingredients"])
                for di in defaults:
                    ing_id = di.get("ingredientId")
                    di_qty = di.get("qty", 1) * item.qty
                    if ing_id:
                        cursor.execute(
                            "UPDATE Ingredientes SET stock = MAX(stock - ?, 0) WHERE id = ?",
                            (di_qty, ing_id)
                        )
            except (json.JSONDecodeError, TypeError):
                pass

    conexao.commit()
    conexao.close()

    return {"id": id_gerado, "status": "sucesso"}


# ============================================================================
# CATEGORIES (Categorias)
# ============================================================================

@app.get("/categories")
def listar_categorias():
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


# ============================================================================
# PRICE ESTIMATION (Estimativa de Preço)
# ============================================================================

@app.post("/estimate-price")
def estimar_preco(ingredientes_selecionados: list[dict]):
    """
    Recebe uma lista de [{ingredientId, qty}] e retorna
    o custo dos ingredientes + sugestão de preço com margem.
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
    # Ou seja, preço final = custo / 0.30 a 0.35
    mao_de_obra = custo_total * 0.40        # 40% de mão de obra e operação
    margem_lucro = custo_total * 0.80       # 80% de margem de lucro
    preco_sugerido = custo_total + mao_de_obra + margem_lucro

    return {
        "custoIngredientes": round(custo_total, 2),
        "maoDeObra": round(mao_de_obra, 2),
        "margemLucro": round(margem_lucro, 2),
        "precoSugerido": round(preco_sugerido, 2),
        "detalhes": detalhes
    }