import sqlite3
import json
from fastapi import FastAPI
from models import restify, PedidoFinalizado
from fastapi.middleware.cors import CORSMiddleware



app = FastAPI()


app.add_middleware(

    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods = ["*"],
    allow_headers = ["*"]

)


@app.post("/orders")
def criacao_alimento(pedido: PedidoFinalizado):
    conexao = sqlite3.connect("restify.db")
    cursor = conexao.cursor()
    itens_como_texto = json.dumps([item.model_dump() for item in pedido.items])
    cursor.execute('''
        INSERT INTO PedidoFinalizado (items,total,dineOption,timestamp) VALUES (?,?,?,?)
''',(itens_como_texto,pedido.total,pedido.dineOption,pedido.timestamp))
    
    id_gerado = cursor.lastrowid

    conexao.commit()
    conexao.close()
    
    return {"id": id_gerado, "status": "sucesso"}

@app.post("/products")
def cadastrar_produto(nova_comida: restify):
    conexao = sqlite3.connect("restify.db")
    cursor = conexao.cursor()

    cursor.execute('''
        INSERT INTO Produtos (name,cat,price,img) VALUES (?,?,?,?)
''',(nova_comida.name,nova_comida.cat,nova_comida.price,nova_comida.img))

@app.post("/ingredients")
def cadastrar_ingrediente(nova_comida: restify):
    conexao = sqlite3.connect("restify.db")
    cursor = conexao.cursor()

    cursor.execute('''
        INSERT INTO Ingredientes (name,cat,price,img) VALUES (?,?,?,?)
''',(nova_comida.name,nova_comida.cat,nova_comida.price,nova_comida.img))
        
@app.get("/categories")
def listar_categorias():
    return ["Lanches","Bebidas","Acompanhamentos"]

@app.get("/products")
def listar_produtos():
    conexao = sqlite3.connect("restify.db")
    cursor = conexao.cursor()

    cursor.execute('''
        SELECT id, name, price,cat,img FROM Produtos
''')
    
    produtos = cursor.fetchall()
    conexao.close()
    return produtos

@app.get("/ingredients") 
def listar_ingredientes():
    return []

@app.get("/orders")
def listar_pedidos():
    conexao = sqlite3.connect("restify.db")
    cursor = conexao.cursor()

    cursor.execute('''
        SELECT id, items, total, dineOption, timestamp FROM PedidoFinalizado
    ''')
    
    pedidos = cursor.fetchall()
    conexao.close()
    
   
    pedidos_formatados = []
    for p in pedidos:
        pedidos_formatados.append({
            "id": p[0],
            "items": json.loads(p[1]),
            "total": p[2],
            "dineOption": p[3],
            "timestamp": p[4]
        })
        
    return pedidos_formatados