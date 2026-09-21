const formulario = document.getElementById("form-funcionario");
const mensagem = document.getElementById("mensagem");

const parametros = new URLSearchParams(window.location.search);
const idFuncionario = parametros.get("id");

let funcionarios = [];

// ======================================================
// CADASTRAR OU ALTERAR FUNCIONÁRIO
// ======================================================
if (formulario) {
    formulario.addEventListener("submit", async function (evento) {
        evento.preventDefault();
        if (mensagem) mensagem.textContent = "";

        const funcionario = {
            nome: document.getElementById("nome").value,
            cpf: document.getElementById("cpf").value,
            telefone: document.getElementById("telefone").value,
            cargo: document.getElementById("cargo").value,
            estado_civil: document.getElementById("estado_civil").value,
            endereco: document.getElementById("endereco").value,
            email: document.getElementById("email").value,
            senha: document.getElementById("senha").value
        };

        try {
            let resposta;

            if (idFuncionario) {
                resposta = await fetch(`/funcionarios/${idFuncionario}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(funcionario)
                });
            } else {
                resposta = await fetch("/funcionarios", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(funcionario)
                });
            }

            const resultado = await resposta.json();

            if (resposta.ok) {
                if (mensagem) {
                    mensagem.textContent = idFuncionario ? "Funcionário alterado com sucesso!" : "Funcionário cadastrado com sucesso!";
                }
                if (!idFuncionario) formulario.reset();
            } else {
                if (mensagem) mensagem.textContent = "Erro: " + obterMensagemErro(resultado);
            }
        } catch (erro) {
            if (mensagem) mensagem.textContent = "Não foi possível conectar ao servidor.";
            console.error("Erro de conexão:", erro);
        }
    });
}

function obterMensagemErro(resultado) {
    if (!resultado.detail) return "Dados inválidos.";
    if (Array.isArray(resultado.detail)) {
        return resultado.detail.map(erro => erro.msg).join(" ");
    }
    return resultado.detail;
}

// ======================================================
// CARREGAR E EXIBIR FUNCIONÁRIOS
// ======================================================
async function carregarFuncionarios() {
    const tabela = document.getElementById("listaFuncionarios");
    if (!tabela) return;

    try {
        const resposta = await fetch("/funcionarios");
        if (!resposta.ok) throw new Error("Erro ao buscar funcionários.");

        funcionarios = await resposta.json();
        exibirFuncionarios(funcionarios);
    } catch (erro) {
        console.error("Erro ao carregar funcionários:", erro);
        tabela.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Erro ao carregar os funcionários.</td></tr>`;
    }
}

function exibirFuncionarios(lista) {
    const tabela = document.getElementById("listaFuncionarios");
    if (!tabela) return;

    tabela.innerHTML = "";

    if (!lista || lista.length === 0) {
        tabela.innerHTML = `<tr><td colspan="6" class="text-center text-muted">Nenhum funcionário encontrado.</td></tr>`;
        return;
    }

    lista.forEach(func => {
        const linha = document.createElement("tr");
        linha.innerHTML = `
            <td>${func.id}</td>
            <td class="fw-bold">${func.nome}</td>
            <td>${func.cargo || 'N/A'}</td>
            <td>${func.cpf}</td>
            <td>${func.email}</td>
            <td class="text-end">
                <button type="button" class="btn btn-warning btn-sm me-1" onclick="alterarFuncionario(${func.id})">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button type="button" class="btn btn-danger btn-sm" onclick="excluirFuncionario(${func.id}, '${func.nome}')">
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
function filtrarFuncionarios() {
    const campoElemento = document.getElementById("campoFiltro");
    const textoElemento = document.getElementById("textoFiltro");

    if (!campoElemento || !textoElemento) return;

    const campo = campoElemento.value;
    const texto = textoElemento.value.toLowerCase().trim();

    const filtrados = funcionarios.filter(func => {
        const valor = func[campo];
        if (valor === null || valor === undefined) return false;
        return String(valor).toLowerCase().includes(texto);
    });

    exibirFuncionarios(filtrados);
}

function inicializarFiltros() {
    const textoFiltro = document.getElementById("textoFiltro");
    const campoFiltro = document.getElementById("campoFiltro");
    const btnLimpar = document.getElementById("btnLimparFiltro");

    if (textoFiltro) {
        textoFiltro.addEventListener("input", filtrarFuncionarios);
        textoFiltro.addEventListener("keyup", filtrarFuncionarios);
    }

    if (campoFiltro) {
        campoFiltro.addEventListener("change", filtrarFuncionarios);
    }

    if (btnLimpar) {
        btnLimpar.addEventListener("click", function () {
            if (textoFiltro) textoFiltro.value = "";
            exibirFuncionarios(funcionarios);
        });
    }
}

// ======================================================
// FUNÇÕES AUXILIARES E EXCLUSÃO
// ======================================================
function alterarFuncionario(id) {
    window.location.href = `/cadastro-funcionario?id=${id}`;
}

async function excluirFuncionario(id, nome) {
    if (!confirm(`Deseja realmente excluir o funcionário ${nome}?`)) return;

    try {
        const resposta = await fetch(`/funcionarios/${id}`, { method: "DELETE" });
        if (resposta.ok) {
            alert("Funcionário excluído com sucesso!");
            carregarFuncionarios();
        } else {
            const resultado = await resposta.json();
            alert("Erro: " + obterMensagemErro(resultado));
        }
    } catch (erro) {
        alert("Não foi possível conectar ao servidor.");
    }
}

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
    carregarFuncionarios();
    inicializarFiltros();
});