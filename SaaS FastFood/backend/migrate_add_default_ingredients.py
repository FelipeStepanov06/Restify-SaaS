

import sqlite3

conexao = sqlite3.connect('restify.db')
cursor = conexao.cursor()

try:
    cursor.execute("ALTER TABLE Produtos ADD COLUMN default_ingredients TEXT DEFAULT '[]'")
    conexao.commit()
    print("Coluna 'default_ingredients' adicionada com sucesso na tabela Produtos!")
except sqlite3.OperationalError as e:
    if "duplicate column name" in str(e):
        print("A coluna 'default_ingredients' já existe. Nada a fazer.")
    else:
        print(f"Erro: {e}")

conexao.close()
