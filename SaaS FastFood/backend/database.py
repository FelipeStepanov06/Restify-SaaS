import sqlite3

conexao = sqlite3.connect('restify.db')
cursor = conexao.cursor()


cursor.execute('''
    CREATE TABLE IF NOT EXISTS restify(
               id INT PRIMARY KEY AUTOINCREMENT,
               name VARCHAR(100) NOT NULL,
               price FLOAT NOT NULL,
               cat VARCHAR(100) NOT NULL,
               img TEXT NOT NULL )
''')