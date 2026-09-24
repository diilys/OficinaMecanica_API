import hashlib
import os
import secrets
from datetime import datetime, timedelta

from fastapi import HTTPException, Request

from backend.database import criar_conexao

COOKIE_NAME = "oficina_token"
SESSION_EXPIRE_HOURS = int(os.getenv("SESSION_EXPIRE_HOURS", "8"))

def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()

def criar_sessao(usuario_id: int) -> str:
    token = secrets.token_urlsafe(32)
    token_hash = _hash_token(token)
    expira_em = datetime.now() + timedelta(hours=SESSION_EXPIRE_HOURS)
    conexao = criar_conexao()
    cursor = conexao.cursor()
    try:
        cursor.execute("DELETE FROM sessao WHERE expira_em <= NOW()")
        cursor.execute(
            "INSERT INTO sessao (token_hash, usuario_id, expira_em) VALUES (%s, %s, %s)",
            (token_hash, usuario_id, expira_em),
        )
        conexao.commit()
        return token
    finally:
        cursor.close()
        conexao.close()

def encerrar_sessao(token: str | None) -> None:
    if not token:
        return
    conexao = criar_conexao()
    cursor = conexao.cursor()
    try:
        cursor.execute("DELETE FROM sessao WHERE token_hash = %s", (_hash_token(token),))
        conexao.commit()
    finally:
        cursor.close()
        conexao.close()

def autenticar_request(request: Request) -> dict:
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Autenticação necessária.")

    conexao = criar_conexao()
    cursor = conexao.cursor()
    try:
        cursor.execute(
            """
            SELECT u.id, u.nome, u.email, u.tipo, u.ativo
            FROM sessao s
            JOIN usuario u ON u.id = s.usuario_id
            WHERE s.token_hash = %s
              AND s.expira_em > NOW()
            LIMIT 1
            """,
            (_hash_token(token),),
        )
        row = cursor.fetchone()
        if not row or not row[4]:
            raise HTTPException(status_code=401, detail="Sessão inválida, expirada ou conta inativa.")
        return {
            "id": row[0],
            "nome": row[1],
            "email": row[2],
            "tipo": row[3],
            "ativo": bool(row[4]),
        }
    finally:
        cursor.close()
        conexao.close()
