const formulario = document.getElementById("form-cliente");
const mensagem = document.getElementById("mensagem");

const parametros = new URLSearchParams(window.location.search);
const clienteId = parametros.get("id");

if (formulario) {
    formulario.addEventListener("submit", async function (evento) {
        evento.preventDefault();
        mensagem.textContent = "";

        const senha = document.getElementById("senha").value;
        const confirmaSenha = document.getElementById("confirma-senha")?.value;

        // Validação se a confirmação de senha existe no HTML e se confere
        if (confirmaSenha !== undefined && senha !== confirmaSenha) {
            mensagem.textContent = "As senhas não coincidem!";
            return;
        }

        const cliente = {
            nome: document.getElementById("nome").value,
            cpf: document.getElementById("cpf").value,
            email: document.getElementById("email").value,
            senha: senha,
            nivel: "cliente" // Incluído para suportar o novo schema e banco de dados
        };

        try {
            let resposta;
            if (clienteId) {
                resposta = await fetch(`/clientes/${clienteId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(cliente)
                });
            } else {
                resposta = await fetch("/clientes", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(cliente)
                });
            }

            const resultado = await resposta.json();

            if (resposta.ok) {
                if (clienteId) {
                    mensagem.textContent = "Cliente alterado com sucesso!";
                } else {
                    // Alerta de sucesso e redirecionamento para o index para novos usuários sem login
                    alert("Conta cadastrada com sucesso!");
                    window.location.href = "/";
                }
            } else {
                mensagem.textContent = "Erro: " + obterMensagemErro(resultado);
                console.error("Erro da API:", resultado);
            }
        } catch (erro) {
            mensagem.textContent = "Não foi possível conectar ao servidor.";
            console.error("Erro de conexão:", erro);
        }
    });
}

function obterMensagemErro(resultado) {
    if (!resultado.detail) {
        return "Dados inválidos.";
    }
    if (Array.isArray(resultado.detail)) {
        return resultado.detail.map(erro => {
            const campo = erro.loc?.[1];
            if (campo === "email") return "E-mail inválido.";
            if (campo === "nome") return "Nome inválido.";
            if (campo === "cpf") return "CPF inválido.";
            return erro.msg;
        }).join(" ");
    }
    return resultado.detail;
}

async function carregarClientes() {
    const tabela = document.getElementById("listaClientes");
    if (!tabela) return;

    try {
        const resposta = await fetch("/clientes");
        if (!resposta.ok) throw new Error("Erro ao buscar clientes.");
        
        const clientes = await resposta.json();
        exibirClientes(clientes);
    } catch (erro) {
        tabela.innerHTML = `<tr><td colspan="6">Erro ao carregar clientes.</td></tr>`;
    }
}

function exibirClientes(lista) {
    const tabela = document.getElementById("listaClientes");
    if (!tabela) return;

    tabela.innerHTML = "";
    lista.forEach(c => {
        const linha = document.createElement("tr");
        linha.innerHTML = `
            <td>${c.id}</td>
            <td>${c.nome}</td>
            <td>${c.cpf}</td>
            <td>${c.email}</td>
            <td>
                <button type="button" class="btn btn-warning btn-sm" onclick="alterarCliente(${c.id})">✏️ Alterar</button>
            </td>
            <td>
                <button type="button" class="btn btn-danger btn-sm" onclick="excluirCliente(${c.id}, '${c.nome}')">🗑️ Excluir</button>
            </td>
        `;
        tabela.appendChild(linha);
    });
}

function alterarCliente(id) {
    window.location.href = `/frontend/cadastroCliente.html?id=${id}`;
}

async function carregarClienteParaAlteracao() {
    if (!clienteId || !formulario) return;

    try {
        const resposta = await fetch(`/clientes`);
        if (!resposta.ok) throw new Error("Erro ao buscar clientes.");
        
        const clientes = await resposta.json();
        const cliente = clientes.find(c => c.id == clienteId);

        if (!cliente) {
            mensagem.textContent = "Cliente não encontrado.";
            return;
        }

        document.getElementById("nome").value = cliente.nome;
        document.getElementById("cpf").value = cliente.cpf;
        document.getElementById("email").value = cliente.email;
        
        document.getElementById("tituloFormulario").textContent = "Alterar Cliente";
        document.getElementById("btnSalvar").textContent = "Salvar alterações";
    } catch (erro) {
        mensagem.textContent = "Não foi possível carregar os dados do cliente.";
    }
}

async function excluirCliente(id, nome) {
    if (!confirm(`Deseja realmente excluir o cliente ${nome}?`)) return;

    try {
        const resposta = await fetch(`/clientes/${id}`, { method: "DELETE" });
        const resultado = await resposta.json();
        
        if (resposta.ok) {
            alert("Cliente excluído com sucesso!");
            carregarClientes();
        } else {
            alert("Erro: " + obterMensagemErro(resultado));
        }
    } catch (erro) {
        alert("Não foi possível conectar ao servidor.");
    }
}

carregarClientes();
carregarClienteParaAlteracao();