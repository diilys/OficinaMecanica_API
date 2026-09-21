from pydantic import BaseModel, EmailStr
from typing import Optional

# Schema para requisição de Login unificado
class LoginRequest(BaseModel):
    email: EmailStr
    senha: str

# Schemas para Cliente
class ClienteCreate(BaseModel):
    nome: str
    cpf: str
    email: EmailStr
    senha: str
    nivel: Optional[str] = "cliente"

class ClienteResponse(BaseModel):
    id: int
    nome: str
    cpf: str
    email: EmailStr
    nivel: str

    class Config:
        from_attributes = True

# Schemas para Funcionário
class FuncionarioCreate(BaseModel):
    nome: str
    cpf: str
    telefone: Optional[str] = None
    estado_civil: Optional[str] = None
    endereco: Optional[str] = None
    cargo: Optional[str] = None
    email: EmailStr
    senha: str
    nivel: Optional[str] = "funcionario"

class FuncionarioResponse(BaseModel):
    id: int
    nome: str
    cpf: str
    telefone: Optional[str] = None
    estado_civil: Optional[str] = None
    endereco: Optional[str] = None
    cargo: Optional[str] = None
    email: EmailStr
    nivel: str

    class Config:
        from_attributes = True

# Schemas para Admin (Tabela separada)
class AdminCreate(BaseModel):
    nome: str
    email: EmailStr
    senha: str
    nivel: Optional[str] = "admin"

class AdminResponse(BaseModel):
    id: int
    nome: str
    email: EmailStr
    nivel: str

    class Config:
        from_attributes = True

# Schemas para Veículo
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