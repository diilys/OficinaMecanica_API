const formulario = document.getElementById("form-estoque");
const mensagem = document.getElementById("mensagem");

const parametros = new URLSearchParams(window.location.search);
const idItem = parametros.get("id");

let itensEstoque = [];

// ======================================================
// CADASTRAR OU ALTERAR PEÇA NO ESTOQUE
// ======================================================
if (formulario) {
    formulario.addEventListener("submit", async function (evento) {
        evento.preventDefault();
        if (mensagem) mensagem.textContent = "";

        const item = {
            nome: document.getElementById("nome").value,
            quantidade: document.getElementById("quantidade").value,
            preco: document.getElementById("preco").value
        };

        try {
            let resposta;

            if (idItem) {
                resposta = await fetch(`/estoque/${idItem}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(item)
                });
            } else {
                resposta = await fetch("/estoque", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(item)
                });
            }

            if (resposta.ok) {
                if (mensagem) mensagem.textContent = idItem ? "Item alterado!" : "Item adicionado ao estoque!";
                if (!idItem) formulario.reset();
            } else {
                if (mensagem) mensagem.textContent = "Erro ao registrar peça.";
            }
        } catch (erro) {
            if (mensagem) mensagem.textContent = "Erro de rede.";
        }
    });
}

// ======================================================
// CARREGAR E EXIBIR ESTOQUE
// ======================================================
async function carregarEstoque() {
    const tabela = document.getElementById("listaEstoque");
    if (!tabela) return;

    try {
        const resposta = await fetch("/estoque");
        if (!resposta.ok) throw new Error("Erro ao buscar estoque.");

        itensEstoque = await resposta.json();
        exibirEstoque(itensEstoque);
    } catch (erro) {
        console.error(erro);
        tabela.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Erro ao carregar dados.</td></tr>`;
    }
}

function exibirEstoque(lista) {
    const tabela = document.getElementById("listaEstoque");
    if (!tabela) return;

    tabela.innerHTML = "";

    if (!lista || lista.length === 0) {
        tabela.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Nenhuma peça encontrada.</td></tr>`;
        return;
    }

    lista.forEach(item => {
        const linha = document.createElement("tr");
        linha.innerHTML = `
            <td>${item.id}</td>
            <td class="fw-bold">${item.nome}</td>
            <td>${item.quantidade}</td>
            <td>R$ ${parseFloat(item.preco).toFixed(2)}</td>
            <td class="text-end">
                <button type="button" class="btn btn-warning btn-sm me-1" onclick="alterarItem(${item.id})">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button type="button" class="btn btn-danger btn-sm" onclick="excluirItem(${item.id}, '${item.nome}')">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;
        tabela.appendChild(linha);
    });
}

// ======================================================
// LÓGICA DE FILTRAGEM EM TEMPO REAL
// ======================================================
function filtrarEstoque() {
    const campoElemento = document.getElementById("campoFiltro");
    const textoElemento = document.getElementById("textoFiltro");

    if (!campoElemento || !textoElemento) return;

    const campo = campoElemento.value;
    const texto = textoElemento.value.toLowerCase().trim();

    const filtrados = itensEstoque.filter(item => {
        const valor = item[campo];
        if (valor === null || valor === undefined) return false;
        return String(valor).toLowerCase().includes(texto);
    });

    exibirEstoque(filtrados);
}

function inicializarFiltros() {
    const textoFiltro = document.getElementById("textoFiltro");
    const campoFiltro = document.getElementById("campoFiltro");
    const btnLimpar = document.getElementById("btnLimparFiltro");

    if (textoFiltro) {
        textoFiltro.addEventListener("input", filtrarEstoque);
        textoFiltro.addEventListener("keyup", filtrarEstoque);
    }

    if (campoFiltro) {
        campoFiltro.addEventListener("change", filtrarEstoque);
    }

    if (btnLimpar) {
        btnLimpar.addEventListener("click", function () {
            if (textoFiltro) textoFiltro.value = "";
            exibirEstoque(itensEstoque);
        });
    }
}

function alterarItem(id) {
    window.location.href = `/cadastro-estoque?id=${id}`;
}

async function excluirItem(id, nome) {
    if (!confirm(`Deseja remover ${nome} do estoque?`)) return;

    try {
        const resposta = await fetch(`/estoque/${id}`, { method: "DELETE" });
        if (resposta.ok) {
            alert("Item removido!");
            carregarEstoque();
        } else {
            alert("Erro ao excluir item.");
        }
    } catch (erro) {
        alert("Erro na conexão.");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    carregarEstoque();
    inicializarFiltros();
});