import sqlite3
from passlib.context import CryptContext

# Password hashing context (bcrypt)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

DB_PATH = "restify.db"

def inicializar_banco():
    """Initializes all tables and seeds default admin user."""
    conexao = sqlite3.connect(DB_PATH)
    cursor = conexao.cursor()

    # Enable WAL mode for better concurrent read/write performance (VULN-11 fix)
    cursor.execute("PRAGMA journal_mode=WAL;")

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS PedidoFinalizado (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            items TEXT NOT NULL,       -- Guarda o JSON do carrinho
            total REAL NOT NULL,       -- Valor total da compra (recalculado pelo servidor)
            dineOption TEXT,           -- Comer aqui ou Levar
            timestamp TEXT,            -- Data e hora
            status TEXT DEFAULT 'pendente' 
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS Produtos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            price REAL NOT NULL CHECK(price > 0),
            cat TEXT NOT NULL,         -- Categoria (ex: 'comida', 'bebidas')
            img TEXT,                  -- Link da imagem
            default_ingredients TEXT DEFAULT '[]' -- JSON com ingredientes padrão [{ingredientId, qty}]
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS Categorias (
            id TEXT PRIMARY KEY,      
            name TEXT NOT NULL         
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS Ingredientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            price REAL NOT NULL CHECK(price >= 0),
            img TEXT,
            cats TEXT,                 -- JSON array de categorias (ex: '["comida","promos"]')
            stock INTEGER DEFAULT 0 CHECK(stock >= 0)
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS AdminUsers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            hashed_password TEXT NOT NULL
        )
    ''')

    # Seed default admin user if none exists
    cursor.execute("SELECT COUNT(*) FROM AdminUsers")
    if cursor.fetchone()[0] == 0:
        hashed = pwd_context.hash("restify2026")
        cursor.execute(
            "INSERT INTO AdminUsers (username, hashed_password) VALUES (?, ?)",
            ("admin", hashed)
        )

    conexao.commit()
    conexao.close()

inicializar_banco()