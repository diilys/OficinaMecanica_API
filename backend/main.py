from pathlib import Path
import hashlib
import hmac
import os

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from mysql.connector import IntegrityError, DatabaseError

from backend.database import criar_conexao
from backend.auth import COOKIE_NAME, SESSION_EXPIRE_HOURS, autenticar_request, criar_sessao, encerrar_sessao
from backend.schemas import (
    LoginRequest,
    LoginResponse,

    ClienteCreate,
    ClienteUpdate,
    ClienteResponse,

    FuncionarioCreate,
    FuncionarioUpdate,
    FuncionarioResponse,

    AdminCreate,
    AdminResponse,

    VeiculoCreate,
    VeiculoResponse,

    PecaCreate,
    PecaUpdate,
    PecaResponse,

    ServicoCreate,
    ServicoResponse,

    AgendamentoCreate,
    AgendamentoUpdate,

    OrdemServicoCreate,
    OrdemServicoUpdate,
    PecaOSCreate,
    ServicoOSCreate,

    PagamentoCreate,
    FinalizarOSPagamento
)


app = FastAPI(title="Sistema Oficina Mecânica")

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"


# ============================================================
# AUTORIZAÇÃO CENTRAL
# ============================================================

PUBLIC_PATHS = {
    "/", "/login", "/login.html", "/cadastro-cliente", "/cadastroCliente.html",
    "/docs", "/openapi.json", "/favicon.ico"
}

CLIENT_PAGES = {"/garagem", "/historico-servicos", "/agendamento"}
ADMIN_PAGES = {
    "/painel-admin", "/sistema.html", "/painel-clientes", "/clientes.html",
    "/painel-funcionarios", "/funcionarios.html", "/cadastro-funcionario",
    "/cadastroFuncionario.html"
}
STAFF_PAGES = {
    "/painel-veiculos", "/veiculos.html", "/cadastro-veiculo", "/cadastroVeiculo.html",
    "/painel-estoque", "/estoque.html", "/cadastro-estoque", "/cadastroEstoque.html",
    "/painel-ordens", "/ordensServico.html", "/cadastro-ordem-servico",
    "/cadastroOrdemServico.html", "/painel-agendamentos", "/painel-servicos",
    "/cadastro-servico"
}

STATIC_CLIENT_HTML = {"garagem.html", "historicoServicos.html", "agendamento.html"}
STATIC_ADMIN_HTML = {"sistema.html", "clientes.html", "funcionarios.html", "cadastroFuncionario.html"}
STATIC_STAFF_HTML = {
    "veiculos.html", "cadastroVeiculo.html", "estoque.html", "cadastroEstoque.html",
    "ordensServico.html", "cadastroOrdemServico.html", "agendamentos.html",
    "servicos.html", "cadastroServico.html"
}


def _resposta_auth(request: Request, status: int, detalhe: str):
    aceita_html = "text/html" in request.headers.get("accept", "")
    if request.method == "GET" and aceita_html:
        return RedirectResponse(url="/login", status_code=303)
    return JSONResponse(status_code=status, content={"detail": detalhe})


def _papel_necessario(path: str, method: str):
    if path in CLIENT_PAGES:
        return {"cliente"}
    if path in ADMIN_PAGES:
        return {"admin"}
    if path in STAFF_PAGES:
        return {"admin", "funcionario"}

    if path.startswith("/frontend/") and path.endswith(".html"):
        nome = path.rsplit("/", 1)[-1]
        if nome in STATIC_CLIENT_HTML:
            return {"cliente"}
        if nome in STATIC_ADMIN_HTML:
            return {"admin"}
        if nome in STATIC_STAFF_HTML:
            return {"admin", "funcionario"}
        return None

    # Lista operacional de funcionários para seleção em OS.
    if path == "/opcoes-funcionarios":
        return {"admin", "funcionario"}

    # Administração de usuários: somente administrador.
    if path.startswith("/funcionarios") or path.startswith("/admins"):
        return {"admin"}
    if path == "/clientes" and method == "GET":
        return {"admin"}
    if path.startswith("/clientes/") and not any(
        path.endswith(sufixo) for sufixo in ("/veiculos", "/ordens-servico", "/agendamentos")
    ):
        return {"admin"}

    # Operação da oficina.
    if path.startswith("/estoque") or path.startswith("/servicos") or path.startswith("/ordens-servico"):
        return {"admin", "funcionario"}
    if path == "/agendamentos" and method == "GET":
        return {"admin", "funcionario"}
    if path.startswith("/agendamentos/"):
        return {"admin", "funcionario"}
    if path == "/veiculos" and method == "GET":
        return {"admin", "funcionario"}

    # Rotas de dados pessoais de cliente e criação de veículo/agendamento.
    if path.startswith("/clientes/") and any(
        path.endswith(sufixo) for sufixo in ("/veiculos", "/ordens-servico", "/agendamentos")
    ):
        return {"cliente", "admin", "funcionario"}
    if path.startswith("/veiculos"):
        return {"cliente", "admin", "funcionario"}
    if path in {"/me", "/logout"}:
        return {"cliente", "admin", "funcionario"}
    if path == "/agendamentos" and method == "POST":
        return {"cliente", "admin", "funcionario"}

    return None


@app.middleware("http")
async def verificar_autorizacao(request: Request, call_next):
    path = request.url.path

    # CSS, JS, imagens e páginas públicas podem ser carregados sem sessão.
    if path.startswith("/css/") or path.startswith("/js/"):
        return await call_next(request)
    if path.startswith("/frontend/") and not path.endswith(".html"):
        return await call_next(request)
    if path in PUBLIC_PATHS:
        return await call_next(request)
    if path == "/clientes" and request.method == "POST":
        return await call_next(request)

    papeis = _papel_necessario(path, request.method)
    if papeis is None:
        return await call_next(request)

    try:
        usuario = autenticar_request(request)
    except HTTPException as exc:
        return _resposta_auth(request, exc.status_code, exc.detail)

    request.state.usuario = usuario

    if usuario["tipo"] not in papeis:
        return _resposta_auth(request, 403, "Você não possui permissão para acessar este recurso.")

    # Um cliente jamais pode trocar o ID da URL para consultar outro cliente.
    if usuario["tipo"] == "cliente" and path.startswith("/clientes/"):
        partes = path.strip("/").split("/")
        if len(partes) >= 2 and partes[1].isdigit() and int(partes[1]) != usuario["id"]:
            return JSONResponse(status_code=403, content={"detail": "Acesso negado aos dados de outro cliente."})

    return await call_next(request)


# ============================================================
# ARQUIVOS ESTÁTICOS
# ============================================================

app.mount(
    "/frontend",
    StaticFiles(directory=FRONTEND_DIR),
    name="frontend"
)

app.mount(
    "/css",
    StaticFiles(directory=FRONTEND_DIR / "css"),
    name="css"
)

app.mount(
    "/js",
    StaticFiles(directory=FRONTEND_DIR / "js"),
    name="js"
)


# ============================================================
# SENHAS
# ============================================================

def gerar_hash_senha(senha: str) -> str:
    salt = os.urandom(16)
    iteracoes = 200_000

    hash_bytes = hashlib.pbkdf2_hmac(
        "sha256",
        senha.encode("utf-8"),
        salt,
        iteracoes
    )

    return (
        f"pbkdf2_sha256$"
        f"{iteracoes}$"
        f"{salt.hex()}$"
        f"{hash_bytes.hex()}"
    )


def verificar_senha(senha: str, senha_armazenada: str) -> bool:

    # Compatibilidade temporária com usuários de teste antigos
    if not senha_armazenada.startswith("pbkdf2_sha256$"):
        return hmac.compare_digest(
            senha,
            senha_armazenada
        )

    try:
        algoritmo, iteracoes, salt_hex, hash_hex = (
            senha_armazenada.split("$")
        )

        hash_calculado = hashlib.pbkdf2_hmac(
            "sha256",
            senha.encode("utf-8"),
            bytes.fromhex(salt_hex),
            int(iteracoes)
        )

        return hmac.compare_digest(
            hash_calculado.hex(),
            hash_hex
        )

    except (ValueError, TypeError):
        return False


# ============================================================
# ROTAS HTML
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


@app.get("/painel-clientes", include_in_schema=False)
@app.get("/clientes.html", include_in_schema=False)
def pagina_clientes():
    return FileResponse(FRONTEND_DIR / "clientes.html")


@app.get("/cadastro-cliente", include_in_schema=False)
@app.get("/cadastroCliente.html", include_in_schema=False)
def pagina_cadastro_cliente():
    return FileResponse(FRONTEND_DIR / "cadastroCliente.html")


@app.get("/painel-funcionarios", include_in_schema=False)
@app.get("/funcionarios.html", include_in_schema=False)
def pagina_funcionarios():
    return FileResponse(FRONTEND_DIR / "funcionarios.html")


@app.get("/cadastro-funcionario", include_in_schema=False)
@app.get("/cadastroFuncionario.html", include_in_schema=False)
def pagina_cadastro_funcionario():
    return FileResponse(FRONTEND_DIR / "cadastroFuncionario.html")


@app.get("/painel-veiculos", include_in_schema=False)
@app.get("/veiculos.html", include_in_schema=False)
def pagina_veiculos():
    return FileResponse(FRONTEND_DIR / "veiculos.html")


@app.get("/cadastro-veiculo", include_in_schema=False)
@app.get("/cadastroVeiculo.html", include_in_schema=False)
def pagina_cadastro_veiculo():
    return FileResponse(FRONTEND_DIR / "cadastroVeiculo.html")


@app.get("/painel-estoque", include_in_schema=False)
@app.get("/estoque.html", include_in_schema=False)
def pagina_estoque():
    return FileResponse(FRONTEND_DIR / "estoque.html")


@app.get("/cadastro-estoque", include_in_schema=False)
@app.get("/cadastroEstoque.html", include_in_schema=False)
def pagina_cadastro_estoque():
    return FileResponse(FRONTEND_DIR / "cadastroEstoque.html")


@app.get("/painel-ordens", include_in_schema=False)
@app.get("/ordensServico.html", include_in_schema=False)
def pagina_ordens_servico():
    return FileResponse(FRONTEND_DIR / "ordensServico.html")


@app.get("/cadastro-ordem-servico", include_in_schema=False)
@app.get("/cadastroOrdemServico.html", include_in_schema=False)
def pagina_cadastro_ordem_servico():
    return FileResponse(
        FRONTEND_DIR / "cadastroOrdemServico.html"
    )


# ============================================================
# LOGIN
# ============================================================

@app.post("/login", response_model=LoginResponse)
def realizar_login(credenciais: LoginRequest, response: Response):

    conexao = criar_conexao()
    cursor = conexao.cursor()

    try:
        cursor.execute(
            """
            SELECT
                id,
                nome,
                email,
                senha_hash,
                tipo,
                ativo
            FROM usuario
            WHERE email = %s
            """,
            (credenciais.email,)
        )

        usuario = cursor.fetchone()

        if not usuario:
            raise HTTPException(
                status_code=401,
                detail="E-mail ou senha incorretos."
            )

        if not usuario[5]:
            raise HTTPException(
                status_code=403,
                detail="Esta conta está inativa."
            )

        if not verificar_senha(
            credenciais.senha,
            usuario[3]
        ):
            raise HTTPException(
                status_code=401,
                detail="E-mail ou senha incorretos."
            )

        # Converte automaticamente senhas antigas para hash
        if not usuario[3].startswith("pbkdf2_sha256$"):
            nova_hash = gerar_hash_senha(
                credenciais.senha
            )

            cursor.execute(
                """
                UPDATE usuario
                SET senha_hash = %s
                WHERE id = %s
                """,
                (nova_hash, usuario[0])
            )

            conexao.commit()

        token = criar_sessao(usuario[0])
        response.set_cookie(
            key=COOKIE_NAME,
            value=token,
            httponly=True,
            secure=os.getenv("COOKIE_SECURE", "false").lower() == "true",
            samesite="lax",
            max_age=SESSION_EXPIRE_HOURS * 3600,
            path="/",
        )

        return {
            "id": usuario[0],
            "nome": usuario[1],
            "email": usuario[2],
            "nivel": usuario[4]
        }

    finally:
        cursor.close()
        conexao.close()


@app.get("/me")
def obter_usuario_logado(request: Request):
    usuario = autenticar_request(request)
    return {
        "id": usuario["id"],
        "nome": usuario["nome"],
        "email": usuario["email"],
        "nivel": usuario["tipo"],
    }


@app.post("/logout")
def logout(request: Request, response: Response):
    encerrar_sessao(request.cookies.get(COOKIE_NAME))
    response.delete_cookie(COOKIE_NAME, path="/")
    return {"mensagem": "Sessão encerrada."}


@app.get("/opcoes-funcionarios")
def listar_opcoes_funcionarios():
    conexao = criar_conexao()
    cursor = conexao.cursor()
    try:
        cursor.execute(
            """
            SELECT u.id, u.nome, f.cargo
            FROM usuario u
            JOIN funcionario f ON f.usuario_id = u.id
            WHERE u.ativo = TRUE
            ORDER BY u.nome
            """
        )
        return [
            {"id": r[0], "nome": r[1], "cargo": r[2], "ativo": True}
            for r in cursor.fetchall()
        ]
    finally:
        cursor.close()
        conexao.close()


# ============================================================
# CLIENTES
# ============================================================

@app.get(
    "/clientes",
    response_model=list[ClienteResponse]
)
def listar_clientes():

    conexao = criar_conexao()
    cursor = conexao.cursor()

    try:
        cursor.execute(
            """
            SELECT
                id,
                nome,
                cpf,
                email,
                ativo
            FROM vw_clientes_detalhados
            ORDER BY nome
            """
        )

        registros = cursor.fetchall()

        return [
            {
                "id": r[0],
                "nome": r[1],
                "cpf": r[2],
                "email": r[3],
                "ativo": bool(r[4])
            }
            for r in registros
        ]

    finally:
        cursor.close()
        conexao.close()


@app.post(
    "/clientes",
    response_model=ClienteResponse
)
def cadastrar_cliente(cliente: ClienteCreate):

    conexao = criar_conexao()
    cursor = conexao.cursor()

    try:
        senha_hash = gerar_hash_senha(
            cliente.senha
        )

        args = (
            cliente.nome,
            cliente.cpf,
            cliente.email,
            senha_hash,
            0
        )

        resultado = cursor.callproc(
            "sp_cadastrar_cliente",
            args
        )

        conexao.commit()

        id_gerado = resultado[4]

        return {
            "id": id_gerado,
            "nome": cliente.nome,
            "cpf": cliente.cpf,
            "email": cliente.email,
            "ativo": True
        }

    except IntegrityError as erro:
        conexao.rollback()

        if erro.errno == 1062:
            raise HTTPException(
                status_code=409,
                detail="CPF ou e-mail já cadastrado."
            )

        raise HTTPException(
            status_code=500,
            detail="Erro de integridade no banco de dados."
        )

    except DatabaseError as erro:
        conexao.rollback()

        raise HTTPException(
            status_code=400,
            detail=str(erro.msg)
        )

    finally:
        cursor.close()
        conexao.close()


@app.put(
    "/clientes/{cliente_id}",
    response_model=ClienteResponse
)
def alterar_cliente(
    cliente_id: int,
    cliente: ClienteUpdate
):

    conexao = criar_conexao()
    cursor = conexao.cursor()

    try:
        cursor.execute(
            """
            SELECT id
            FROM usuario
            WHERE id = %s
              AND tipo = 'cliente'
            """,
            (cliente_id,)
        )

        if not cursor.fetchone():
            raise HTTPException(
                status_code=404,
                detail="Cliente não encontrado."
            )

        cursor.callproc(
            "sp_alterar_cliente",
            (
                cliente_id,
                cliente.nome,
                cliente.cpf,
                cliente.email
            )
        )

        conexao.commit()

        cursor.execute(
            """
            SELECT ativo
            FROM usuario
            WHERE id = %s
            """,
            (cliente_id,)
        )

        ativo = bool(cursor.fetchone()[0])

        return {
            "id": cliente_id,
            "nome": cliente.nome,
            "cpf": cliente.cpf,
            "email": cliente.email,
            "ativo": ativo
        }

    except IntegrityError as erro:
        conexao.rollback()

        if erro.errno == 1062:
            raise HTTPException(
                status_code=409,
                detail="CPF ou e-mail já cadastrado."
            )

        raise

    finally:
        cursor.close()
        conexao.close()


@app.delete("/clientes/{cliente_id}")
def inativar_cliente(cliente_id: int):

    conexao = criar_conexao()
    cursor = conexao.cursor()

    try:
        cursor.execute(
            """
            SELECT id
            FROM usuario
            WHERE id = %s
              AND tipo = 'cliente'
            """,
            (cliente_id,)
        )

        if not cursor.fetchone():
            raise HTTPException(
                status_code=404,
                detail="Cliente não encontrado."
            )

        cursor.callproc(
            "sp_inativar_usuario",
            (cliente_id,)
        )

        conexao.commit()

        return {
            "mensagem":
                "Cliente inativado com sucesso."
        }

    finally:
        cursor.close()
        conexao.close()


@app.patch("/clientes/{cliente_id}/reativar")
def reativar_cliente(cliente_id: int):

    conexao = criar_conexao()
    cursor = conexao.cursor()

    try:
        cursor.execute(
            """
            SELECT id
            FROM usuario
            WHERE id = %s
              AND tipo = 'cliente'
            """,
            (cliente_id,)
        )

        if not cursor.fetchone():
            raise HTTPException(
                status_code=404,
                detail="Cliente não encontrado."
            )

        cursor.callproc(
            "sp_reativar_usuario",
            (cliente_id,)
        )

        conexao.commit()

        return {
            "mensagem":
                "Cliente reativado com sucesso."
        }

    finally:
        cursor.close()
        conexao.close()


@app.get("/clientes/{cliente_id}/total-gasto")
def obter_total_gasto_cliente(cliente_id: int):

    conexao = criar_conexao()
    cursor = conexao.cursor()

    try:
        cursor.execute(
            """
            SELECT fn_calcular_total_gasto_cliente(%s)
            """,
            (cliente_id,)
        )

        resultado = cursor.fetchone()

        return {
            "cliente_id": cliente_id,
            "total_gasto": float(
                resultado[0] or 0
            )
        }

    finally:
        cursor.close()
        conexao.close()


# ============================================================
# FUNCIONÁRIOS
# ============================================================

@app.get(
    "/funcionarios",
    response_model=list[FuncionarioResponse]
)
def listar_funcionarios():

    conexao = criar_conexao()
    cursor = conexao.cursor()

    try:
        cursor.execute(
            """
            SELECT
                id,
                nome,
                cpf,
                telefone,
                estado_civil,
                endereco,
                cargo,
                email,
                ativo
            FROM vw_funcionarios_detalhados
            ORDER BY nome
            """
        )

        registros = cursor.fetchall()

        return [
            {
                "id": r[0],
                "nome": r[1],
                "cpf": r[2],
                "telefone": r[3],
                "estado_civil": r[4],
                "endereco": r[5],
                "cargo": r[6],
                "email": r[7],
                "ativo": bool(r[8])
            }
            for r in registros
        ]

    finally:
        cursor.close()
        conexao.close()


@app.post(
    "/funcionarios",
    response_model=FuncionarioResponse
)
def cadastrar_funcionario(
    funcionario: FuncionarioCreate
):

    conexao = criar_conexao()
    cursor = conexao.cursor()

    try:
        senha_hash = gerar_hash_senha(
            funcionario.senha
        )

        args = (
            funcionario.nome,
            funcionario.cpf,
            funcionario.telefone,
            funcionario.estado_civil,
            funcionario.endereco,
            funcionario.cargo,
            funcionario.email,
            senha_hash,
            0
        )

        resultado = cursor.callproc(
            "sp_cadastrar_funcionario",
            args
        )

        conexao.commit()

        id_gerado = resultado[8]

        return {
            "id": id_gerado,
            "nome": funcionario.nome,
            "cpf": funcionario.cpf,
            "telefone": funcionario.telefone,
            "estado_civil": funcionario.estado_civil,
            "endereco": funcionario.endereco,
            "cargo": funcionario.cargo,
            "email": funcionario.email,
            "ativo": True
        }

    except IntegrityError as erro:
        conexao.rollback()

        if erro.errno == 1062:
            raise HTTPException(
                status_code=409,
                detail="CPF ou e-mail já cadastrado."
            )

        raise HTTPException(
            status_code=500,
            detail="Erro de integridade no banco de dados."
        )

    except DatabaseError as erro:
        conexao.rollback()

        raise HTTPException(
            status_code=400,
            detail=str(erro.msg)
        )

    finally:
        cursor.close()
        conexao.close()


@app.put(
    "/funcionarios/{funcionario_id}",
    response_model=FuncionarioResponse
)
def alterar_funcionario(
    funcionario_id: int,
    funcionario: FuncionarioUpdate
):

    conexao = criar_conexao()
    cursor = conexao.cursor()

    try:
        cursor.execute(
            """
            SELECT id
            FROM usuario
            WHERE id = %s
              AND tipo = 'funcionario'
            """,
            (funcionario_id,)
        )

        if not cursor.fetchone():
            raise HTTPException(
                status_code=404,
                detail="Funcionário não encontrado."
            )

        cursor.execute(
            """
            UPDATE usuario
            SET
                nome = %s,
                email = %s
            WHERE id = %s
            """,
            (
                funcionario.nome,
                funcionario.email,
                funcionario_id
            )
        )

        cursor.execute(
            """
            UPDATE funcionario
            SET
                cpf = %s,
                telefone = %s,
                estado_civil = %s,
                endereco = %s,
                cargo = %s
            WHERE usuario_id = %s
            """,
            (
                funcionario.cpf,
                funcionario.telefone,
                funcionario.estado_civil,
                funcionario.endereco,
                funcionario.cargo,
                funcionario_id
            )
        )

        conexao.commit()

        cursor.execute(
            """
            SELECT ativo
            FROM usuario
            WHERE id = %s
            """,
            (funcionario_id,)
        )

        ativo = bool(cursor.fetchone()[0])

        return {
            "id": funcionario_id,
            **funcionario.model_dump(),
            "ativo": ativo
        }

    except IntegrityError as erro:
        conexao.rollback()

        if erro.errno == 1062:
            raise HTTPException(
                status_code=409,
                detail="CPF ou e-mail já cadastrado."
            )

        raise

    finally:
        cursor.close()
        conexao.close()


@app.delete("/funcionarios/{funcionario_id}")
def inativar_funcionario(funcionario_id: int):

    conexao = criar_conexao()
    cursor = conexao.cursor()

    try:
        cursor.execute(
            """
            SELECT id
            FROM usuario
            WHERE id = %s
              AND tipo = 'funcionario'
            """,
            (funcionario_id,)
        )

        if not cursor.fetchone():
            raise HTTPException(
                status_code=404,
                detail="Funcionário não encontrado."
            )

        cursor.callproc(
            "sp_inativar_usuario",
            (funcionario_id,)
        )

        conexao.commit()

        return {
            "mensagem":
                "Funcionário inativado com sucesso."
        }

    finally:
        cursor.close()
        conexao.close()


@app.patch(
    "/funcionarios/{funcionario_id}/reativar"
)
def reativar_funcionario(funcionario_id: int):

    conexao = criar_conexao()
    cursor = conexao.cursor()

    try:
        cursor.execute(
            """
            SELECT id
            FROM usuario
            WHERE id = %s
              AND tipo = 'funcionario'
            """,
            (funcionario_id,)
        )

        if not cursor.fetchone():
            raise HTTPException(
                status_code=404,
                detail="Funcionário não encontrado."
            )

        cursor.callproc(
            "sp_reativar_usuario",
            (funcionario_id,)
        )

        conexao.commit()

        return {
            "mensagem":
                "Funcionário reativado com sucesso."
        }

    finally:
        cursor.close()
        conexao.close()


# ============================================================
# ADMINISTRADORES
# ============================================================

@app.post(
    "/admins",
    response_model=AdminResponse
)
def cadastrar_admin(admin: AdminCreate):

    conexao = criar_conexao()
    cursor = conexao.cursor()

    try:
        senha_hash = gerar_hash_senha(
            admin.senha
        )

        resultado = cursor.callproc(
            "sp_cadastrar_admin",
            (
                admin.nome,
                admin.email,
                senha_hash,
                0
            )
        )

        conexao.commit()

        return {
            "id": resultado[3],
            "nome": admin.nome,
            "email": admin.email,
            "ativo": True
        }

    except IntegrityError as erro:
        conexao.rollback()

        if erro.errno == 1062:
            raise HTTPException(
                status_code=409,
                detail="E-mail já cadastrado."
            )

        raise

    finally:
        cursor.close()
        conexao.close()


# ============================================================
# VEÍCULOS
# ============================================================

@app.get("/veiculos")
def listar_veiculos():

    conexao = criar_conexao()
    cursor = conexao.cursor()

    try:
        cursor.execute(
            """
            SELECT
                id,
                placa,
                marca,
                modelo,
                ano,
                cliente_id,
                cliente_nome,
                cliente_ativo
            FROM vw_veiculos_detalhados
            ORDER BY modelo
            """
        )

        registros = cursor.fetchall()

        return [
            {
                "id": r[0],
                "placa": r[1],
                "marca": r[2],
                "modelo": r[3],
                "ano": r[4],
                "cliente_id": r[5],
                "cliente_nome": r[6],
                "cliente_ativo": bool(r[7])
            }
            for r in registros
        ]

    finally:
        cursor.close()
        conexao.close()


@app.post(
    "/veiculos",
    response_model=VeiculoResponse
)
def cadastrar_veiculo(veiculo: VeiculoCreate, request: Request):

    conexao = criar_conexao()
    cursor = conexao.cursor()

    try:
        usuario_auth = autenticar_request(request)
        cliente_destino = usuario_auth["id"] if usuario_auth["tipo"] == "cliente" else veiculo.cliente_id
        resultado = cursor.callproc(
            "sp_cadastrar_veiculo",
            (
                veiculo.placa,
                veiculo.marca,
                veiculo.modelo,
                veiculo.ano,
                cliente_destino,
                0
            )
        )

        conexao.commit()

        return {
            "id": resultado[5],
            "placa": veiculo.placa,
            "marca": veiculo.marca,
            "modelo": veiculo.modelo,
            "ano": veiculo.ano,
            "cliente_id": cliente_destino
        }

    except IntegrityError as erro:
        conexao.rollback()

        if erro.errno == 1062:
            raise HTTPException(
                status_code=409,
                detail="Placa já cadastrada."
            )

        if erro.errno == 1452:
            raise HTTPException(
                status_code=404,
                detail="Cliente não encontrado."
            )

        raise

    except DatabaseError as erro:
        conexao.rollback()

        raise HTTPException(
            status_code=400,
            detail=str(erro.msg)
        )

    finally:
        cursor.close()
        conexao.close()


@app.put(
    "/veiculos/{veiculo_id}",
    response_model=VeiculoResponse
)
def alterar_veiculo(
    veiculo_id: int,
    veiculo: VeiculoCreate,
    request: Request
):

    conexao = criar_conexao()
    cursor = conexao.cursor()

    try:
        usuario_auth = autenticar_request(request)
        cliente_destino = usuario_auth["id"] if usuario_auth["tipo"] == "cliente" else veiculo.cliente_id
        if usuario_auth["tipo"] == "cliente":
            cursor.execute("SELECT cliente_id FROM veiculo WHERE id=%s", (veiculo_id,))
            dono = cursor.fetchone()
            if not dono or dono[0] != usuario_auth["id"]:
                raise HTTPException(status_code=403, detail="Você não pode alterar este veículo.")

        cursor.execute(
            """
            UPDATE veiculo
            SET
                placa = %s,
                marca = %s,
                modelo = %s,
                ano = %s,
                cliente_id = %s
            WHERE id = %s
            """,
            (
                veiculo.placa,
                veiculo.marca,
                veiculo.modelo,
                veiculo.ano,
                cliente_destino,
                veiculo_id
            )
        )

        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=404,
                detail="Veículo não encontrado."
            )

        conexao.commit()

        return {
            "id": veiculo_id,
            "placa": veiculo.placa,
            "marca": veiculo.marca,
            "modelo": veiculo.modelo,
            "ano": veiculo.ano,
            "cliente_id": cliente_destino
        }

    except IntegrityError as erro:
        conexao.rollback()

        if erro.errno == 1062:
            raise HTTPException(
                status_code=409,
                detail="Placa já cadastrada."
            )

        if erro.errno == 1452:
            raise HTTPException(
                status_code=404,
                detail="Cliente não encontrado."
            )

        raise

    finally:
        cursor.close()
        conexao.close()


@app.delete("/veiculos/{veiculo_id}")
def excluir_veiculo(veiculo_id: int, request: Request):

    conexao = criar_conexao()
    cursor = conexao.cursor()

    try:
        usuario_auth = autenticar_request(request)
        if usuario_auth["tipo"] == "cliente":
            cursor.execute("SELECT cliente_id FROM veiculo WHERE id=%s", (veiculo_id,))
            dono = cursor.fetchone()
            if not dono or dono[0] != usuario_auth["id"]:
                raise HTTPException(status_code=403, detail="Você não pode excluir este veículo.")

        cursor.execute(
            """
            DELETE FROM veiculo
            WHERE id = %s
            """,
            (veiculo_id,)
        )

        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=404,
                detail="Veículo não encontrado."
            )

        conexao.commit()

        return {
            "mensagem":
                "Veículo excluído com sucesso."
        }

    except IntegrityError:
        conexao.rollback()

        raise HTTPException(
            status_code=409,
            detail=(
                "Este veículo possui registros "
                "vinculados e não pode ser excluído."
            )
        )

    finally:
        cursor.close()
        conexao.close()


# ============================================================
# ESTOQUE / PEÇAS
# ============================================================

@app.get(
    "/estoque",
    response_model=list[PecaResponse]
)
def listar_estoque():

    conexao = criar_conexao()
    cursor = conexao.cursor()

    try:
        cursor.execute(
            """
            SELECT
                id,
                nome,
                marca,
                fabricante,
                preco_compra,
                preco_venda,
                quantidade_estoque,
                ativo
            FROM peca
            ORDER BY nome
            """
        )

        registros = cursor.fetchall()

        return [
            {
                "id": r[0],
                "nome": r[1],
                "marca": r[2],
                "fabricante": r[3],
                "preco_compra": r[4],
                "preco_venda": r[5],
                "quantidade_estoque": r[6],
                "ativo": bool(r[7])
            }
            for r in registros
        ]

    finally:
        cursor.close()
        conexao.close()


@app.post(
    "/estoque",
    response_model=PecaResponse
)
def cadastrar_item_estoque(item: PecaCreate):

    conexao = criar_conexao()
    cursor = conexao.cursor()

    try:
        cursor.execute(
            """
            INSERT INTO peca (
                nome,
                marca,
                fabricante,
                preco_compra,
                preco_venda,
                quantidade_estoque
            )
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (
                item.nome,
                item.marca,
                item.fabricante,
                item.preco_compra,
                item.preco_venda,
                item.quantidade_estoque
            )
        )

        id_gerado = cursor.lastrowid

        conexao.commit()

        return {
            "id": id_gerado,
            **item.model_dump(),
            "ativo": True
        }

    finally:
        cursor.close()
        conexao.close()


@app.put(
    "/estoque/{item_id}",
    response_model=PecaResponse
)
def alterar_item_estoque(
    item_id: int,
    item: PecaUpdate
):

    conexao = criar_conexao()
    cursor = conexao.cursor()

    try:
        cursor.execute(
            """
            UPDATE peca
            SET
                nome = %s,
                marca = %s,
                fabricante = %s,
                preco_compra = %s,
                preco_venda = %s,
                quantidade_estoque = %s
            WHERE id = %s
            """,
            (
                item.nome,
                item.marca,
                item.fabricante,
                item.preco_compra,
                item.preco_venda,
                item.quantidade_estoque,
                item_id
            )
        )

        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=404,
                detail="Peça não encontrada."
            )

        conexao.commit()

        cursor.execute(
            """
            SELECT ativo
            FROM peca
            WHERE id = %s
            """,
            (item_id,)
        )

        ativo = bool(cursor.fetchone()[0])

        return {
            "id": item_id,
            **item.model_dump(),
            "ativo": ativo
        }

    finally:
        cursor.close()
        conexao.close()


@app.delete("/estoque/{item_id}")
def inativar_item_estoque(item_id: int):

    conexao = criar_conexao()
    cursor = conexao.cursor()

    try:
        cursor.execute(
            """
            UPDATE peca
            SET ativo = FALSE
            WHERE id = %s
            """,
            (item_id,)
        )

        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=404,
                detail="Peça não encontrada."
            )

        conexao.commit()

        return {
            "mensagem":
                "Peça inativada com sucesso."
        }

    finally:
        cursor.close()
        conexao.close()


@app.patch("/estoque/{item_id}/reativar")
def reativar_item_estoque(item_id: int):

    conexao = criar_conexao()
    cursor = conexao.cursor()

    try:
        cursor.execute(
            """
            UPDATE peca
            SET ativo = TRUE
            WHERE id = %s
            """,
            (item_id,)
        )

        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=404,
                detail="Peça não encontrada."
            )

        conexao.commit()

        return {
            "mensagem":
                "Peça reativada com sucesso."
        }

    finally:
        cursor.close()
        conexao.close()


# ============================================================
# SERVIÇOS
# ============================================================

@app.get(
    "/servicos",
    response_model=list[ServicoResponse]
)
def listar_servicos():

    conexao = criar_conexao()
    cursor = conexao.cursor()

    try:
        cursor.execute(
            """
            SELECT
                id,
                descricao,
                valor_mao_obra,
                ativo
            FROM servico
            ORDER BY descricao
            """
        )

        registros = cursor.fetchall()

        return [
            {
                "id": r[0],
                "descricao": r[1],
                "valor_mao_obra": r[2],
                "ativo": bool(r[3])
            }
            for r in registros
        ]

    finally:
        cursor.close()
        conexao.close()


@app.post(
    "/servicos",
    response_model=ServicoResponse
)
def cadastrar_servico(servico: ServicoCreate):

    conexao = criar_conexao()
    cursor = conexao.cursor()

    try:
        cursor.execute(
            """
            INSERT INTO servico (
                descricao,
                valor_mao_obra
            )
            VALUES (%s, %s)
            """,
            (
                servico.descricao,
                servico.valor_mao_obra
            )
        )

        id_gerado = cursor.lastrowid

        conexao.commit()

        return {
            "id": id_gerado,
            **servico.model_dump(),
            "ativo": True
        }

    finally:
        cursor.close()
        conexao.close()


@app.delete("/servicos/{servico_id}")
def inativar_servico(servico_id: int):

    conexao = criar_conexao()
    cursor = conexao.cursor()

    try:
        cursor.execute(
            """
            UPDATE servico
            SET ativo = FALSE
            WHERE id = %s
            """,
            (servico_id,)
        )

        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=404,
                detail="Serviço não encontrado."
            )

        conexao.commit()

        return {
            "mensagem":
                "Serviço inativado com sucesso."
        }

    finally:
        cursor.close()
        conexao.close()


# ============================================================
# AGENDAMENTOS
# ============================================================

@app.get("/agendamentos")
def listar_agendamentos():

    conexao = criar_conexao()
    cursor = conexao.cursor()

    try:
        cursor.execute(
            """
            SELECT
                a.id,
                a.veiculo_id,
                v.placa,
                v.modelo,
                u.nome,
                a.data_hora,
                a.status,
                a.observacoes
            FROM agendamento a

            JOIN veiculo v
                ON a.veiculo_id = v.id

            JOIN cliente c
                ON v.cliente_id = c.usuario_id

            JOIN usuario u
                ON c.usuario_id = u.id

            ORDER BY a.data_hora
            """
        )

        registros = cursor.fetchall()

        return [
            {
                "id": r[0],
                "veiculo_id": r[1],
                "placa": r[2],
                "modelo": r[3],
                "cliente_nome": r[4],
                "data_hora": r[5],
                "status": r[6],
                "observacoes": r[7]
            }
            for r in registros
        ]

    finally:
        cursor.close()
        conexao.close()


@app.post("/agendamentos")
def cadastrar_agendamento(
    agendamento: AgendamentoCreate,
    request: Request
):

    conexao = criar_conexao()
    cursor = conexao.cursor()

    try:
        usuario_auth = autenticar_request(request)
        if usuario_auth["tipo"] == "cliente":
            cursor.execute("SELECT cliente_id FROM veiculo WHERE id=%s", (agendamento.veiculo_id,))
            dono = cursor.fetchone()
            if not dono or dono[0] != usuario_auth["id"]:
                raise HTTPException(status_code=403, detail="Você só pode agendar veículos da sua garagem.")

        cursor.execute(
            """
            INSERT INTO agendamento (
                veiculo_id,
                data_hora,
                observacoes
            )
            VALUES (%s, %s, %s)
            """,
            (
                agendamento.veiculo_id,
                agendamento.data_hora,
                agendamento.observacoes
            )
        )

        id_gerado = cursor.lastrowid

        conexao.commit()

        return {
            "id": id_gerado,
            **agendamento.model_dump(),
            "status": "agendado"
        }

    except IntegrityError:
        conexao.rollback()

        raise HTTPException(
            status_code=404,
            detail="Veículo informado não existe."
        )

    finally:
        cursor.close()
        conexao.close()


@app.put("/agendamentos/{agendamento_id}")
def alterar_agendamento(
    agendamento_id: int,
    agendamento: AgendamentoUpdate
):

    conexao = criar_conexao()
    cursor = conexao.cursor()

    try:
        cursor.execute(
            """
            SELECT
                veiculo_id,
                data_hora,
                status,
                observacoes
            FROM agendamento
            WHERE id = %s
            """,
            (agendamento_id,)
        )

        registro_atual = cursor.fetchone()

        if not registro_atual:
            raise HTTPException(
                status_code=404,
                detail="Agendamento não encontrado."
            )

        dados = agendamento.model_dump(exclude_unset=True)

        if not dados:
            raise HTTPException(
                status_code=400,
                detail="Nenhum dado foi informado para atualização."
            )

        veiculo_id = dados.get("veiculo_id", registro_atual[0])
        data_hora = dados.get("data_hora", registro_atual[1])
        status = dados.get("status", registro_atual[2])
        observacoes = dados.get("observacoes", registro_atual[3])

        cursor.execute(
            """
            UPDATE agendamento
            SET
                veiculo_id = %s,
                data_hora = %s,
                status = %s,
                observacoes = %s
            WHERE id = %s
            """,
            (
                veiculo_id,
                data_hora,
                status,
                observacoes,
                agendamento_id
            )
        )

        conexao.commit()

        return {
            "id": agendamento_id,
            "veiculo_id": veiculo_id,
            "data_hora": data_hora,
            "status": status,
            "observacoes": observacoes
        }

    except IntegrityError as erro:
        conexao.rollback()

        if erro.errno == 1452:
            raise HTTPException(
                status_code=404,
                detail="Veículo informado não existe."
            )

        raise HTTPException(
            status_code=400,
            detail=str(erro.msg)
        )

    except DatabaseError as erro:
        conexao.rollback()

        raise HTTPException(
            status_code=400,
            detail=str(erro.msg)
        )

    finally:
        cursor.close()
        conexao.close()


# ============================================================
# ORDENS DE SERVIÇO
# ============================================================

@app.get("/ordens-servico")
def listar_ordens_servico():

    conexao = criar_conexao()
    cursor = conexao.cursor()

    try:
        cursor.execute(
            """
            SELECT
                os.id,
                os.veiculo_id,
                uc.nome,
                v.placa,
                v.modelo,
                uf.nome,
                os.descricao_servico,
                os.status,
                os.valor_base,
                os.valor_total
            FROM ordem_servico os
            JOIN veiculo v
                ON os.veiculo_id = v.id
            JOIN cliente c
                ON v.cliente_id = c.usuario_id
            JOIN usuario uc
                ON c.usuario_id = uc.id
            LEFT JOIN funcionario f
                ON os.funcionario_id = f.usuario_id
            LEFT JOIN usuario uf
                ON f.usuario_id = uf.id
            ORDER BY os.id DESC
            """
        )

        return [
            {
                "id": r[0],
                "veiculo_id": r[1],
                "cliente_nome": r[2],
                "veiculo_placa": r[3],
                "veiculo_modelo": r[4],
                "funcionario_nome": r[5],
                "descricao": r[6],
                "status": r[7],
                "valor_base": float(r[8] or 0),
                "valor_total": float(r[9] or 0)
            }
            for r in cursor.fetchall()
        ]

    finally:
        cursor.close()
        conexao.close()


@app.post("/ordens-servico")
def cadastrar_ordem_servico(
    os_data: OrdemServicoCreate
):

    conexao = criar_conexao()
    cursor = conexao.cursor()

    try:
        cursor.execute(
            """
            INSERT INTO ordem_servico (
                descricao_servico,
                status,
                valor_base,
                valor_total,
                observacoes,
                veiculo_id,
                funcionario_id
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (
                os_data.descricao,
                "pendente",
                os_data.valor_base,
                os_data.valor_base,
                os_data.observacoes,
                os_data.veiculo_id,
                os_data.funcionario_id
            )
        )

        id_gerado = cursor.lastrowid
        conexao.commit()

        return {
            "id": id_gerado,
            **os_data.model_dump(),
            "status": "pendente",
            "valor_total": os_data.valor_base
        }

    except IntegrityError as erro:
        conexao.rollback()

        if erro.errno == 1452:
            raise HTTPException(
                status_code=404,
                detail="Veículo ou funcionário informado não existe."
            )

        raise

    finally:
        cursor.close()
        conexao.close()


@app.put("/ordens-servico/{os_id}")
def alterar_ordem_servico(
    os_id: int,
    os_data: OrdemServicoUpdate
):

    conexao = criar_conexao()
    cursor = conexao.cursor()

    try:
        cursor.execute(
            "SELECT id FROM ordem_servico WHERE id = %s",
            (os_id,)
        )

        if not cursor.fetchone():
            raise HTTPException(
                status_code=404,
                detail="Ordem de serviço não encontrada."
            )

        dados = os_data.model_dump(exclude_unset=True)

        mapa_campos = {
            "veiculo_id": "veiculo_id",
            "funcionario_id": "funcionario_id",
            "descricao": "descricao_servico",
            "valor_base": "valor_base",
            "status": "status",
            "observacoes": "observacoes"
        }

        campos = []
        valores = []

        for campo, valor in dados.items():
            if campo not in mapa_campos:
                continue
            campos.append(f"{mapa_campos[campo]} = %s")
            valores.append(valor)

        if not campos:
            raise HTTPException(
                status_code=400,
                detail="Nenhum dado foi informado para atualização."
            )

        valores.append(os_id)

        cursor.execute(
            f"""
            UPDATE ordem_servico
            SET {", ".join(campos)}
            WHERE id = %s
            """,
            tuple(valores)
        )

        if "valor_base" in dados:
            cursor.execute(
                """
                UPDATE ordem_servico
                SET valor_total = fn_calcular_total_os(%s)
                WHERE id = %s
                """,
                (os_id, os_id)
            )

        if dados.get("status") == "concluida":
            cursor.execute(
                """
                UPDATE ordem_servico
                SET data_fechamento = COALESCE(data_fechamento, CURRENT_TIMESTAMP)
                WHERE id = %s
                """,
                (os_id,)
            )
        elif "status" in dados:
            cursor.execute(
                """
                UPDATE ordem_servico
                SET data_fechamento = NULL
                WHERE id = %s
                """,
                (os_id,)
            )

        conexao.commit()

        return {
            "id": os_id,
            **dados
        }

    except IntegrityError as erro:
        conexao.rollback()

        if erro.errno == 1452:
            raise HTTPException(
                status_code=404,
                detail="Veículo ou funcionário informado não existe."
            )

        raise

    finally:
        cursor.close()
        conexao.close()


@app.delete("/ordens-servico/{os_id}")
def excluir_ordem_servico(os_id: int):

    conexao = criar_conexao()
    cursor = conexao.cursor()

    try:
        cursor.callproc(
            "sp_excluir_os",
            (os_id,)
        )

        conexao.commit()

        return {
            "mensagem": "Ordem de serviço excluída com sucesso."
        }

    except DatabaseError as erro:
        conexao.rollback()

        raise HTTPException(
            status_code=400,
            detail=str(erro.msg)
        )

    finally:
        cursor.close()
        conexao.close()


@app.post("/ordens-servico/{os_id}/pecas")
def adicionar_peca_os(
    os_id: int,
    dados: PecaOSCreate
):

    conexao = criar_conexao()
    cursor = conexao.cursor()

    try:
        cursor.callproc(
            "sp_adicionar_peca_os",
            (
                os_id,
                dados.peca_id,
                dados.quantidade
            )
        )

        conexao.commit()

        return {
            "mensagem":
                "Peça adicionada à ordem de serviço."
        }

    except DatabaseError as erro:
        conexao.rollback()

        raise HTTPException(
            status_code=400,
            detail=str(erro.msg)
        )

    finally:
        cursor.close()
        conexao.close()


@app.delete(
    "/ordens-servico/{os_id}/pecas/{peca_id}"
)
def remover_peca_os(
    os_id: int,
    peca_id: int,
    quantidade: int = 1
):

    conexao = criar_conexao()
    cursor = conexao.cursor()

    try:
        cursor.callproc(
            "sp_remover_peca_os",
            (
                os_id,
                peca_id,
                quantidade
            )
        )

        conexao.commit()

        return {
            "mensagem":
                "Peça removida da ordem de serviço."
        }

    except DatabaseError as erro:
        conexao.rollback()

        raise HTTPException(
            status_code=400,
            detail=str(erro.msg)
        )

    finally:
        cursor.close()
        conexao.close()


@app.post("/ordens-servico/{os_id}/servicos")
def adicionar_servico_os(
    os_id: int,
    dados: ServicoOSCreate
):

    conexao = criar_conexao()
    cursor = conexao.cursor()

    try:
        cursor.callproc(
            "sp_adicionar_servico_os",
            (
                os_id,
                dados.servico_id
            )
        )

        conexao.commit()

        return {
            "mensagem":
                "Serviço adicionado à ordem."
        }

    except DatabaseError as erro:
        conexao.rollback()

        raise HTTPException(
            status_code=400,
            detail=str(erro.msg)
        )

    finally:
        cursor.close()
        conexao.close()


@app.delete(
    "/ordens-servico/{os_id}/servicos/{servico_id}"
)
def remover_servico_os(
    os_id: int,
    servico_id: int
):

    conexao = criar_conexao()
    cursor = conexao.cursor()

    try:
        cursor.callproc(
            "sp_remover_servico_os",
            (
                os_id,
                servico_id
            )
        )

        conexao.commit()

        return {
            "mensagem":
                "Serviço removido da ordem."
        }

    finally:
        cursor.close()
        conexao.close()


@app.patch("/ordens-servico/{os_id}/finalizar")
def finalizar_ordem_servico(
    os_id: int,
    dados: FinalizarOSPagamento
):

    conexao = criar_conexao()
    cursor = conexao.cursor()

    try:
        cursor.execute(
            """
            SELECT
                status,
                fn_calcular_total_os(id)
            FROM ordem_servico
            WHERE id = %s
            FOR UPDATE
            """,
            (os_id,)
        )

        registro = cursor.fetchone()

        if not registro:
            raise HTTPException(
                status_code=404,
                detail="Ordem de serviço não encontrada."
            )

        status_atual = registro[0]
        valor_total = registro[1]

        if status_atual == "concluida":
            raise HTTPException(
                status_code=400,
                detail="Esta ordem de serviço já está concluída."
            )

        if valor_total is None or valor_total <= 0:
            raise HTTPException(
                status_code=400,
                detail="A ordem de serviço precisa possuir valor maior que zero para ser finalizada."
            )

        cursor.callproc(
            "sp_registrar_pagamento",
            (
                os_id,
                valor_total,
                dados.metodo_pagamento
            )
        )

        cursor.callproc(
            "sp_finalizar_os",
            (os_id,)
        )

        conexao.commit()

        return {
            "mensagem": "Pagamento registrado e ordem de serviço finalizada.",
            "valor": float(valor_total),
            "metodo_pagamento": dados.metodo_pagamento
        }

    except HTTPException:
        conexao.rollback()
        raise

    except DatabaseError as erro:
        conexao.rollback()

        raise HTTPException(
            status_code=400,
            detail=str(erro.msg)
        )

    finally:
        cursor.close()
        conexao.close()


# ============================================================
# PAGAMENTOS
# ============================================================

@app.get("/ordens-servico/{os_id}/pagamentos")
def listar_pagamentos(os_id: int):

    conexao = criar_conexao()
    cursor = conexao.cursor()

    try:
        cursor.execute(
            """
            SELECT
                id,
                valor,
                metodo_pagamento,
                data_pagamento,
                status
            FROM pagamento
            WHERE os_id = %s
            ORDER BY data_pagamento
            """,
            (os_id,)
        )

        registros = cursor.fetchall()

        return [
            {
                "id": r[0],
                "valor": float(r[1]),
                "metodo_pagamento": r[2],
                "data_pagamento": r[3],
                "status": r[4]
            }
            for r in registros
        ]

    finally:
        cursor.close()
        conexao.close()


@app.post("/ordens-servico/{os_id}/pagamentos")
def registrar_pagamento(
    os_id: int,
    pagamento: PagamentoCreate
):

    conexao = criar_conexao()
    cursor = conexao.cursor()

    try:
        cursor.callproc(
            "sp_registrar_pagamento",
            (
                os_id,
                pagamento.valor,
                pagamento.metodo_pagamento
            )
        )

        conexao.commit()

        return {
            "mensagem":
                "Pagamento registrado com sucesso."
        }

    except DatabaseError as erro:
        conexao.rollback()

        raise HTTPException(
            status_code=400,
            detail=str(erro.msg)
        )

    finally:
        cursor.close()
        conexao.close()


# ============================================================
# ROTAS COMPLEMENTARES DO FRONTEND
# ============================================================

@app.get("/garagem", include_in_schema=False)
def pagina_garagem():
    return FileResponse(FRONTEND_DIR / "garagem.html")

@app.get("/historico-servicos", include_in_schema=False)
def pagina_historico_servicos():
    return FileResponse(FRONTEND_DIR / "historicoServicos.html")

@app.get("/agendamento", include_in_schema=False)
def pagina_agendamento_cliente():
    return FileResponse(FRONTEND_DIR / "agendamento.html")

@app.get("/painel-agendamentos", include_in_schema=False)
def pagina_agendamentos_admin():
    return FileResponse(FRONTEND_DIR / "agendamentos.html")

@app.get("/painel-servicos", include_in_schema=False)
def pagina_servicos():
    return FileResponse(FRONTEND_DIR / "servicos.html")

@app.get("/cadastro-servico", include_in_schema=False)
def pagina_cadastro_servico():
    return FileResponse(FRONTEND_DIR / "cadastroServico.html")

@app.get("/clientes/{cliente_id}/veiculos")
def listar_veiculos_cliente(cliente_id: int):
    conexao = criar_conexao(); cursor = conexao.cursor()
    try:
        cursor.execute("""SELECT id, placa, marca, modelo, ano, cliente_id FROM veiculo WHERE cliente_id=%s ORDER BY modelo""", (cliente_id,))
        return [{"id":r[0],"placa":r[1],"marca":r[2],"modelo":r[3],"ano":r[4],"cliente_id":r[5]} for r in cursor.fetchall()]
    finally:
        cursor.close(); conexao.close()

@app.get("/clientes/{cliente_id}/ordens-servico")
def listar_ordens_cliente(cliente_id: int):
    conexao = criar_conexao(); cursor = conexao.cursor()
    try:
        cursor.execute("""SELECT os.id, os.data_abertura, os.data_fechamento, os.descricao_servico, os.status, os.valor_total, v.placa, v.modelo FROM ordem_servico os JOIN veiculo v ON v.id=os.veiculo_id WHERE v.cliente_id=%s AND os.status IN ('em_andamento','concluida') ORDER BY os.data_abertura DESC""", (cliente_id,))
        return [{"id":r[0],"data_abertura":r[1],"data_fechamento":r[2],"descricao":r[3],"status":r[4],"valor_total":r[5],"veiculo_placa":r[6],"veiculo_modelo":r[7]} for r in cursor.fetchall()]
    finally:
        cursor.close(); conexao.close()

@app.get("/clientes/{cliente_id}/agendamentos")
def listar_agendamentos_cliente(cliente_id: int):
    conexao = criar_conexao(); cursor = conexao.cursor()
    try:
        cursor.execute("""SELECT a.id,a.veiculo_id,v.placa,v.modelo,a.data_hora,a.status,a.observacoes FROM agendamento a JOIN veiculo v ON v.id=a.veiculo_id WHERE v.cliente_id=%s ORDER BY a.data_hora DESC""", (cliente_id,))
        return [{"id":r[0],"veiculo_id":r[1],"placa":r[2],"modelo":r[3],"data_hora":r[4],"status":r[5],"observacoes":r[6]} for r in cursor.fetchall()]
    finally:
        cursor.close(); conexao.close()

@app.get("/ordens-servico/{os_id}")
def detalhar_ordem_servico(os_id: int):
    conexao = criar_conexao(); cursor = conexao.cursor()
    try:
        cursor.execute("""SELECT id,veiculo_id,funcionario_id,descricao_servico,status,observacoes,valor_base,valor_total,data_abertura,data_fechamento FROM ordem_servico WHERE id=%s""",(os_id,))
        r=cursor.fetchone()
        if not r: raise HTTPException(status_code=404,detail="Ordem de serviço não encontrada.")
        dados={"id":r[0],"veiculo_id":r[1],"funcionario_id":r[2],"descricao":r[3],"status":r[4],"observacoes":r[5],"valor_base":r[6],"valor_total":r[7],"data_abertura":r[8],"data_fechamento":r[9]}
        cursor.execute("""SELECT op.peca_id,p.nome,op.quantidade,op.valor_unitario FROM os_pecas op JOIN peca p ON p.id=op.peca_id WHERE op.os_id=%s""",(os_id,))
        dados["pecas"]=[{"peca_id":x[0],"nome":x[1],"quantidade":x[2],"valor_unitario":x[3]} for x in cursor.fetchall()]
        cursor.execute("""SELECT oss.servico_id,s.descricao,oss.valor FROM os_servicos oss JOIN servico s ON s.id=oss.servico_id WHERE oss.os_id=%s""",(os_id,))
        dados["servicos"]=[{"servico_id":x[0],"descricao":x[1],"valor":x[2]} for x in cursor.fetchall()]
        cursor.execute("""SELECT id,valor,metodo_pagamento,data_pagamento,status FROM pagamento WHERE os_id=%s ORDER BY data_pagamento""",(os_id,))
        dados["pagamentos"]=[{"id":x[0],"valor":x[1],"metodo_pagamento":x[2],"data_pagamento":x[3],"status":x[4]} for x in cursor.fetchall()]
        return dados
    finally:
        cursor.close(); conexao.close()


@app.patch("/servicos/{servico_id}/reativar")
def reativar_servico(servico_id: int):
    conexao=criar_conexao(); cursor=conexao.cursor()
    try:
        cursor.execute("UPDATE servico SET ativo=TRUE WHERE id=%s",(servico_id,))
        if cursor.rowcount==0: raise HTTPException(status_code=404,detail="Serviço não encontrado.")
        conexao.commit(); return {"mensagem":"Serviço reativado com sucesso."}
    finally:
        cursor.close(); conexao.close()

@app.put("/servicos/{servico_id}", response_model=ServicoResponse)
def alterar_servico(servico_id: int, servico: ServicoCreate):
    conexao=criar_conexao(); cursor=conexao.cursor()
    try:
        cursor.execute("UPDATE servico SET descricao=%s, valor_mao_obra=%s WHERE id=%s", (servico.descricao, servico.valor_mao_obra, servico_id))
        if cursor.rowcount == 0:
            cursor.execute("SELECT id FROM servico WHERE id=%s", (servico_id,))
            if not cursor.fetchone(): raise HTTPException(status_code=404, detail="Serviço não encontrado.")
        conexao.commit()
        cursor.execute("SELECT ativo FROM servico WHERE id=%s", (servico_id,))
        return {"id":servico_id,"descricao":servico.descricao,"valor_mao_obra":servico.valor_mao_obra,"ativo":bool(cursor.fetchone()[0])}
    finally:
        cursor.close(); conexao.close()
