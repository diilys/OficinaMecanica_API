from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from mysql.connector import IntegrityError, DatabaseError

from backend.database import criar_conexao
from backend.schemas import (
    ClienteCreate, ClienteResponse, 
    FuncionarioCreate, FuncionarioResponse,
    VeiculoCreate, VeiculoResponse,
    AdminCreate, AdminResponse,
    LoginRequest
)

app = FastAPI(title="Sistema Oficina Mecânica")

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"

# Montagem de ficheiros estáticos para compatibilidade total com os caminhos dos HTMLs
app.mount("/frontend", StaticFiles(directory=FRONTEND_DIR), name="frontend")
app.mount("/css", StaticFiles(directory=FRONTEND_DIR / "css"), name="css")
app.mount("/js", StaticFiles(directory=FRONTEND_DIR / "js"), name="js")


# ============================================================
# ROTAS HTML (Navegação Estética / URLs Amigáveis)
# ============================================================
@app.get("/", include_in_schema=False)
def pagina_inicial():
    return FileResponse(FRONTEND_DIR / "index.html")

@app.get("/login", include_in_schema=False)
@app.get("/login.html", include_in_schema=False)
def pagina_login():
    return FileResponse(FRONTEND_DIR / "login.html")

@app.get("/painel-admin", include_in_schema=False)
@app.get("/sistema.html", include_in_schema=False)
def pagina_sistema_admin():
    return FileResponse(FRONTEND_DIR / "sistema.html")

@app.get("/cadastro-cliente", include_in_schema=False)
@app.get("/cadastroCliente.html", include_in_schema=False)
def pagina_cadastro_cliente():
    return FileResponse(FRONTEND_DIR / "cadastroCliente.html")

@app.get("/painel-clientes", include_in_schema=False)
@app.get("/clientes.html", include_in_schema=False)
def pagina_clientes():
    return FileResponse(FRONTEND_DIR / "clientes.html")

@app.get("/painel-estoque", include_in_schema=False)
@app.get("/estoque.html", include_in_schema=False)
def pagina_estoque():
    return FileResponse(FRONTEND_DIR / "estoque.html")

@app.get("/painel-ordens", include_in_schema=False)
@app.get("/ordensServico.html", include_in_schema=False)
def pagina_ordens_servico():
    return FileResponse(FRONTEND_DIR / "ordensServico.html")

@app.get("/painel-veiculos", include_in_schema=False)
@app.get("/veiculos.html", include_in_schema=False)
def pagina_veiculos():
    return FileResponse(FRONTEND_DIR / "veiculos.html")

@app.get("/painel-funcionarios", include_in_schema=False)
@app.get("/funcionarios.html", include_in_schema=False)
def pagina_funcionarios():
    return FileResponse(FRONTEND_DIR / "funcionarios.html")


# ============================================================
# API - AUTENTICAÇÃO (LOGIN UNIFICADO COM CLIENTE, FUNCIONÁRIO E ADMIN)
# ============================================================
@app.post("/login")
def realizar_login(credenciais: LoginRequest):
    conexao = criar_conexao()
    cursor = conexao.cursor()
    try:
        # 1. Tenta buscar na tabela de clientes
        cursor.execute("SELECT id, nome, email, nivel FROM cliente WHERE email = %s AND senha = %s", (credenciais.email, credenciais.senha))
        usuario = cursor.fetchone()
        
        # 2. Se não achar, tenta na tabela de funcionários
        if not usuario:
            cursor.execute("SELECT id, nome, email, nivel FROM funcionario WHERE email = %s AND senha = %s", (credenciais.email, credenciais.senha))
            usuario = cursor.fetchone()

        # 3. Se ainda não achar, tenta na tabela dedicada de administradores
        if not usuario:
            cursor.execute("SELECT id, nome, email, nivel FROM admin WHERE email = %s AND senha = %s", (credenciais.email, credenciais.senha))
            usuario = cursor.fetchone()

        if not usuario:
            raise HTTPException(status_code=401, detail="E-mail ou senha incorretos.")
            
        return {
            "id": usuario[0],
            "nome": usuario[1],
            "email": usuario[2],
            "nivel": usuario[3]  # Retorna 'cliente', 'funcionario' ou 'admin' para o Frontend gerenciar
        }
    finally:
        cursor.close()
        conexao.close()


# ============================================================
# API - CLIENTES (Stored Procedures, Functions e CRUD)
# ============================================================
@app.get("/clientes", response_model=list[ClienteResponse])
def listar_clientes():
    conexao = criar_conexao()
    cursor = conexao.cursor()
    try:
        cursor.execute("SELECT id, nome, cpf, email, nivel FROM cliente")
        registros = cursor.fetchall()
        return [{"id": r[0], "nome": r[1], "cpf": r[2], "email": r[3], "nivel": r[4]} for r in registros]
    finally:
        cursor.close()
        conexao.close()

@app.post("/clientes", response_model=ClienteResponse)
def cadastrar_cliente(cliente: ClienteCreate):
    conexao = criar_conexao()
    cursor = conexao.cursor()
    try:
        args = (cliente.nome, cliente.cpf, cliente.email, cliente.senha, cliente.nivel, 0)
        resultado = cursor.callproc("sp_cadastrar_cliente", args)
        conexao.commit()
        id_gerado = resultado[5]
        return {"id": id_gerado, **cliente.dict(exclude={"senha"})}
    except IntegrityError as erro:
        conexao.rollback()
        if erro.errno == 1062:
            raise HTTPException(status_code=409, detail="CPF ou E-mail já cadastrado.")
        raise HTTPException(status_code=500, detail="Erro de integridade no banco de dados.")
    except DatabaseError as erro:
        conexao.rollback()
        raise HTTPException(status_code=400, detail=str(erro.msg))
    finally:
        cursor.close()
        conexao.close()

@app.put("/clientes/{cliente_id}", response_model=ClienteResponse)
def alterar_cliente(cliente_id: int, cliente: ClienteCreate):
    conexao = criar_conexao()
    cursor = conexao.cursor()
    try:
        args = (cliente_id, cliente.nome, cliente.cpf, cliente.email, cliente.senha, cliente.nivel)
        cursor.callproc("sp_alterar_cliente", args)
        conexao.commit()
        return {"id": cliente_id, **cliente.dict(exclude={"senha"})}
    except IntegrityError as erro:
        conexao.rollback()
        if erro.errno == 1062:
            raise HTTPException(status_code=409, detail="CPF ou E-mail já cadastrado.")
        raise HTTPException(status_code=500, detail="Erro de integridade no banco de dados.")
    except DatabaseError as erro:
        conexao.rollback()
        raise HTTPException(status_code=400, detail=str(erro.msg))
    finally:
        cursor.close()
        conexao.close()

@app.delete("/clientes/{cliente_id}")
def excluir_cliente(cliente_id: int):
    conexao = criar_conexao()
    cursor = conexao.cursor()
    try:
        cursor.execute("DELETE FROM cliente WHERE id = %s", (cliente_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Cliente não encontrado.")
        conexao.commit()
        return {"mensagem": "Cliente excluído com sucesso."}
    except IntegrityError:
        conexao.rollback()
        raise HTTPException(status_code=409, detail="Existem veículos vinculados a este cliente.")
    finally:
        cursor.close()
        conexao.close()

@app.get("/clientes/{cliente_id}/total-gasto")
def obter_total_gasto_cliente(cliente_id: int):
    conexao = criar_conexao()
    cursor = conexao.cursor()
    try:
        cursor.execute("SELECT fn_calcular_total_gasto_cliente(%s)", (cliente_id,))
        resultado = cursor.fetchone()
        total = resultado[0] if resultado else 0.00
        return {"cliente_id": cliente_id, "total_gasto": float(total)}
    finally:
        cursor.close()
        conexao.close()


# ============================================================
# API - FUNCIONÁRIOS
# ============================================================
@app.get("/funcionarios", response_model=list[FuncionarioResponse])
def listar_funcionarios():
    conexao = criar_conexao()
    cursor = conexao.cursor()
    try:
        cursor.execute("SELECT id, nome, cpf, telefone, estado_civil, endereco, cargo, email, nivel FROM funcionario")
        registros = cursor.fetchall()
        return [
            {
                "id": r[0], "nome": r[1], "cpf": r[2], "telefone": r[3],
                "estado_civil": r[4], "endereco": r[5], "cargo": r[6], "email": r[7], "nivel": r[8]
            }
            for r in registros
        ]
    finally:
        cursor.close()
        conexao.close()

@app.post("/funcionarios", response_model=FuncionarioResponse)
def cadastrar_funcionario(funcionario: FuncionarioCreate):
    conexao = criar_conexao()
    cursor = conexao.cursor()
    try:
        cursor.execute(
            """
            INSERT INTO funcionario (nome, cpf, telefone, estado_civil, endereco, cargo, email, senha, nivel)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                funcionario.nome, funcionario.cpf, funcionario.telefone,
                funcionario.estado_civil, funcionario.endereco, funcionario.cargo,
                funcionario.email, funcionario.senha, funcionario.nivel
            )
        )
        conexao.commit()
        return {"id": cursor.lastrowid, **funcionario.dict(exclude={"senha"})}
    except IntegrityError as erro:
        conexao.rollback()
        if erro.errno == 1062:
            raise HTTPException(status_code=409, detail="CPF ou E-mail já cadastrado.")
        raise HTTPException(status_code=500, detail="Erro de integridade no banco de dados.")
    except DatabaseError as erro:
        conexao.rollback()
        raise HTTPException(status_code=400, detail=str(erro.msg))
    finally:
        cursor.close()
        conexao.close()

@app.put("/funcionarios/{funcionario_id}", response_model=FuncionarioResponse)
def alterar_funcionario(funcionario_id: int, funcionario: FuncionarioCreate):
    conexao = criar_conexao()
    cursor = conexao.cursor()
    try:
        cursor.execute(
            """
            UPDATE funcionario 
            SET nome = %s, cpf = %s, telefone = %s, estado_civil = %s, endereco = %s, cargo = %s, email = %s, senha = %s, nivel = %s
            WHERE id = %s
            """,
            (
                funcionario.nome, funcionario.cpf, funcionario.telefone,
                funcionario.estado_civil, funcionario.endereco, funcionario.cargo,
                funcionario.email, funcionario.senha, funcionario.nivel, funcionario_id
            )
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Funcionário não encontrado.")
        conexao.commit()
        return {"id": funcionario_id, **funcionario.dict(exclude={"senha"})}
    except IntegrityError as erro:
        conexao.rollback()
        if erro.errno == 1062:
            raise HTTPException(status_code=409, detail="CPF ou E-mail já cadastrado.")
        raise HTTPException(status_code=500, detail="Erro de integridade no banco de dados.")
    except DatabaseError as erro:
        conexao.rollback()
        raise HTTPException(status_code=400, detail=str(erro.msg))
    finally:
        cursor.close()
        conexao.close()

@app.delete("/funcionarios/{funcionario_id}")
def excluir_funcionario(funcionario_id: int):
    conexao = criar_conexao()
    cursor = conexao.cursor()
    try:
        cursor.execute("DELETE FROM funcionario WHERE id = %s", (funcionario_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Funcionário não encontrado.")
        conexao.commit()
        return {"mensagem": "Funcionário excluído com sucesso."}
    finally:
        cursor.close()
        conexao.close()


# ============================================================
# API - ADMINS (Cadastro e Gestão de Administradores)
# ============================================================
@app.post("/admins", response_model=AdminResponse)
def cadastrar_admin(admin: AdminCreate):
    conexao = criar_conexao()
    cursor = conexao.cursor()
    try:
        args = (admin.nome, admin.email, admin.senha, admin.nivel, 0)
        resultado = cursor.callproc("sp_cadastrar_admin", args)
        conexao.commit()
        id_gerado = resultado[4]
        return {"id": id_gerado, **admin.dict(exclude={"senha"})}
    except IntegrityError as erro:
        conexao.rollback()
        if erro.errno == 1062:
            raise HTTPException(status_code=409, detail="E-mail já cadastrado para administrador.")
        raise HTTPException(status_code=500, detail="Erro de integridade no banco de dados.")
    except DatabaseError as erro:
        conexao.rollback()
        raise HTTPException(status_code=400, detail=str(erro.msg))
    finally:
        cursor.close()
        conexao.close()


# ============================================================
# API - VEÍCULOS (Stored Procedure, Triggers e View)
# ============================================================
@app.get("/veiculos")
def listar_veiculos():
    conexao = criar_conexao()
    cursor = conexao.cursor()
    try:
        cursor.execute("SELECT id, placa, marca, modelo, ano, cliente_id, cliente_nome FROM vw_veiculos_detalhados")
        registros = cursor.fetchall()
        return [
            {
                "id": r[0],
                "placa": r[1],
                "marca": r[2],
                "modelo": r[3],
                "ano": r[4],
                "cliente_id": r[5],
                "cliente_nome": r[6]
            }
            for r in registros
        ]
    finally:
        cursor.close()
        conexao.close()

@app.post("/veiculos", response_model=VeiculoResponse)
def cadastrar_veiculo(veiculo: VeiculoCreate):
    conexao = criar_conexao()
    cursor = conexao.cursor()
    try:
        args = (veiculo.placa, veiculo.marca, veiculo.modelo, veiculo.ano, veiculo.cliente_id, 0)
        resultado = cursor.callproc("sp_cadastrar_veiculo", args)
        conexao.commit()
        id_gerado = resultado[5]
        return {"id": id_gerado, **veiculo.dict()}
    except IntegrityError as erro:
        conexao.rollback()
        if erro.errno == 1062:
            raise HTTPException(status_code=409, detail="Placa já cadastrada.")
        if erro.errno == 1452:
            raise HTTPException(status_code=404, detail="Cliente informado não existe.")
        raise HTTPException(status_code=500, detail="Erro de integridade no banco de dados.")
    except DatabaseError as erro:
        conexao.rollback()
        raise HTTPException(status_code=400, detail=str(erro.msg))
    finally:
        cursor.close()
        conexao.close()

@app.put("/veiculos/{veiculo_id}", response_model=VeiculoResponse)
def alterar_veiculo(veiculo_id: int, veiculo: VeiculoCreate):
    conexao = criar_conexao()
    cursor = conexao.cursor()
    try:
        cursor.execute(
            """
            UPDATE veiculo 
            SET placa = %s, marca = %s, modelo = %s, ano = %s, cliente_id = %s
            WHERE id = %s
            """,
            (veiculo.placa, veiculo.marca, veiculo.modelo, veiculo.ano, veiculo.cliente_id, veiculo_id)
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Veículo não encontrado.")
        conexao.commit()
        return {"id": veiculo_id, **veiculo.dict()}
    except IntegrityError as erro:
        conexao.rollback()
        if erro.errno == 1062:
            raise HTTPException(status_code=409, detail="Placa já cadastrada.")
        if erro.errno == 1452:
            raise HTTPException(status_code=404, detail="Cliente informado não existe.")
        raise HTTPException(status_code=500, detail="Erro de integridade no banco de dados.")
    except DatabaseError as erro:
        conexao.rollback()
        raise HTTPException(status_code=400, detail=str(erro.msg))
    finally:
        cursor.close()
        conexao.close()

@app.delete("/veiculos/{veiculo_id}")
def excluir_veiculo(veiculo_id: int):
    conexao = criar_conexao()
    cursor = conexao.cursor()
    try:
        cursor.execute("DELETE FROM veiculo WHERE id = %s", (veiculo_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Veículo não encontrado.")
        conexao.commit()
        return {"mensagem": "Veículo excluído com sucesso."}
    except IntegrityError:
        conexao.rollback()
        raise HTTPException(status_code=409, detail="Existem ordens de serviço vinculadas a este veículo.")
    finally:
        cursor.close()
        conexao.close()


# ============================================================
# API - ESTOQUE
# ============================================================
@app.get("/estoque")
def listar_estoque():
    conexao = criar_conexao()
    cursor = conexao.cursor()
    try:
        cursor.execute("SELECT id, nome, quantidade_estoque, preco_venda FROM peca")
        registros = cursor.fetchall()
        return [
            {"id": r[0], "nome": r[1], "quantidade": r[2], "preco": float(r[3])}
            for r in registros
        ]
    finally:
        cursor.close()
        conexao.close()

@app.post("/estoque")
def cadastrar_item_estoque(item: dict):
    conexao = criar_conexao()
    cursor = conexao.cursor()
    try:
        cursor.execute(
            "INSERT INTO peca (nome, quantidade_estoque, preco_venda, preco_compra) VALUES (%s, %s, %s, %s)",
            (item.get("nome"), item.get("quantidade", 0), item.get("preco", 0.0), item.get("preco", 0.0))
        )
        conexao.commit()
        return {"id": cursor.lastrowid, **item}
    except DatabaseError as erro:
        conexao.rollback()
        raise HTTPException(status_code=400, detail=str(erro.msg))
    finally:
        cursor.close()
        conexao.close()

@app.put("/estoque/{item_id}")
def alterar_item_estoque(item_id: int, item: dict):
    conexao = criar_conexao()
    cursor = conexao.cursor()
    try:
        cursor.execute(
            "UPDATE peca SET nome = %s, quantidade_estoque = %s, preco_venda = %s WHERE id = %s",
            (item.get("nome"), item.get("quantidade"), item.get("preco"), item_id)
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Item de estoque não encontrado.")
        conexao.commit()
        return {"id": item_id, **item}
    except DatabaseError as erro:
        conexao.rollback()
        raise HTTPException(status_code=400, detail=str(erro.msg))
    finally:
        cursor.close()
        conexao.close()

@app.delete("/estoque/{item_id}")
def excluir_item_estoque(item_id: int):
    conexao = criar_conexao()
    cursor = conexao.cursor()
    try:
        cursor.execute("DELETE FROM peca WHERE id = %s", (item_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Item de estoque não encontrado.")
        conexao.commit()
        return {"mensagem": "Item removido do estoque com sucesso."}
    finally:
        cursor.close()
        conexao.close()


# ============================================================
# API - ORDENS DE SERVIÇO (Stored Procedure, Triggers e View)
# ============================================================
@app.get("/ordens-servico")
def listar_ordens_servico():
    conexao = criar_conexao()
    cursor = conexao.cursor()
    try:
        cursor.execute(
            "SELECT os_id, veiculo_id, cliente_nome, veiculo_placa, veiculo_modelo, descricao_servico, status, valor_total FROM vw_ordem_servico_detalhada"
        )
        registros = cursor.fetchall()
        return [
            {
                "id": r[0],
                "veiculo_id": r[1],
                "cliente_nome": r[2],
                "veiculo_placa": r[3],
                "veiculo_modelo": r[4],
                "descricao": r[5],
                "status": r[6],
                "valor_total": float(r[7])
            }
            for r in registros
        ]
    finally:
        cursor.close()
        conexao.close()

@app.post("/ordens-servico")
def cadastrar_ordem_servico(os_data: dict):
    conexao = criar_conexao()
    cursor = conexao.cursor()
    try:
        cursor.execute(
            """
            INSERT INTO ordem_servico (veiculo_id, descricao_servico, data_abertura, status, valor_total)
            VALUES (%s, %s, CURDATE(), %s, %s)
            """,
            (
                os_data.get("veiculo_id"),
                os_data.get("descricao"),
                os_data.get("status", "Pendente"),
                os_data.get("valor_total", 0.0)
            )
        )
        conexao.commit()
        return {"id": cursor.lastrowid, **os_data}
    except IntegrityError as erro:
        conexao.rollback()
        if erro.errno == 1452:
            raise HTTPException(status_code=404, detail="Veículo informado não existe.")
        raise HTTPException(status_code=500, detail="Erro de integridade no banco de dados.")
    except DatabaseError as erro:
        conexao.rollback()
        raise HTTPException(status_code=400, detail=str(erro.msg))
    finally:
        cursor.close()
        conexao.close()

@app.put("/ordens-servico/{os_id}")
def alterar_ordem_servico(os_id: int, os_data: dict):
    conexao = criar_conexao()
    cursor = conexao.cursor()
    try:
        cursor.execute(
            "UPDATE ordem_servico SET veiculo_id = %s, descricao_servico = %s, status = %s, valor_total = %s WHERE id = %s",
            (os_data.get("veiculo_id"), os_data.get("descricao"), os_data.get("status"), os_data.get("valor_total"), os_id)
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Ordem de serviço não encontrada.")
        conexao.commit()
        return {"id": os_id, **os_data}
    except IntegrityError as erro:
        conexao.rollback()
        if erro.errno == 1452:
            raise HTTPException(status_code=404, detail="Veículo informado não existe.")
        raise HTTPException(status_code=500, detail="Erro de integridade no banco de dados.")
    except DatabaseError as erro:
        conexao.rollback()
        raise HTTPException(status_code=400, detail=str(erro.msg))
    finally:
        cursor.close()
        conexao.close()

@app.delete("/ordens-servico/{os_id}")
def excluir_ordem_servico(os_id: int):
    conexao = criar_conexao()
    cursor = conexao.cursor()
    try:
        cursor.execute("DELETE FROM ordem_servico WHERE id = %s", (os_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Ordem de serviço não encontrada.")
        conexao.commit()
        return {"mensagem": "Ordem de Serviço excluída com sucesso."}
    finally:
        cursor.close()
        conexao.close()