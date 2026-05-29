import sqlite3

conexao = sqlite3.connect('restify.db')
cursor = conexao.cursor()

def inicializar_banco():
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS PedidoFinalizado (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            items TEXT NOT NULL,       -- Guarda o JSON do carrinho
            total REAL NOT NULL,       -- Valor total da compra
            dineOption TEXT,           -- Comer aqui ou Levar
            timestamp TEXT,            -- Data e hora
            status TEXT DEFAULT 'pendente' 
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS Produtos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            price REAL NOT NULL,
            cat TEXT NOT NULL,         -- Categoria (ex: 'comida', 'bebidas')
            img TEXT                   -- Link da imagem
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
            price REAL NOT NULL,
            img TEXT,
            cats TEXT                 
        )
    ''')

    conexao.commit()
    conexao.close()
inicializar_banco()