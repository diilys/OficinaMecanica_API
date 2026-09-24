# Configurando o Banco de Dados
* Crie o banco de dados:
~~~
CREATE DATABASE IF NOT EXISTS Oficina
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE Oficina;


-- Usuários
CREATE TABLE usuario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    tipo ENUM('cliente', 'funcionario', 'admin') NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- Sessões autenticadas
-- O navegador recebe o token original; o banco guarda apenas o hash do token.
CREATE TABLE sessao (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token_hash CHAR(64) NOT NULL UNIQUE,
    usuario_id INT NOT NULL,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expira_em DATETIME NOT NULL,
    CONSTRAINT fk_sessao_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE CASCADE,
    INDEX idx_sessao_usuario (usuario_id),
    INDEX idx_sessao_expira (expira_em)
);


-- Clientes
CREATE TABLE cliente (
    usuario_id INT PRIMARY KEY,
    cpf VARCHAR(14) NOT NULL UNIQUE,

    CONSTRAINT fk_cliente_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuario(id)
        ON DELETE RESTRICT
);


-- Funcionários
CREATE TABLE funcionario (
    usuario_id INT PRIMARY KEY,
    cpf VARCHAR(14) NOT NULL UNIQUE,
    telefone VARCHAR(20),
    estado_civil VARCHAR(30),
    endereco VARCHAR(200),
    cargo VARCHAR(50),

    CONSTRAINT fk_funcionario_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuario(id)
        ON DELETE RESTRICT
);


-- Veículos
CREATE TABLE veiculo (
    id INT AUTO_INCREMENT PRIMARY KEY,
    placa VARCHAR(10) NOT NULL UNIQUE,
    marca VARCHAR(50) NOT NULL,
    modelo VARCHAR(50) NOT NULL,
    ano INT NOT NULL,
    cliente_id INT NOT NULL,

    CONSTRAINT fk_veiculo_cliente
        FOREIGN KEY (cliente_id)
        REFERENCES cliente(usuario_id)
        ON DELETE RESTRICT
);


-- Serviços
CREATE TABLE servico (
    id INT AUTO_INCREMENT PRIMARY KEY,
    descricao VARCHAR(200) NOT NULL,
    valor_mao_obra DECIMAL(10,2) NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT chk_servico_valor
        CHECK (valor_mao_obra >= 0)
);


-- Peças
CREATE TABLE peca (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(200) NOT NULL,
    marca VARCHAR(100),
    fabricante VARCHAR(100),
    preco_compra DECIMAL(10,2) NOT NULL,
    preco_venda DECIMAL(10,2) NOT NULL,
    quantidade_estoque INT NOT NULL DEFAULT 0,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT chk_peca_preco_compra
        CHECK (preco_compra >= 0),

    CONSTRAINT chk_peca_preco_venda
        CHECK (preco_venda >= 0),

    CONSTRAINT chk_peca_estoque
        CHECK (quantidade_estoque >= 0)
);


-- Agendamentos
CREATE TABLE agendamento (
    id INT AUTO_INCREMENT PRIMARY KEY,
    veiculo_id INT NOT NULL,
    data_hora DATETIME NOT NULL,
    status ENUM(
        'agendado',
        'confirmado',
        'concluido',
        'cancelado'
    ) NOT NULL DEFAULT 'agendado',
    observacoes VARCHAR(300),

    CONSTRAINT fk_agendamento_veiculo
        FOREIGN KEY (veiculo_id)
        REFERENCES veiculo(id)
        ON DELETE RESTRICT
);


-- Ordens de serviço
CREATE TABLE ordem_servico (
    id INT AUTO_INCREMENT PRIMARY KEY,
    descricao_servico VARCHAR(300) NOT NULL,
    data_abertura DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_fechamento DATETIME,
    status ENUM(
        'pendente',
        'em_andamento',
        'concluida',
        'cancelada'
    ) NOT NULL DEFAULT 'pendente',
    valor_base DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    valor_total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    observacoes VARCHAR(300),
    veiculo_id INT NOT NULL,
    funcionario_id INT,

    CONSTRAINT fk_os_veiculo
        FOREIGN KEY (veiculo_id)
        REFERENCES veiculo(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_os_funcionario
        FOREIGN KEY (funcionario_id)
        REFERENCES funcionario(usuario_id)
        ON DELETE SET NULL,

    CONSTRAINT chk_os_valor_base
        CHECK (valor_base >= 0),

    CONSTRAINT chk_os_valor_total
        CHECK (valor_total >= 0)
);


-- Peças utilizadas nas ordens de serviço
CREATE TABLE os_pecas (
    os_id INT NOT NULL,
    peca_id INT NOT NULL,
    quantidade INT NOT NULL DEFAULT 1,
    valor_unitario DECIMAL(10,2) NOT NULL,

    PRIMARY KEY (os_id, peca_id),

    CONSTRAINT fk_ospeca_os
        FOREIGN KEY (os_id)
        REFERENCES ordem_servico(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_ospeca_peca
        FOREIGN KEY (peca_id)
        REFERENCES peca(id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_ospeca_quantidade
        CHECK (quantidade > 0),

    CONSTRAINT chk_ospeca_valor
        CHECK (valor_unitario >= 0)
);


-- Serviços realizados nas ordens de serviço
CREATE TABLE os_servicos (
    os_id INT NOT NULL,
    servico_id INT NOT NULL,
    valor DECIMAL(10,2) NOT NULL,

    PRIMARY KEY (os_id, servico_id),

    CONSTRAINT fk_osservico_os
        FOREIGN KEY (os_id)
        REFERENCES ordem_servico(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_osservico_servico
        FOREIGN KEY (servico_id)
        REFERENCES servico(id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_osservico_valor
        CHECK (valor >= 0)
);


-- Pagamentos
CREATE TABLE pagamento (
    id INT AUTO_INCREMENT PRIMARY KEY,
    os_id INT NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    metodo_pagamento ENUM(
        'dinheiro',
        'pix',
        'credito',
        'debito',
        'outro'
    ) NOT NULL,
    data_pagamento DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status ENUM(
        'pendente',
        'aprovado',
        'cancelado',
        'estornado'
    ) NOT NULL DEFAULT 'pendente',

    CONSTRAINT fk_pagamento_os
        FOREIGN KEY (os_id)
        REFERENCES ordem_servico(id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_pagamento_valor
        CHECK (valor > 0)
);


-- ============================================================
-- VIEWS
-- ============================================================

-- Exibe o estoque de peças ativas
CREATE OR REPLACE VIEW vw_estoque_pecas AS
SELECT
    id,
    nome,
    marca,
    fabricante,
    quantidade_estoque,
    preco_compra,
    preco_venda,
    ROUND(preco_venda - preco_compra, 2) AS margem_lucro_unidade
FROM peca
WHERE ativo = TRUE;


-- Exibe os veículos com os dados de seus clientes
CREATE OR REPLACE VIEW vw_veiculos_detalhados AS
SELECT
    v.id,
    v.placa,
    v.marca,
    v.modelo,
    v.ano,
    v.cliente_id,
    u.nome AS cliente_nome,
    c.cpf AS cliente_cpf,
    u.email AS cliente_email,
    u.ativo AS cliente_ativo
FROM veiculo v
JOIN cliente c
    ON v.cliente_id = c.usuario_id
JOIN usuario u
    ON c.usuario_id = u.id;


-- Exibe os clientes e seus dados de usuário
CREATE OR REPLACE VIEW vw_clientes_detalhados AS
SELECT
    u.id,
    u.nome,
    c.cpf,
    u.email,
    u.ativo,
    u.criado_em
FROM usuario u
JOIN cliente c
    ON u.id = c.usuario_id;


-- Exibe os funcionários e seus dados de usuário
CREATE OR REPLACE VIEW vw_funcionarios_detalhados AS
SELECT
    u.id,
    u.nome,
    f.cpf,
    f.telefone,
    f.estado_civil,
    f.endereco,
    f.cargo,
    u.email,
    u.ativo,
    u.criado_em
FROM usuario u
JOIN funcionario f
    ON u.id = f.usuario_id;


-- Exibe as ordens de serviço com cliente, veículo e funcionário
CREATE OR REPLACE VIEW vw_ordem_servico_detalhada AS
SELECT
    os.id AS os_id,
    os.veiculo_id,
    os.data_abertura,
    os.data_fechamento,
    os.descricao_servico,
    os.status,
    os.valor_base,

    uc.nome AS cliente_nome,
    c.cpf AS cliente_cpf,

    v.modelo AS veiculo_modelo,
    v.placa AS veiculo_placa,

    uf.nome AS funcionario_mecanico,

    COALESCE(
        (
            SELECT SUM(op.quantidade * op.valor_unitario)
            FROM os_pecas op
            WHERE op.os_id = os.id
        ),
        0
    ) AS total_pecas,

    COALESCE(
        (
            SELECT SUM(oss.valor)
            FROM os_servicos oss
            WHERE oss.os_id = os.id
        ),
        0
    ) AS total_servicos,

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
    ON f.usuario_id = uf.id;


-- ============================================================
-- FUNCTIONS
-- ============================================================

DELIMITER //


-- Calcula o valor total de uma ordem de serviço
CREATE FUNCTION fn_calcular_total_os(p_os_id INT)
RETURNS DECIMAL(10,2)
READS SQL DATA
BEGIN
    DECLARE v_valor_base DECIMAL(10,2) DEFAULT 0;
    DECLARE v_total_pecas DECIMAL(10,2) DEFAULT 0;
    DECLARE v_total_servicos DECIMAL(10,2) DEFAULT 0;

    SELECT COALESCE(valor_base, 0)
    INTO v_valor_base
    FROM ordem_servico
    WHERE id = p_os_id;

    SELECT COALESCE(
        SUM(quantidade * valor_unitario),
        0
    )
    INTO v_total_pecas
    FROM os_pecas
    WHERE os_id = p_os_id;


    SELECT COALESCE(
        SUM(valor),
        0
    )
    INTO v_total_servicos
    FROM os_servicos
    WHERE os_id = p_os_id;


    RETURN v_valor_base + v_total_pecas + v_total_servicos;
END //


-- Calcula o total gasto por um cliente em ordens concluídas
CREATE FUNCTION fn_calcular_total_gasto_cliente(p_cliente_id INT)
RETURNS DECIMAL(10,2)
READS SQL DATA
BEGIN
    DECLARE v_total DECIMAL(10,2) DEFAULT 0;

    SELECT COALESCE(SUM(os.valor_total), 0)
    INTO v_total
    FROM ordem_servico os

    JOIN veiculo v
        ON os.veiculo_id = v.id

    WHERE v.cliente_id = p_cliente_id
      AND os.status = 'concluida';

    RETURN v_total;
END //


DELIMITER ;


-- ============================================================
-- PROCEDURES
-- ============================================================

DELIMITER //


-- Cadastra um novo cliente e seu usuário
CREATE PROCEDURE sp_cadastrar_cliente(
    IN p_nome VARCHAR(100),
    IN p_cpf VARCHAR(14),
    IN p_email VARCHAR(100),
    IN p_senha_hash VARCHAR(255),
    OUT p_id INT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    INSERT INTO usuario (
        nome,
        email,
        senha_hash,
        tipo
    )
    VALUES (
        p_nome,
        p_email,
        p_senha_hash,
        'cliente'
    );

    SET p_id = LAST_INSERT_ID();

    INSERT INTO cliente (
        usuario_id,
        cpf
    )
    VALUES (
        p_id,
        p_cpf
    );

    COMMIT;
END //


-- Altera os dados de um cliente
CREATE PROCEDURE sp_alterar_cliente(
    IN p_id INT,
    IN p_nome VARCHAR(100),
    IN p_cpf VARCHAR(14),
    IN p_email VARCHAR(100)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    UPDATE usuario
    SET
        nome = p_nome,
        email = p_email
    WHERE id = p_id
      AND tipo = 'cliente';

    UPDATE cliente
    SET cpf = p_cpf
    WHERE usuario_id = p_id;

    COMMIT;
END //


-- Altera a senha de um usuário
CREATE PROCEDURE sp_alterar_senha(
    IN p_usuario_id INT,
    IN p_nova_senha_hash VARCHAR(255)
)
BEGIN
    UPDATE usuario
    SET senha_hash = p_nova_senha_hash
    WHERE id = p_usuario_id;
END //


-- Inativa uma conta sem apagar seu histórico
CREATE PROCEDURE sp_inativar_usuario(
    IN p_usuario_id INT
)
BEGIN
    UPDATE usuario
    SET ativo = FALSE
    WHERE id = p_usuario_id;
END //


-- Reativa uma conta anteriormente inativada
CREATE PROCEDURE sp_reativar_usuario(
    IN p_usuario_id INT
)
BEGIN
    UPDATE usuario
    SET ativo = TRUE
    WHERE id = p_usuario_id;
END //


-- Cadastra um novo funcionário e seu usuário
CREATE PROCEDURE sp_cadastrar_funcionario(
    IN p_nome VARCHAR(100),
    IN p_cpf VARCHAR(14),
    IN p_telefone VARCHAR(20),
    IN p_estado_civil VARCHAR(30),
    IN p_endereco VARCHAR(200),
    IN p_cargo VARCHAR(50),
    IN p_email VARCHAR(100),
    IN p_senha_hash VARCHAR(255),
    OUT p_id INT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    INSERT INTO usuario (
        nome,
        email,
        senha_hash,
        tipo
    )
    VALUES (
        p_nome,
        p_email,
        p_senha_hash,
        'funcionario'
    );

    SET p_id = LAST_INSERT_ID();

    INSERT INTO funcionario (
        usuario_id,
        cpf,
        telefone,
        estado_civil,
        endereco,
        cargo
    )
    VALUES (
        p_id,
        p_cpf,
        p_telefone,
        p_estado_civil,
        p_endereco,
        p_cargo
    );

    COMMIT;
END //


-- Cadastra um administrador
CREATE PROCEDURE sp_cadastrar_admin(
    IN p_nome VARCHAR(100),
    IN p_email VARCHAR(100),
    IN p_senha_hash VARCHAR(255),
    OUT p_id INT
)
BEGIN
    INSERT INTO usuario (
        nome,
        email,
        senha_hash,
        tipo
    )
    VALUES (
        p_nome,
        p_email,
        p_senha_hash,
        'admin'
    );

    SET p_id = LAST_INSERT_ID();
END //


-- Cadastra um veículo para um cliente
CREATE PROCEDURE sp_cadastrar_veiculo(
    IN p_placa VARCHAR(10),
    IN p_marca VARCHAR(50),
    IN p_modelo VARCHAR(50),
    IN p_ano INT,
    IN p_cliente_id INT,
    OUT p_id INT
)
BEGIN
    DECLARE v_cliente_ativo BOOLEAN;

    SELECT u.ativo
    INTO v_cliente_ativo
    FROM cliente c
    JOIN usuario u
        ON c.usuario_id = u.id
    WHERE c.usuario_id = p_cliente_id;

    IF v_cliente_ativo IS NULL THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Cliente não encontrado.';

    ELSEIF v_cliente_ativo = FALSE THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Não é possível cadastrar veículo para cliente inativo.';

    ELSE

        INSERT INTO veiculo (
            placa,
            marca,
            modelo,
            ano,
            cliente_id
        )
        VALUES (
            p_placa,
            p_marca,
            p_modelo,
            p_ano,
            p_cliente_id
        );

        SET p_id = LAST_INSERT_ID();

    END IF;
END //


-- Adiciona uma peça à ordem e realiza a baixa do estoque
CREATE PROCEDURE sp_adicionar_peca_os(
    IN p_os_id INT,
    IN p_peca_id INT,
    IN p_quantidade INT
)
BEGIN
    DECLARE v_estoque_atual INT;
    DECLARE v_preco DECIMAL(10,2);
    DECLARE v_ativo BOOLEAN;

    IF p_quantidade <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'A quantidade deve ser maior que zero.';
    END IF;

    SELECT
        quantidade_estoque,
        preco_venda,
        ativo
    INTO
        v_estoque_atual,
        v_preco,
        v_ativo
    FROM peca
    WHERE id = p_peca_id
    FOR UPDATE;


    IF v_estoque_atual IS NULL THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Peça não encontrada.';

    ELSEIF v_ativo = FALSE THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'A peça está inativa.';

    ELSEIF v_estoque_atual < p_quantidade THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Estoque insuficiente para a peça solicitada.';

    ELSE

        INSERT INTO os_pecas (
            os_id,
            peca_id,
            quantidade,
            valor_unitario
        )
        VALUES (
            p_os_id,
            p_peca_id,
            p_quantidade,
            v_preco
        )

        ON DUPLICATE KEY UPDATE
            quantidade = quantidade + p_quantidade;


        UPDATE peca
        SET quantidade_estoque =
            quantidade_estoque - p_quantidade
        WHERE id = p_peca_id;


        UPDATE ordem_servico
        SET valor_total =
            fn_calcular_total_os(p_os_id)
        WHERE id = p_os_id;

    END IF;
END //


-- Remove uma quantidade de peça da ordem e devolve ao estoque
CREATE PROCEDURE sp_remover_peca_os(
    IN p_os_id INT,
    IN p_peca_id INT,
    IN p_quantidade INT
)
BEGIN
    DECLARE v_quantidade_os INT;

    IF p_quantidade <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'A quantidade deve ser maior que zero.';
    END IF;


    SELECT quantidade
    INTO v_quantidade_os
    FROM os_pecas
    WHERE os_id = p_os_id
      AND peca_id = p_peca_id
    FOR UPDATE;


    IF v_quantidade_os IS NULL THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Peça não encontrada nesta ordem de serviço.';

    ELSEIF p_quantidade > v_quantidade_os THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Quantidade informada maior que a utilizada na ordem.';

    ELSE

        IF p_quantidade = v_quantidade_os THEN

            DELETE FROM os_pecas
            WHERE os_id = p_os_id
              AND peca_id = p_peca_id;

        ELSE

            UPDATE os_pecas
            SET quantidade = quantidade - p_quantidade
            WHERE os_id = p_os_id
              AND peca_id = p_peca_id;

        END IF;


        UPDATE peca
        SET quantidade_estoque =
            quantidade_estoque + p_quantidade
        WHERE id = p_peca_id;


        UPDATE ordem_servico
        SET valor_total =
            fn_calcular_total_os(p_os_id)
        WHERE id = p_os_id;

    END IF;
END //


-- Adiciona um serviço à ordem preservando o preço atual
CREATE PROCEDURE sp_adicionar_servico_os(
    IN p_os_id INT,
    IN p_servico_id INT
)
BEGIN
    DECLARE v_valor DECIMAL(10,2);
    DECLARE v_ativo BOOLEAN;

    SELECT
        valor_mao_obra,
        ativo
    INTO
        v_valor,
        v_ativo
    FROM servico
    WHERE id = p_servico_id;


    IF v_valor IS NULL THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Serviço não encontrado.';

    ELSEIF v_ativo = FALSE THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'O serviço está inativo.';

    ELSE

        INSERT INTO os_servicos (
            os_id,
            servico_id,
            valor
        )
        VALUES (
            p_os_id,
            p_servico_id,
            v_valor
        )

        ON DUPLICATE KEY UPDATE
            valor = valor;


        UPDATE ordem_servico
        SET valor_total =
            fn_calcular_total_os(p_os_id)
        WHERE id = p_os_id;

    END IF;
END //


-- Remove um serviço da ordem
CREATE PROCEDURE sp_remover_servico_os(
    IN p_os_id INT,
    IN p_servico_id INT
)
BEGIN
    DELETE FROM os_servicos
    WHERE os_id = p_os_id
      AND servico_id = p_servico_id;


    UPDATE ordem_servico
    SET valor_total =
        fn_calcular_total_os(p_os_id)
    WHERE id = p_os_id;
END //


-- Finaliza uma ordem de serviço
CREATE PROCEDURE sp_finalizar_os(
    IN p_os_id INT
)
BEGIN
    DECLARE v_total DECIMAL(10,2);

    SET v_total = fn_calcular_total_os(p_os_id);

    UPDATE ordem_servico
    SET
        status = 'concluida',
        data_fechamento = CURRENT_TIMESTAMP,
        valor_total = v_total
    WHERE id = p_os_id;
END //


-- Exclui uma ordem de serviço devolvendo as peças ao estoque
CREATE PROCEDURE sp_excluir_os(
    IN p_os_id INT
)
BEGIN
    DECLARE v_existe INT DEFAULT 0;

    SELECT COUNT(*)
    INTO v_existe
    FROM ordem_servico
    WHERE id = p_os_id;

    IF v_existe = 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Ordem de serviço não encontrada.';
    ELSE
        UPDATE peca p
        JOIN os_pecas op
            ON op.peca_id = p.id
        SET p.quantidade_estoque =
            p.quantidade_estoque + op.quantidade
        WHERE op.os_id = p_os_id;

        DELETE FROM pagamento
        WHERE os_id = p_os_id;

        DELETE FROM ordem_servico
        WHERE id = p_os_id;
    END IF;
END //


-- Registra um pagamento para uma ordem de serviço
CREATE PROCEDURE sp_registrar_pagamento(
    IN p_os_id INT,
    IN p_valor DECIMAL(10,2),
    IN p_metodo_pagamento VARCHAR(20)
)
BEGIN
    DECLARE v_metodo VARCHAR(20);

    SET v_metodo = LOWER(p_metodo_pagamento);

    IF p_valor <= 0 THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'O valor do pagamento deve ser maior que zero.';

    ELSEIF v_metodo NOT IN (
        'dinheiro',
        'pix',
        'credito',
        'debito',
        'outro'
    ) THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Método de pagamento inválido.';

    ELSE

        INSERT INTO pagamento (
            os_id,
            valor,
            metodo_pagamento,
            status
        )
        VALUES (
            p_os_id,
            p_valor,
            v_metodo,
            'aprovado'
        );

    END IF;
END //


DELIMITER ;


-- ============================================================
-- TRIGGERS
-- ============================================================

DELIMITER //


-- Atualiza o total da OS após alteração manual de peças
CREATE TRIGGER trg_os_pecas_atualizar_total_insert
AFTER INSERT ON os_pecas
FOR EACH ROW
BEGIN
    UPDATE ordem_servico
    SET valor_total = fn_calcular_total_os(NEW.os_id)
    WHERE id = NEW.os_id;
END //


-- Atualiza o total da OS após alteração da quantidade de peças
CREATE TRIGGER trg_os_pecas_atualizar_total_update
AFTER UPDATE ON os_pecas
FOR EACH ROW
BEGIN
    UPDATE ordem_servico
    SET valor_total = fn_calcular_total_os(NEW.os_id)
    WHERE id = NEW.os_id;
END //


-- Atualiza o total da OS após remoção de peças
CREATE TRIGGER trg_os_pecas_atualizar_total_delete
AFTER DELETE ON os_pecas
FOR EACH ROW
BEGIN
    UPDATE ordem_servico
    SET valor_total = fn_calcular_total_os(OLD.os_id)
    WHERE id = OLD.os_id;
END //


-- Atualiza o total da OS após adicionar um serviço
CREATE TRIGGER trg_os_servicos_atualizar_total_insert
AFTER INSERT ON os_servicos
FOR EACH ROW
BEGIN
    UPDATE ordem_servico
    SET valor_total = fn_calcular_total_os(NEW.os_id)
    WHERE id = NEW.os_id;
END //


-- Atualiza o total da OS após alterar um serviço
CREATE TRIGGER trg_os_servicos_atualizar_total_update
AFTER UPDATE ON os_servicos
FOR EACH ROW
BEGIN
    UPDATE ordem_servico
    SET valor_total = fn_calcular_total_os(NEW.os_id)
    WHERE id = NEW.os_id;
END //


-- Atualiza o total da OS após remover um serviço
CREATE TRIGGER trg_os_servicos_atualizar_total_delete
AFTER DELETE ON os_servicos
FOR EACH ROW
BEGIN
    UPDATE ordem_servico
    SET valor_total = fn_calcular_total_os(OLD.os_id)
    WHERE id = OLD.os_id;
END //


DELIMITER ;


-- ============================================================
-- DADOS DE TESTE
-- ============================================================

-- Usuários de teste
INSERT INTO usuario (
    nome,
    email,
    senha_hash,
    tipo
)
VALUES
(
    'João Silva',
    'joao.silva@email.com',
    '123456',
    'cliente'
),
(
    'Maria Oliveira',
    'maria.oliveira@email.com',
    '123456',
    'cliente'
),
(
    'Carlos Souza',
    'carlos.mecanico@oficina.com',
    'mecanico123',
    'funcionario'
),
(
    'Diana (Admin)',
    'admin@gmail.com',
    'admin',
    'admin'
);


-- Clientes de teste
INSERT INTO cliente (
    usuario_id,
    cpf
)
VALUES
(1, '111.222.333-44'),
(2, '555.666.777-88');


-- Funcionário de teste
INSERT INTO funcionario (
    usuario_id,
    cpf,
    telefone,
    estado_civil,
    endereco,
    cargo
)
VALUES
(
    3,
    '999.888.777-66',
    '(11) 98888-7777',
    'Casado(a)',
    'Rua A, 123',
    'Mecânico Chefe'
);


-- Veículos de teste
INSERT INTO veiculo (
    placa,
    marca,
    modelo,
    ano,
    cliente_id
)
VALUES
(
    'ABC1D23',
    'Volkswagen',
    'Gol 1.0',
    2020,
    1
),
(
    'XYZ9876',
    'Fiat',
    'Uno Mille',
    2018,
    2
);


-- Serviços de teste
INSERT INTO servico (
    descricao,
    valor_mao_obra
)
VALUES
(
    'Troca de Óleo e Filtro',
    80.00
),
(
    'Alinhamento e Balanceamento',
    120.00
);


-- Peças de teste
INSERT INTO peca (
    nome,
    marca,
    fabricante,
    preco_compra,
    preco_venda,
    quantidade_estoque
)
VALUES
(
    'Óleo Sintético 5W30 1L',
    'Havoline',
    'Texaco',
    25.00,
    45.00,
    50
),
(
    'Filtro de Óleo Engine',
    'Fram',
    'Sogefi',
    15.00,
    30.00,
    30
);


-- Agendamentos de teste
INSERT INTO agendamento (
    veiculo_id,
    data_hora,
    status
)
VALUES
(
    1,
    '2026-09-25 09:00:00',
    'agendado'
),
(
    2,
    '2026-09-26 14:00:00',
    'confirmado'
);


-- Ordens de serviço de teste
INSERT INTO ordem_servico (
    descricao_servico,
    data_abertura,
    data_fechamento,
    status,
    valor_total,
    observacoes,
    veiculo_id,
    funcionario_id
)
VALUES
(
    'Revisão Geral de Rotina',
    '2026-09-20 08:00:00',
    NULL,
    'em_andamento',
    0.00,
    'Cliente relatou barulho leve na suspensão',
    1,
    3
),
(
    'Troca de Óleo Completa',
    '2026-09-18 10:00:00',
    '2026-09-18 11:30:00',
    'concluida',
    0.00,
    'Serviço efetuado sem intercorrências',
    2,
    3
);


-- Peças utilizadas nas ordens de teste
CALL sp_adicionar_peca_os(1, 1, 1);
CALL sp_adicionar_peca_os(2, 1, 1);


-- Serviços utilizados nas ordens de teste
CALL sp_adicionar_servico_os(1, 1);
CALL sp_adicionar_servico_os(2, 1);


-- Pagamento de teste
CALL sp_registrar_pagamento(
    2,
    fn_calcular_total_os(2),
    'pix'
);
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
