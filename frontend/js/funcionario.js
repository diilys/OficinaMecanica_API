const API_URL = "/funcionarios";

let funcionarios = [];

// ===============================
// CARREGAR FUNCIONÁRIOS
// ===============================
async function carregarFuncionarios() {
    try {
        const resposta = await fetch(API_URL);

        if (!resposta.ok) {
            throw new Error("Erro ao carregar funcionários.");
        }

        funcionarios = await resposta.json();

        exibirFuncionarios(funcionarios);

    } catch (erro) {
        console.error(erro);
    }
}

// ===============================
// EXIBIR FUNCIONÁRIOS
// ===============================
function exibirFuncionarios(lista) {
    const tabela = document.getElementById("listaFuncionarios");

    if (!tabela) return;

    tabela.innerHTML = "";

    lista.forEach(funcionario => {
        const linha = document.createElement("tr");

        linha.innerHTML = `
            <td>${funcionario.id}</td>
            <td>${funcionario.nome || ""}</td>
            <td>${funcionario.cpf || ""}</td>
            <td>${funcionario.telefone || ""}</td>
            <td>${funcionario.cargo || ""}</td>
            <td>${funcionario.estado_civil || ""}</td>
            <td>${funcionario.endereco || ""}</td>
            <td>${funcionario.email || ""}</td>
            
            <td>
                <button onclick="alterarFuncionario(${funcionario.id})">
                    Alterar
                </button>

                <button onclick="excluirFuncionario(${funcionario.id})">
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
function filtrarFuncionarios() {
    const campo = document.getElementById("campoFiltro");
    const texto = document.getElementById("textoFiltro");

    if (!campo || !texto) return;

    const valorCampo = campo.value;
    const valorTexto = texto.value.toLowerCase().trim();

    if (!valorTexto) {
        exibirFuncionarios(funcionarios);
        return;
    }

    const filtrados = funcionarios.filter(funcionario => {
        let valor = "";

        switch (valorCampo) {
            case "id":
                valor = funcionario.id;
                break;

            case "nome":
                valor = funcionario.nome;
                break;

            case "cpf":
                valor = funcionario.cpf;
                break;

            case "telefone":
                valor = funcionario.telefone;
                break;

            case "cargo":
                valor = funcionario.cargo;
                break;

            case "estado_civil":
                valor = funcionario.estado_civil;
                break;

            case "endereco":
                valor = funcionario.endereco;
                break;

            case "email":
                valor = funcionario.email;
                break;

            default:
                valor = "";
        }

        return String(valor || "")
            .toLowerCase()
            .includes(valorTexto);
    });

    exibirFuncionarios(filtrados);
}

// ===============================
// LIMPAR FILTRO
// ===============================
function limparFiltroFuncionarios() {
    const texto = document.getElementById("textoFiltro");

    if (texto) {
        texto.value = "";
    }

    exibirFuncionarios(funcionarios);
}

// ===============================
// ALTERAR FUNCIONÁRIO
// ===============================
function alterarFuncionario(id) {
    window.location.href = `/cadastro-funcionario?id=${id}`;
}

// ===============================
// CARREGAR FUNCIONÁRIO PARA EDIÇÃO
// ===============================
async function carregarFuncionarioParaEdicao() {
    const parametros = new URLSearchParams(window.location.search);
    const id = parametros.get("id");

    if (!id) return;

    try {
        const resposta = await fetch(API_URL);

        if (!resposta.ok) {
            throw new Error("Erro ao buscar funcionários.");
        }

        const lista = await resposta.json();

        const funcionario = lista.find(
            item => Number(item.id) === Number(id)
        );

        if (!funcionario) {
            alert("Funcionário não encontrado.");
            return;
        }

        const nome = document.getElementById("nome");
        const cpf = document.getElementById("cpf");
        const telefone = document.getElementById("telefone");
        const cargo = document.getElementById("cargo");
        const estadoCivil = document.getElementById("estado_civil");
        const endereco = document.getElementById("endereco");
        const email = document.getElementById("email");
        const funcionarioId = document.getElementById("funcionario_id");

        if (nome) nome.value = funcionario.nome || "";
        if (cpf) cpf.value = funcionario.cpf || "";
        if (telefone) telefone.value = funcionario.telefone || "";
        if (cargo) cargo.value = funcionario.cargo || "";
        if (estadoCivil) estadoCivil.value = funcionario.estado_civil || "";
        if (endereco) endereco.value = funcionario.endereco || "";
        if (email) email.value = funcionario.email || "";

        if (funcionarioId) {
            funcionarioId.value = funcionario.id;
        }

        const titulo = document.getElementById("tituloFormulario");

        if (titulo) {
            titulo.textContent = "Alterar Funcionário";
        }

        const botao = document.getElementById("btnSalvarFuncionario");

        if (botao) {
            botao.textContent = "Salvar Alterações";
        }

    } catch (erro) {
        console.error(erro);
        alert("Erro ao carregar funcionário.");
    }
}

// ===============================
// SALVAR FUNCIONÁRIO
// ===============================
async function salvarFuncionario(event) {
    event.preventDefault();

    const parametros = new URLSearchParams(window.location.search);
    const idURL = parametros.get("id");

    const campoId = document.getElementById("funcionario_id");

    const id = idURL || (campoId ? campoId.value : null);

    const dados = {
        nome: document.getElementById("nome").value,
        cpf: document.getElementById("cpf").value,
        telefone: document.getElementById("telefone").value,
        cargo: document.getElementById("cargo").value,
        estado_civil: document.getElementById("estado_civil").value,
        endereco: document.getElementById("endereco").value,
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
                ? "Funcionário alterado com sucesso!"
                : "Funcionário cadastrado com sucesso!";
        }

        setTimeout(() => {
            window.location.href = "/funcionarios.html";
        }, 500);

    } catch (erro) {
        console.error(erro);

        const mensagem = document.getElementById("mensagem");

        if (mensagem) {
            mensagem.textContent = "Erro ao salvar funcionário.";
        }
    }
}

// ===============================
// EXCLUIR FUNCIONÁRIO
// ===============================
async function excluirFuncionario(id) {
    if (!confirm("Deseja realmente excluir este funcionário?")) {
        return;
    }

    try {
        const resposta = await fetch(`${API_URL}/${id}`, {
            method: "DELETE"
        });

        if (!resposta.ok) {
            throw new Error("Erro ao excluir funcionário.");
        }

        carregarFuncionarios();

    } catch (erro) {
        console.error(erro);
        alert("Erro ao excluir funcionário.");
    }
}

// ===============================
// INICIALIZAÇÃO
// ===============================
document.addEventListener("DOMContentLoaded", () => {

    if (document.getElementById("listaFuncionarios")) {
        carregarFuncionarios();

        const textoFiltro = document.getElementById("textoFiltro");
        const campoFiltro = document.getElementById("campoFiltro");
        const btnLimpar = document.getElementById("btnLimparFiltro");

        if (textoFiltro) {
            textoFiltro.addEventListener("input", filtrarFuncionarios);
        }

        if (campoFiltro) {
            campoFiltro.addEventListener("change", filtrarFuncionarios);
        }

        if (btnLimpar) {
            btnLimpar.addEventListener("click", limparFiltroFuncionarios);
        }
    }

    if (document.getElementById("form-funcionario")) {
        carregarFuncionarioParaEdicao();

        document
            .getElementById("form-funcionario")
            .addEventListener("submit", salvarFuncionario);
    }
});