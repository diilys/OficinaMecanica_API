const API_FUNCIONARIOS = "/funcionarios";
let funcionarios = [];

async function lerRespostaFuncionario(resposta) {
    const tipo = resposta.headers.get("content-type") || "";
    return tipo.includes("application/json") ? resposta.json() : resposta.text();
}

async function carregarFuncionarios() {
    const tabela = document.getElementById("listaFuncionarios");
    if (!tabela) return;

    try {
        const resposta = await fetch(API_FUNCIONARIOS);
        if (!resposta.ok) throw new Error("Erro ao carregar funcionários.");
        funcionarios = await resposta.json();
        filtrarFuncionarios();
    } catch (erro) {
        console.error(erro);
        tabela.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Erro ao carregar funcionários.</td></tr>`;
    }
}

function exibirFuncionarios(lista) {
    const tabela = document.getElementById("listaFuncionarios");
    if (!tabela) return;

    tabela.innerHTML = "";
    if (!lista.length) {
        tabela.innerHTML = `<tr><td colspan="6" class="text-center text-muted">Nenhum funcionário encontrado.</td></tr>`;
        return;
    }

    lista.forEach(funcionario => {
        const linha = document.createElement("tr");
        const ativo = Boolean(funcionario.ativo);

        linha.innerHTML = `
            <td>${funcionario.id}</td>
            <td>${funcionario.nome || ""}</td>
            <td>${funcionario.cargo || ""}</td>
            <td>${funcionario.cpf || ""}</td>
            <td>
                ${funcionario.email || ""}
                ${!ativo ? '<span class="badge bg-secondary ms-2">Inativo</span>' : ""}
            </td>
            <td class="text-end">
                <button type="button" class="btn btn-warning btn-sm me-1" onclick="alterarFuncionario(${funcionario.id})">
                    <i class="fa-solid fa-pen"></i>
                </button>
                ${ativo
                    ? `<button type="button" class="btn btn-danger btn-sm" onclick="inativarFuncionario(${funcionario.id})"><i class="fa-solid fa-user-slash"></i></button>`
                    : `<button type="button" class="btn btn-success btn-sm" onclick="reativarFuncionario(${funcionario.id})"><i class="fa-solid fa-user-check"></i></button>`}
            </td>
        `;
        tabela.appendChild(linha);
    });
}

function filtrarFuncionarios() {
    const campo = document.getElementById("campoFiltro");
    const texto = document.getElementById("textoFiltro");
    if (!campo || !texto) return exibirFuncionarios(funcionarios);

    const termo = texto.value.toLowerCase().trim();
    if (!termo) return exibirFuncionarios(funcionarios);

    exibirFuncionarios(funcionarios.filter(funcionario =>
        String(funcionario[campo.value] ?? "").toLowerCase().includes(termo)
    ));
}

function limparFiltroFuncionarios() {
    const texto = document.getElementById("textoFiltro");
    if (texto) texto.value = "";
    exibirFuncionarios(funcionarios);
}

function alterarFuncionario(id) {
    window.location.href = `/cadastro-funcionario?id=${id}`;
}

async function carregarFuncionarioParaEdicao() {
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) return;

    try {
        const resposta = await fetch(API_FUNCIONARIOS);
        if (!resposta.ok) throw new Error("Erro ao buscar funcionário.");
        const lista = await resposta.json();
        const funcionario = lista.find(item => Number(item.id) === Number(id));
        if (!funcionario) throw new Error("Funcionário não encontrado.");

        ["nome", "cpf", "telefone", "cargo", "estado_civil", "endereco", "email"].forEach(campo => {
            const elemento = document.getElementById(campo);
            if (elemento) elemento.value = funcionario[campo] || "";
        });

        const senha = document.getElementById("senha");
        if (senha) {
            senha.required = false;
            const grupo = senha.closest(".mb-3, .mb-4");
            if (grupo) grupo.style.display = "none";
        }

        const titulo = document.getElementById("tituloFormulario");
        if (titulo) titulo.textContent = "Alterar Funcionário";

        const botao = document.getElementById("btnSalvar");
        if (botao) botao.textContent = "Salvar Alterações";
    } catch (erro) {
        console.error(erro);
        const mensagem = document.getElementById("mensagem");
        if (mensagem) mensagem.textContent = erro.message;
    }
}

async function salvarFuncionario(evento) {
    evento.preventDefault();

    const id = new URLSearchParams(window.location.search).get("id");
    const mensagem = document.getElementById("mensagem");
    if (mensagem) mensagem.textContent = "";

    const dados = {
        nome: document.getElementById("nome").value.trim(),
        cpf: document.getElementById("cpf").value.trim(),
        telefone: document.getElementById("telefone").value.trim() || null,
        estado_civil: document.getElementById("estado_civil").value.trim() || null,
        endereco: document.getElementById("endereco").value.trim() || null,
        cargo: document.getElementById("cargo").value.trim() || null,
        email: document.getElementById("email").value.trim()
    };

    if (!id) dados.senha = document.getElementById("senha").value;

    try {
        const resposta = await fetch(id ? `${API_FUNCIONARIOS}/${id}` : API_FUNCIONARIOS, {
            method: id ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(dados)
        });

        const resultado = await lerRespostaFuncionario(resposta);
        if (!resposta.ok) throw new Error(resultado.detail || "Erro ao salvar funcionário.");

        if (mensagem) mensagem.textContent = id ? "Funcionário alterado com sucesso!" : "Funcionário cadastrado com sucesso!";
        setTimeout(() => Navigation.voltar("/painel-funcionarios"), 500);
    } catch (erro) {
        console.error(erro);
        if (mensagem) mensagem.textContent = erro.message || "Erro ao salvar funcionário.";
    }
}

async function inativarFuncionario(id) {
    if (!confirm("Deseja realmente inativar este funcionário? O histórico será preservado.")) return;

    try {
        const resposta = await fetch(`${API_FUNCIONARIOS}/${id}`, { method: "DELETE" });
        const resultado = await lerRespostaFuncionario(resposta);
        if (!resposta.ok) throw new Error(resultado.detail || "Erro ao inativar funcionário.");
        await carregarFuncionarios();
    } catch (erro) {
        alert(erro.message);
    }
}

async function reativarFuncionario(id) {
    try {
        const resposta = await fetch(`${API_FUNCIONARIOS}/${id}/reativar`, { method: "PATCH" });
        const resultado = await lerRespostaFuncionario(resposta);
        if (!resposta.ok) throw new Error(resultado.detail || "Erro ao reativar funcionário.");
        await carregarFuncionarios();
    } catch (erro) {
        alert(erro.message);
    }
}

const excluirFuncionario = inativarFuncionario;

document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("listaFuncionarios")) {
        carregarFuncionarios();
        document.getElementById("textoFiltro")?.addEventListener("input", filtrarFuncionarios);
        document.getElementById("campoFiltro")?.addEventListener("change", filtrarFuncionarios);
        document.getElementById("btnLimparFiltro")?.addEventListener("click", limparFiltroFuncionarios);
    }

    const formulario = document.getElementById("form-funcionario");
    if (formulario) {
        carregarFuncionarioParaEdicao();
        formulario.addEventListener("submit", salvarFuncionario);
    }
});
