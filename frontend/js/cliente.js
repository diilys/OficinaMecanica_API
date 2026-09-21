const formulario = document.getElementById("form-cliente");
const mensagem = document.getElementById("mensagem");

const parametros = new URLSearchParams(window.location.search);
const idCliente = parametros.get("id");

let clientes = [];

// ======================================================
// CADASTRAR OU ALTERAR CLIENTE
// ======================================================
if (formulario) {
    formulario.addEventListener("submit", async function (evento) {
        evento.preventDefault();
        if (mensagem) mensagem.textContent = "";

        const cliente = {
            nome: document.getElementById("nome").value,
            cpf: document.getElementById("cpf").value,
            email: document.getElementById("email").value,
            telefone: document.getElementById("telefone").value
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

            if (resposta.ok) {
                if (mensagem) mensagem.textContent = idCliente ? "Cliente alterado com sucesso!" : "Cliente cadastrado com sucesso!";
                if (!idCliente) formulario.reset();
            } else {
                if (mensagem) mensagem.textContent = "Erro ao salvar cliente.";
            }
        } catch (erro) {
            if (mensagem) mensagem.textContent = "Erro de conexão com o servidor.";
        }
    });
}

// ======================================================
// CARREGAR E EXIBIR CLIENTES
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

// ======================================================
// LÓGICA DE FILTRAGEM EN TEMPO REAL
// ======================================================
function filtrarClientes() {
    const campoElemento = document.getElementById("campoFiltro");
    const textoElemento = document.getElementById("textoFiltro");

    if (!campoElemento || !textoElemento) return;

    const campo = campoElemento.value;
    const texto = textoElemento.value.toLowerCase().trim();

    const filtrados = clientes.filter(cli => {
        const valor = cli[campo];
        if (valor === null || valor === undefined) return false;
        return String(valor).toLowerCase().includes(texto);
    });

    exibirClientes(filtrados);
}

function inicializarFiltros() {
    const textoFiltro = document.getElementById("textoFiltro");
    const campoFiltro = document.getElementById("campoFiltro");
    const btnLimpar = document.getElementById("btnLimparFiltro");

    if (textoFiltro) {
        textoFiltro.addEventListener("input", filtrarClientes);
        textoFiltro.addEventListener("keyup", filtrarClientes);
    }

    if (campoFiltro) {
        campoFiltro.addEventListener("change", filtrarClientes);
    }

    if (btnLimpar) {
        btnLimpar.addEventListener("click", function () {
            if (textoFiltro) textoFiltro.value = "";
            exibirClientes(clientes);
        });
    }
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
    inicializarFiltros();
});