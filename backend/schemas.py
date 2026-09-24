from datetime import datetime
from decimal import Decimal
from typing import Optional, Literal

from pydantic import BaseModel, EmailStr, Field


# ============================================================
# LOGIN
# ============================================================

class LoginRequest(BaseModel):
    email: EmailStr
    senha: str


class LoginResponse(BaseModel):
    id: int
    nome: str
    email: EmailStr
    nivel: Literal["cliente", "funcionario", "admin"]


# ============================================================
# CLIENTES
# ============================================================

class ClienteCreate(BaseModel):
    nome: str
    cpf: str
    email: EmailStr
    senha: str


class ClienteUpdate(BaseModel):
    nome: str
    cpf: str
    email: EmailStr


class ClienteResponse(BaseModel):
    id: int
    nome: str
    cpf: str
    email: EmailStr
    ativo: bool = True

    class Config:
        from_attributes = True


# ============================================================
# FUNCIONÁRIOS
# ============================================================

class FuncionarioCreate(BaseModel):
    nome: str
    cpf: str
    telefone: Optional[str] = None
    estado_civil: Optional[str] = None
    endereco: Optional[str] = None
    cargo: Optional[str] = None
    email: EmailStr
    senha: str


class FuncionarioUpdate(BaseModel):
    nome: str
    cpf: str
    telefone: Optional[str] = None
    estado_civil: Optional[str] = None
    endereco: Optional[str] = None
    cargo: Optional[str] = None
    email: EmailStr


class FuncionarioResponse(BaseModel):
    id: int
    nome: str
    cpf: str
    telefone: Optional[str] = None
    estado_civil: Optional[str] = None
    endereco: Optional[str] = None
    cargo: Optional[str] = None
    email: EmailStr
    ativo: bool = True

    class Config:
        from_attributes = True


# ============================================================
# ADMINISTRADORES
# ============================================================

class AdminCreate(BaseModel):
    nome: str
    email: EmailStr
    senha: str


class AdminResponse(BaseModel):
    id: int
    nome: str
    email: EmailStr
    ativo: bool = True

    class Config:
        from_attributes = True


# ============================================================
# VEÍCULOS
# ============================================================

class VeiculoCreate(BaseModel):
    placa: str
    marca: str
    modelo: str
    ano: int
    cliente_id: int


class VeiculoResponse(BaseModel):
    id: int
    placa: str
    marca: str
    modelo: str
    ano: int
    cliente_id: int

    class Config:
        from_attributes = True


# ============================================================
# ESTOQUE / PEÇAS
# ============================================================

class PecaCreate(BaseModel):
    nome: str
    marca: Optional[str] = None
    fabricante: Optional[str] = None
    preco_compra: Decimal = Field(ge=0)
    preco_venda: Decimal = Field(ge=0)
    quantidade_estoque: int = Field(default=0, ge=0)


class PecaUpdate(BaseModel):
    nome: str
    marca: Optional[str] = None
    fabricante: Optional[str] = None
    preco_compra: Decimal = Field(ge=0)
    preco_venda: Decimal = Field(ge=0)
    quantidade_estoque: int = Field(ge=0)


class PecaResponse(BaseModel):
    id: int
    nome: str
    marca: Optional[str] = None
    fabricante: Optional[str] = None
    preco_compra: Decimal
    preco_venda: Decimal
    quantidade_estoque: int
    ativo: bool


# ============================================================
# SERVIÇOS
# ============================================================

class ServicoCreate(BaseModel):
    descricao: str
    valor_mao_obra: Decimal = Field(ge=0)


class ServicoResponse(BaseModel):
    id: int
    descricao: str
    valor_mao_obra: Decimal
    ativo: bool


# ============================================================
# AGENDAMENTOS
# ============================================================

class AgendamentoCreate(BaseModel):
    veiculo_id: int
    data_hora: datetime
    observacoes: Optional[str] = None


class AgendamentoUpdate(BaseModel):
    veiculo_id: Optional[int] = None
    data_hora: Optional[datetime] = None
    status: Optional[
        Literal[
            "agendado",
            "confirmado",
            "concluido",
            "cancelado"
        ]
    ] = None
    observacoes: Optional[str] = None


# ============================================================
# ORDENS DE SERVIÇO
# ============================================================

class OrdemServicoCreate(BaseModel):
    veiculo_id: int
    descricao: str
    funcionario_id: Optional[int] = None
    valor_base: Decimal = Field(default=0, ge=0)
    observacoes: Optional[str] = None


class OrdemServicoUpdate(BaseModel):
    veiculo_id: Optional[int] = None
    descricao: Optional[str] = None
    funcionario_id: Optional[int] = None
    valor_base: Optional[Decimal] = Field(default=None, ge=0)
    status: Optional[
        Literal[
            "pendente",
            "em_andamento",
            "concluida",
            "cancelada"
        ]
    ] = None
    observacoes: Optional[str] = None


class PecaOSCreate(BaseModel):
    peca_id: int
    quantidade: int = Field(gt=0)


class ServicoOSCreate(BaseModel):
    servico_id: int


# ============================================================
# PAGAMENTOS
# ============================================================

class PagamentoCreate(BaseModel):
    valor: Decimal = Field(gt=0)
    metodo_pagamento: Literal[
        "dinheiro",
        "pix",
        "credito",
        "debito",
        "outro"
    ]


class FinalizarOSPagamento(BaseModel):
    metodo_pagamento: Literal[
        "dinheiro",
        "pix",
        "credito",
        "debito",
        "outro"
    ]
