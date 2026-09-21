# Configurando o Banco de Dados
* Crie o banco de dados:
~~~
-- ============================================================
-- 1. CRIAÇÃO DO BANCO DE DADOS E TABELAS (COM ADMIN SEPARADO)
-- ============================================================
CREATE DATABASE IF NOT EXISTS Oficina;
USE Oficina;

CREATE TABLE cliente(
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    cpf VARCHAR(14) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    nivel VARCHAR(50) NOT NULL DEFAULT 'cliente'
);

CREATE TABLE funcionario(
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    cpf VARCHAR(14) UNIQUE NOT NULL,
    telefone VARCHAR(20),
    estado_civil VARCHAR(30),
    endereco VARCHAR(200),
    cargo VARCHAR(50),
    email VARCHAR(100) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    nivel VARCHAR(50) NOT NULL DEFAULT 'funcionario'
);

-- Tabela exclusiva para o Admin / Operador do Sistema
CREATE TABLE admin(
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    nivel VARCHAR(50) NOT NULL DEFAULT 'admin'
);

CREATE TABLE veiculo(
    id INT AUTO_INCREMENT PRIMARY KEY,
    chassi VARCHAR(30) UNIQUE NOT NULL,
    placa VARCHAR(10) UNIQUE NOT NULL,
    marca VARCHAR(50) NOT NULL,
    modelo VARCHAR(50) NOT NULL,
    ano INT NOT NULL,
    cliente_id INT NOT NULL,

    CONSTRAINT fk_veiculo_cliente
        FOREIGN KEY(cliente_id)
        REFERENCES cliente(id)
        ON DELETE CASCADE
);

CREATE TABLE servico(
    id INT AUTO_INCREMENT PRIMARY KEY,
    descricao VARCHAR(200) NOT NULL,
    valor_mao_obra DECIMAL(10,2) NOT NULL
);

CREATE TABLE peca(
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(200) NOT NULL,
    marca VARCHAR(100),
    fabricante VARCHAR(100),
    preco_compra DECIMAL(10,2) NOT NULL,
    preco_venda DECIMAL(10,2) NOT NULL,
    quantidade_estoque INT DEFAULT 0
);

CREATE TABLE agendamento(
    id INT AUTO_INCREMENT PRIMARY KEY,
    veiculo_id INT NOT NULL,
    data_agendamento DATE NOT NULL,
    status VARCHAR(30) DEFAULT 'Agendado',

    CONSTRAINT fk_agendamento_veiculo
        FOREIGN KEY(veiculo_id)
        REFERENCES veiculo(id)
        ON DELETE CASCADE
);

CREATE TABLE ordem_servico(
    id INT AUTO_INCREMENT PRIMARY KEY,
    descricao_servico VARCHAR(300) NOT NULL,
    data_abertura DATE NOT NULL,
    data_fechamento DATE,
    status VARCHAR(30) DEFAULT 'Pendente',
    valor_total DECIMAL(10,2) DEFAULT 0,
    observacoes VARCHAR(300),
    veiculo_id INT NOT NULL,
    funcionario_id INT,

    CONSTRAINT fk_os_veiculo
        FOREIGN KEY(veiculo_id)
        REFERENCES veiculo(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_os_funcionario
        FOREIGN KEY(funcionario_id)
        REFERENCES funcionario(id)
        ON DELETE SET NULL
);

CREATE TABLE pagamento(
    id INT AUTO_INCREMENT PRIMARY KEY,
    valor DECIMAL(10,2) NOT NULL,
    metodo_pagamento VARCHAR(50) NOT NULL,
    data_pagamento DATE NOT NULL,
    status_pagamento VARCHAR(30) NOT NULL,
    os_id INT UNIQUE,

    CONSTRAINT fk_pagamento_os
        FOREIGN KEY(os_id)
        REFERENCES ordem_servico(id)
        ON DELETE CASCADE
);

CREATE TABLE os_pecas(
    os_id INT,
    peca_id INT,
    quantidade INT DEFAULT 1,

    PRIMARY KEY(os_id, peca_id),

    FOREIGN KEY(os_id) REFERENCES ordem_servico(id) ON DELETE CASCADE,
    FOREIGN KEY(peca_id) REFERENCES peca(id) ON DELETE CASCADE
);

CREATE TABLE os_servicos(
    os_id INT,
    servico_id INT,

    PRIMARY KEY(os_id, servico_id),

    CONSTRAINT fk_osservico_os
        FOREIGN KEY(os_id)
        REFERENCES ordem_servico(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_osservico_servico
        FOREIGN KEY(servico_id)
        REFERENCES servico(id)
        ON DELETE CASCADE
);

-- ============================================================
-- 2. VIEWS
-- ============================================================

CREATE OR REPLACE VIEW vw_estoque_pecas AS
SELECT 
    id,
    nome,
    marca,
    quantidade_estoque,
    preco_venda,
    ROUND(preco_venda - preco_compra, 2) AS margem_lucro_unidade
FROM peca;

CREATE OR REPLACE VIEW vw_veiculos_detalhados AS
SELECT 
    v.id,
    v.placa,
    v.marca,
    v.modelo,
    v.ano,
    v.cliente_id,
    c.nome AS cliente_nome
FROM veiculo v
JOIN cliente c ON v.cliente_id = c.id;

CREATE OR REPLACE VIEW vw_ordem_servico_detalhada AS
SELECT 
    os.id AS os_id,
    os.veiculo_id,
    os.data_abertura,
    os.data_fechamento,
    os.descricao_servico,
    os.status,
    c.nome AS cliente_nome,
    c.cpf AS cliente_cpf,
    v.modelo AS veiculo_modelo,
    v.placa AS veiculo_placa,
    f.nome AS funcionario_mecanico,
    COALESCE(SUM(p.preco_venda * osp.quantidade), 0) AS total_pecas,
    COALESCE(SUM(s.valor_mao_obra), 0) AS total_servicos,
    os.valor_total
FROM ordem_servico os
JOIN veiculo v ON os.veiculo_id = v.id
JOIN cliente c ON v.cliente_id = c.id
LEFT JOIN funcionario f ON os.funcionario_id = f.id
LEFT JOIN os_pecas osp ON os.id = osp.os_id
LEFT JOIN peca p ON osp.peca_id = p.id
LEFT JOIN os_servicos oss ON os.id = oss.os_id
LEFT JOIN servico s ON oss.servico_id = s.id
GROUP BY 
    os.id, 
    os.veiculo_id, 
    os.data_abertura, 
    os.data_fechamento, 
    os.descricao_servico, 
    os.status, 
    os.valor_total,
    c.nome, 
    c.cpf, 
    v.modelo, 
    v.placa, 
    f.nome;

-- ============================================================
-- 3. STORED FUNCTIONS
-- ============================================================
DELIMITER //

CREATE FUNCTION fn_calcular_total_os(p_os_id INT) 
RETURNS DECIMAL(10,2)
DETERMINISTIC
BEGIN
    DECLARE v_total_pecas DECIMAL(10,2) DEFAULT 0;
    DECLARE v_total_servicos DECIMAL(10,2) DEFAULT 0;

    SELECT COALESCE(SUM(p.preco_venda * osp.quantidade), 0)
    INTO v_total_pecas
    FROM os_pecas osp
    JOIN peca p ON osp.peca_id = p.id
    WHERE osp.os_id = p_os_id;

    SELECT COALESCE(SUM(s.valor_mao_obra), 0)
    INTO v_total_servicos
    FROM os_servicos oss
    JOIN servico s ON oss.servico_id = s.id
    WHERE oss.os_id = p_os_id;

    RETURN (v_total_pecas + v_total_servicos);
END //

CREATE FUNCTION fn_calcular_total_gasto_cliente(p_cliente_id INT)
RETURNS DECIMAL(10,2)
DETERMINISTIC
BEGIN
    DECLARE v_total DECIMAL(10,2) DEFAULT 0;

    SELECT COALESCE(SUM(os.valor_total), 0)
    INTO v_total
    FROM ordem_servico os
    JOIN veiculo v ON os.veiculo_id = v.id
    WHERE v.cliente_id = p_cliente_id AND os.status = 'Concluído';

    RETURN v_total;
END //

DELIMITER ;

-- ============================================================
-- 4. STORED PROCEDURES
-- ============================================================
DELIMITER //

CREATE PROCEDURE sp_cadastrar_cliente(
    IN p_nome VARCHAR(100),
    IN p_cpf VARCHAR(14),
    IN p_email VARCHAR(100),
    IN p_senha VARCHAR(255),
    IN p_nivel VARCHAR(50),
    OUT p_id INT
)
BEGIN
    INSERT INTO cliente (nome, cpf, email, senha, nivel)
    VALUES (p_nome, p_cpf, p_email, p_senha, COALESCE(p_nivel, 'cliente'));
    SET p_id = LAST_INSERT_ID();
END //

CREATE PROCEDURE sp_alterar_cliente(
    IN p_id INT,
    IN p_nome VARCHAR(100),
    IN p_cpf VARCHAR(14),
    IN p_email VARCHAR(100),
    IN p_senha VARCHAR(255),
    IN p_nivel VARCHAR(50)
)
BEGIN
    UPDATE cliente 
    SET nome = p_nome, cpf = p_cpf, email = p_email, senha = p_senha, nivel = COALESCE(p_nivel, nivel)
    WHERE id = p_id;
END //

-- Procedure para cadastrar novos administradores no banco
CREATE PROCEDURE sp_cadastrar_admin(
    IN p_nome VARCHAR(100),
    IN p_email VARCHAR(100),
    IN p_senha VARCHAR(255),
    IN p_nivel VARCHAR(50),
    OUT p_id INT
)
BEGIN
    INSERT INTO admin (nome, email, senha, nivel)
    VALUES (p_nome, p_email, p_senha, COALESCE(p_nivel, 'admin'));
    SET p_id = LAST_INSERT_ID();
END //

CREATE PROCEDURE sp_cadastrar_veiculo(
    IN p_placa VARCHAR(10),
    IN p_marca VARCHAR(50),
    IN p_modelo VARCHAR(50),
    IN p_ano INT,
    IN p_cliente_id INT,
    OUT p_id INT
)
BEGIN
    DECLARE v_chassi VARCHAR(30);
    SET v_chassi = CONCAT('AUTO_', REPLACE(p_placa, '-', ''), '_', FLOOR(RAND() * 10000));

    INSERT INTO veiculo (chassi, placa, marca, modelo, ano, cliente_id)
    VALUES (v_chassi, p_placa, p_marca, p_modelo, p_ano, p_cliente_id);
    
    SET p_id = LAST_INSERT_ID();
END //

CREATE PROCEDURE sp_adicionar_peca_os(
    IN p_os_id INT,
    IN p_peca_id INT,
    IN p_quantidade INT
)
BEGIN
    DECLARE v_estoque_atual INT;

    SELECT quantidade_estoque INTO v_estoque_atual
    FROM peca WHERE id = p_peca_id;

    IF v_estoque_atual >= p_quantidade THEN
        INSERT INTO os_pecas (os_id, peca_id, quantidade)
        VALUES (p_os_id, p_peca_id, p_quantidade)
        ON DUPLICATE KEY UPDATE quantidade = quantidade + p_quantidade;

        UPDATE ordem_servico 
        SET valor_total = fn_calcular_total_os(p_os_id)
        WHERE id = p_os_id;
    ELSE
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Estoque insuficiente para a peça solicitada.';
    END IF;
END //

CREATE PROCEDURE sp_finalizar_os(
    IN p_os_id INT,
    IN p_metodo_pagamento VARCHAR(50)
)
BEGIN
    DECLARE v_total DECIMAL(10,2);

    SET v_total = fn_calcular_total_os(p_os_id);

    UPDATE ordem_servico 
    SET status = 'Concluído',
        data_fechamento = CURDATE(),
        valor_total = v_total
    WHERE id = p_os_id;

    INSERT INTO pagamento (valor, metodo_pagamento, data_pagamento, status_pagamento, os_id)
    VALUES (v_total, p_metodo_pagamento, CURDATE(), 'Aprovado', p_os_id);
END //

DELIMITER ;

-- ============================================================
-- 5. TRIGGERS
-- ============================================================
DELIMITER //

CREATE TRIGGER trg_baixa_estoque_peca
AFTER INSERT ON os_pecas
FOR EACH ROW
BEGIN
    UPDATE peca 
    SET quantidade_estoque = quantidade_estoque - NEW.quantidade
    WHERE id = NEW.peca_id;
END //

CREATE TRIGGER trg_estorno_estoque_peca
AFTER DELETE ON os_pecas
FOR EACH ROW
BEGIN
    UPDATE peca 
    SET quantidade_estoque = quantidade_estoque + OLD.quantidade
    WHERE id = OLD.peca_id;
END //

DELIMITER ;

-- ============================================================
-- 6. DADOS DE TESTE (INICIALIZAÇÃO)
-- ============================================================
INSERT INTO cliente (nome, cpf, email, senha, nivel) VALUES
('João Silva', '111.222.333-44', 'joao.silva@email.com', '123456', 'cliente'),
('Maria Oliveira', '555.666.777-88', 'maria.oliveira@email.com', '123456', 'cliente');

INSERT INTO funcionario (nome, cpf, telefone, estado_civil, endereco, cargo, email, senha, nivel) VALUES
('Carlos Souza', '999.888.777-66', '(11) 98888-7777', 'Casado(a)', 'Rua A, 123', 'Mecânico Chefe', 'carlos.mecanico@oficina.com', 'mecanico123', 'funcionario');


-- Inserção do Administrador Inicial
INSERT INTO admin (nome, email, senha, nivel) VALUES
('Diana (Admin)', 'admin@gmail.com', 'admin', 'admin');


INSERT INTO veiculo (chassi, placa, marca, modelo, ano, cliente_id) VALUES
('9BWZZZ377VT001001', 'ABC1D23', 'Volkswagen', 'Gol 1.0', 2020, 1),
('9BD11122233344455', 'XYZ9876', 'Fiat', 'Uno Mille', 2018, 2);

INSERT INTO servico (descricao, valor_mao_obra) VALUES
('Troca de Óleo e Filtro', 80.00),
('Alinhamento e Balanceamento', 120.00);

INSERT INTO peca (nome, marca, fabricante, preco_compra, preco_venda, quantidade_estoque) VALUES
('Óleo Sintético 5W30 1L', 'Havoline', 'Texaco', 25.00, 45.00, 50),
('Filtro de Óleo Engine', 'Fram', 'Sogefi', 15.00, 30.00, 30);

INSERT INTO agendamento (veiculo_id, data_agendamento, status) VALUES
(1, '2026-03-25', 'Agendado'),
(2, '2026-03-26', 'Concluído');

INSERT INTO ordem_servico (descricao_servico, data_abertura, data_fechamento, status, valor_total, observacoes, veiculo_id, funcionario_id) VALUES
('Revisão Geral de Rotina', '2026-03-20', NULL, 'Em andamento', 155.00, 'Cliente relatou barulho leve na suspensão', 1, 1),
('Troca de Óleo Completa', '2026-03-18', '2026-03-18', 'Concluído', 155.00, 'Serviço efetuado sem intercorrências', 2, 1);

INSERT INTO os_pecas (os_id, peca_id, quantidade) VALUES
(1, 1, 1),
(2, 1, 1);

INSERT INTO os_servicos (os_id, servico_id) VALUES
(1, 1),
(2, 1);

INSERT INTO pagamento (valor, metodo_pagamento, data_pagamento, status_pagamento, os_id) VALUES
(155.00, 'PIX', '2026-03-18', 'Aprovado', 2);
~~~
&emsp;Execute os comandos.

* Crie o arquivo .env:
~~~
DB_HOST=localhost
DB_PORT=3306
DB_NAME=escola
DB_USER=root
DB_PASSWORD=suaSenha
~~~
&emsp;Valores exemplo.

# Executando o Projeto
* Clone o repositório:
~~~
git clone https://github.com/diilys/OficinaMecanica_API.git
cd OficinaMecanica_API
~~~

* Crie e ative o ambiente virtual:
~~~
# Linux
python3 -m venv .venv
source .venv/bin/activate

# Windows
python -m venv .venv
.venv\Scripts\activate
~~~

* Instale as dependências:
~~~
pip install -r requirements.txt
~~~

* Inicie o servidor backend:
~~~
uvicorn backend.main:app --reload
~~~
* Acesse a aplicação: \
Interface Web: `http://127.0.0.1:8000` \
Documentação Swagger (API): `http://127.0.0.1:8000/docs`
