const API_URL = "/clientes";

let clientes = [];

// ===============================
// CARREGAR CLIENTES
// ===============================
async function carregarClientes() {
    try {
        const resposta = await fetch(API_URL);

        if (!resposta.ok) {
            throw new Error("Erro ao carregar clientes.");
        }

        clientes = await resposta.json();

        exibirClientes(clientes);

    } catch (erro) {
        console.error(erro);
    }
}

// ===============================
// EXIBIR CLIENTES
// ===============================
function exibirClientes(lista) {
    const tabela = document.getElementById("listaClientes");

    if (!tabela) return;

    tabela.innerHTML = "";

    lista.forEach(cliente => {
        const linha = document.createElement("tr");

        linha.innerHTML = `
            <td>${cliente.id}</td>
            <td>${cliente.nome || ""}</td>
            <td>${cliente.cpf || ""}</td>
            <td>${cliente.email || ""}</td>

            <td>
                <button onclick="alterarCliente(${cliente.id})">
                    Alterar
                </button>

                <button onclick="excluirCliente(${cliente.id})">
                    Excluir
                </button>
            </td>
        `;

        tabela.appendChild(linha);
    });
}

// ===============================
// FILTRO
// ===============================
function filtrarClientes() {
    const campo = document.getElementById("campoFiltro");
    const texto = document.getElementById("textoFiltro");

    if (!campo || !texto) return;

    const valorCampo = campo.value;
    const valorTexto = texto.value.toLowerCase().trim();

    if (!valorTexto) {
        exibirClientes(clientes);
        return;
    }

    const filtrados = clientes.filter(cliente => {
        let valor = "";

        switch (valorCampo) {
            case "id":
                valor = cliente.id;
                break;

            case "nome":
                valor = cliente.nome;
                break;

            case "cpf":
                valor = cliente.cpf;
                break;

            case "email":
                valor = cliente.email;
                break;

            default:
                valor = "";
        }

        return String(valor || "")
            .toLowerCase()
            .includes(valorTexto);
    });

    exibirClientes(filtrados);
}

// ===============================
// LIMPAR FILTRO
// ===============================
function limparFiltroClientes() {
    const texto = document.getElementById("textoFiltro");

    if (texto) {
        texto.value = "";
    }

    exibirClientes(clientes);
}

// ===============================
// ALTERAR CLIENTE
// ===============================
function alterarCliente(id) {
    window.location.href = `/cadastro-cliente?id=${id}`;
}

// ===============================
// CARREGAR CLIENTE PARA EDIÇÃO
// ===============================
async function carregarClienteParaEdicao() {
    const parametros = new URLSearchParams(window.location.search);
    const id = parametros.get("id");

    if (!id) return;

    try {
        const resposta = await fetch(API_URL);

        if (!resposta.ok) {
            throw new Error("Erro ao buscar clientes.");
        }

        const lista = await resposta.json();

        const cliente = lista.find(
            item => Number(item.id) === Number(id)
        );

        if (!cliente) {
            alert("Cliente não encontrado.");
            return;
        }

        const nome = document.getElementById("nome");
        const cpf = document.getElementById("cpf");
        const email = document.getElementById("email");
        const clienteId = document.getElementById("cliente_id");

        if (nome) nome.value = cliente.nome || "";
        if (cpf) cpf.value = cliente.cpf || "";
        if (email) email.value = cliente.email || "";

        if (clienteId) {
            clienteId.value = cliente.id;
        }

        const titulo = document.getElementById("tituloFormulario");

        if (titulo) {
            titulo.textContent = "Alterar Cliente";
        }

        const botao = document.getElementById("btnSalvarCliente");

        if (botao) {
            botao.textContent = "Salvar Alterações";
        }

    } catch (erro) {
        console.error(erro);
        alert("Erro ao carregar cliente.");
    }
}

// ===============================
// SALVAR CLIENTE
// ===============================
async function salvarCliente(event) {
    event.preventDefault();

    const parametros = new URLSearchParams(window.location.search);
    const idURL = parametros.get("id");

    const campoId = document.getElementById("cliente_id");

    const id = idURL || (campoId ? campoId.value : null);

    const dados = {
        nome: document.getElementById("nome").value,
        cpf: document.getElementById("cpf").value,
        email: document.getElementById("email").value
    };

    try {
        let resposta;

        if (id) {
            // ALTERAÇÃO
            resposta = await fetch(`${API_URL}/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(dados)
            });

        } else {
            // CADASTRO
            resposta = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(dados)
            });
        }

        if (!resposta.ok) {
            const erro = await resposta.text();
            throw new Error(erro);
        }

        const mensagem = document.getElementById("mensagem");

        if (mensagem) {
            mensagem.textContent = id
                ? "Cliente alterado com sucesso!"
                : "Cliente cadastrado com sucesso!";
        }

        setTimeout(() => {
            window.location.href = "/clientes.html";
        }, 500);

    } catch (erro) {
        console.error(erro);

        const mensagem = document.getElementById("mensagem");

        if (mensagem) {
            mensagem.textContent = "Erro ao salvar cliente.";
        }
    }
}

// ===============================
// EXCLUIR CLIENTE
// ===============================
async function excluirCliente(id) {
    if (!confirm("Deseja realmente excluir este cliente?")) {
        return;
    }

    try {
        const resposta = await fetch(`${API_URL}/${id}`, {
            method: "DELETE"
        });

        if (!resposta.ok) {
            throw new Error("Erro ao excluir cliente.");
        }

        carregarClientes();

    } catch (erro) {
        console.error(erro);
        alert("Erro ao excluir cliente.");
    }
}

// ===============================
// INICIALIZAÇÃO
// ===============================
document.addEventListener("DOMContentLoaded", () => {

    if (document.getElementById("listaClientes")) {
        carregarClientes();

        const textoFiltro = document.getElementById("textoFiltro");
        const campoFiltro = document.getElementById("campoFiltro");
        const btnLimpar = document.getElementById("btnLimparFiltro");

        if (textoFiltro) {
            textoFiltro.addEventListener("input", filtrarClientes);
        }

        if (campoFiltro) {
            campoFiltro.addEventListener("change", filtrarClientes);
        }

        if (btnLimpar) {
            btnLimpar.addEventListener("click", limparFiltroClientes);
        }
    }

    if (document.getElementById("form-cliente")) {
        carregarClienteParaEdicao();

        document
            .getElementById("form-cliente")
            .addEventListener("submit", salvarCliente);
    }
});