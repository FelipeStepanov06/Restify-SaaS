import sqlite3
from fastapi import FastAPI
from models import restify
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
def criacao_alimento(nova_comida: restify):
    conexao = sqlite3.connect("restify.db")
    cursor = conexao.cursor()

    cursor.execute('''
        INSERT INTO restify (name,cat,price,img) VALUES (?,?,?,?)
''',(nova_comida.name,nova_comida.cat,nova_comida.price,nova_comida.img))

    conexao.commit()
    conexao.close()


@app.post("/products")
def criacao_alimento(nova_comida: restify):
    conexao = sqlite3.connect("restify.db")
    cursor = conexao.cursor()

    cursor.execute('''
        INSERT INTO restify (name,cat,price,img) VALUES (?,?,?,?)
''',(nova_comida.name,nova_comida.cat,nova_comida.price,nova_comida.img))

@app.post("/ingredients")
def criacao_alimento(nova_comida: restify):
    conexao = sqlite3.connect("restify.db")
    cursor = conexao.cursor()

    cursor.execute('''
        INSERT INTO restify (name,cat,price,img) VALUES (?,?,?,?)
''',(nova_comida.name,nova_comida.cat,nova_comida.price,nova_comida.img))
        
# @app.get("/")