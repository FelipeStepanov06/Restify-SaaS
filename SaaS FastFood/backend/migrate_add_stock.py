
import sqlite3

conexao = sqlite3.connect('restify.db')
cursor = conexao.cursor()

try:
    cursor.execute("ALTER TABLE Ingredientes ADD COLUMN stock INTEGER DEFAULT 0")
    conexao.commit()
    print("Coluna 'stock' adicionada com sucesso na tabela Ingredientes!")
except sqlite3.OperationalError as e:
    if "duplicate column name" in str(e):
        print("A coluna 'stock' já existe. Nada a fazer.")
    else:
        print(f"Erro: {e}")

conexao.close()
