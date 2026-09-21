const formulario = document.getElementById("form-cliente");
const mensagem = document.getElementById("mensagem");

const parametros = new URLSearchParams(window.location.search);
const idCliente = parametros.get("id");

let clientes = [];

// ======================================================
// CADASTRAR OU ALTERAR CLIENTE / CONTA
// ======================================================
if (formulario) {
    formulario.addEventListener("submit", async function (evento) {
        evento.preventDefault();
        if (mensagem) mensagem.textContent = "";

        const senha = document.getElementById("senha").value;
        const confirmaSenha = document.getElementById("confirma-senha").value;

        // Validação se as senhas coincidem
        if (senha !== confirmaSenha) {
            if (mensagem) mensagem.textContent = "As senhas não coincidem.";
            return;
        }

        const cliente = {
            nome: document.getElementById("nome").value,
            cpf: document.getElementById("cpf").value,
            email: document.getElementById("email").value,
            senha: senha
        };

        try {
            let resposta;

            if (idCliente) {
                resposta = await fetch(`/clientes/${idCliente}`, {
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
                if (mensagem) mensagem.textContent = idCliente ? "Conta alterada com sucesso!" : "Conta cadastrada com sucesso!";
                if (!idCliente) formulario.reset();
            } else {
                if (mensagem) mensagem.textContent = "Erro: " + (resultado.detail || "Erro ao salvar cliente.");
            }
        } catch (erro) {
            if (mensagem) mensagem.textContent = "Erro de conexão com o servidor.";
        }
    });
}

// ======================================================
// CARREGAR E EXIBIR CLIENTES (Caso usado no painel)
// ======================================================
async function carregarClientes() {
    const tabela = document.getElementById("listaClientes");
    if (!tabela) return;

    try {
        const resposta = await fetch("/clientes");
        if (!resposta.ok) throw new Error("Erro ao buscar clientes.");

        clientes = await resposta.json();
        exibirClientes(clientes);
    } catch (erro) {
        console.error(erro);
        tabela.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Erro ao carregar dados.</td></tr>`;
    }
}

function exibirClientes(lista) {
    const tabela = document.getElementById("listaClientes");
    if (!tabela) return;

    tabela.innerHTML = "";

    if (!lista || lista.length === 0) {
        tabela.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Nenhum cliente encontrado.</td></tr>`;
        return;
    }

    lista.forEach(cli => {
        const linha = document.createElement("tr");
        linha.innerHTML = `
            <td>${cli.id}</td>
            <td class="fw-bold">${cli.nome}</td>
            <td>${cli.cpf}</td>
            <td>${cli.email}</td>
            <td class="text-end">
                <button type="button" class="btn btn-warning btn-sm me-1" onclick="alterarCliente(${cli.id})">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button type="button" class="btn btn-danger btn-sm" onclick="excluirCliente(${cli.id}, '${cli.nome}')">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;
        tabela.appendChild(linha);
    });
}

function alterarCliente(id) {
    window.location.href = `/cadastro-cliente?id=${id}`;
}

async function excluirCliente(id, nome) {
    if (!confirm(`Deseja excluir o cliente ${nome}?`)) return;

    try {
        const resposta = await fetch(`/clientes/${id}`, { method: "DELETE" });
        if (resposta.ok) {
            alert("Cliente excluído!");
            carregarClientes();
        } else {
            alert("Erro ao excluir cliente.");
        }
    } catch (erro) {
        alert("Falha de comunicação.");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    carregarClientes();
});