const API_CLIENTES = "/clientes";
let clientes = [];

async function lerResposta(resposta) {
    const tipo = resposta.headers.get("content-type") || "";
    return tipo.includes("application/json") ? resposta.json() : resposta.text();
}

async function carregarClientes() {
    const tabela = document.getElementById("listaClientes");
    if (!tabela) return;

    try {
        const resposta = await fetch(API_CLIENTES);
        if (!resposta.ok) throw new Error("Erro ao carregar clientes.");
        clientes = await resposta.json();
        filtrarClientes();
    } catch (erro) {
        console.error(erro);
        tabela.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Erro ao carregar clientes.</td></tr>`;
    }
}

function exibirClientes(lista) {
    const tabela = document.getElementById("listaClientes");
    if (!tabela) return;

    tabela.innerHTML = "";
    if (!lista.length) {
        tabela.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Nenhum cliente encontrado.</td></tr>`;
        return;
    }

    lista.forEach(cliente => {
        const linha = document.createElement("tr");
        const ativo = Boolean(cliente.ativo);

        linha.innerHTML = `
            <td>${cliente.id}</td>
            <td>${cliente.nome || ""}</td>
            <td>${cliente.cpf || ""}</td>
            <td>
                ${cliente.email || ""}
                ${!ativo ? '<span class="badge bg-secondary ms-2">Inativo</span>' : ""}
            </td>
            <td class="text-end">
                <button type="button" class="btn btn-warning btn-sm me-1" onclick="alterarCliente(${cliente.id})">
                    <i class="fa-solid fa-pen"></i>
                </button>
                ${ativo
                    ? `<button type="button" class="btn btn-danger btn-sm" onclick="inativarCliente(${cliente.id})"><i class="fa-solid fa-user-slash"></i></button>`
                    : `<button type="button" class="btn btn-success btn-sm" onclick="reativarCliente(${cliente.id})"><i class="fa-solid fa-user-check"></i></button>`}
            </td>
        `;
        tabela.appendChild(linha);
    });
}

function filtrarClientes() {
    const campo = document.getElementById("campoFiltro");
    const texto = document.getElementById("textoFiltro");
    if (!campo || !texto) return exibirClientes(clientes);

    const termo = texto.value.toLowerCase().trim();
    if (!termo) return exibirClientes(clientes);

    exibirClientes(clientes.filter(cliente =>
        String(cliente[campo.value] ?? "").toLowerCase().includes(termo)
    ));
}

function limparFiltroClientes() {
    const texto = document.getElementById("textoFiltro");
    if (texto) texto.value = "";
    exibirClientes(clientes);
}

function alterarCliente(id) {
    window.location.href = `/cadastro-cliente?id=${id}`;
}

async function carregarClienteParaEdicao() {
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) return;

    try {
        const resposta = await fetch(API_CLIENTES);
        if (!resposta.ok) throw new Error("Erro ao buscar cliente.");

        const lista = await resposta.json();
        const cliente = lista.find(item => Number(item.id) === Number(id));
        if (!cliente) throw new Error("Cliente não encontrado.");

        document.getElementById("nome").value = cliente.nome || "";
        document.getElementById("cpf").value = cliente.cpf || "";
        document.getElementById("email").value = cliente.email || "";

        const titulo = document.getElementById("tituloFormulario");
        if (titulo) titulo.textContent = "Alterar Cliente";

        const botao = document.getElementById("btnSalvar");
        if (botao) botao.textContent = "Salvar Alterações";

        // Senha só é necessária no cadastro.
        ["senha", "confirma-senha"].forEach(campoId => {
            const campo = document.getElementById(campoId);
            if (!campo) return;
            campo.required = false;
            const grupo = campo.closest(".mb-3, .mb-4");
            if (grupo) grupo.style.display = "none";
        });
    } catch (erro) {
        console.error(erro);
        const mensagem = document.getElementById("mensagem");
        if (mensagem) mensagem.textContent = erro.message;
    }
}

async function salvarCliente(evento) {
    evento.preventDefault();

    const id = new URLSearchParams(window.location.search).get("id");
    const mensagem = document.getElementById("mensagem");
    if (mensagem) mensagem.textContent = "";

    const dados = {
        nome: document.getElementById("nome").value.trim(),
        cpf: document.getElementById("cpf").value.trim(),
        email: document.getElementById("email").value.trim()
    };

    if (!id) {
        const senha = document.getElementById("senha").value;
        const confirmaSenha = document.getElementById("confirma-senha").value;

        if (senha !== confirmaSenha) {
            if (mensagem) mensagem.textContent = "As senhas não coincidem.";
            return;
        }
        dados.senha = senha;
    }

    try {
        const resposta = await fetch(id ? `${API_CLIENTES}/${id}` : API_CLIENTES, {
            method: id ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(dados)
        });

        const resultado = await lerResposta(resposta);
        if (!resposta.ok) {
            throw new Error(resultado.detail || "Erro ao salvar cliente.");
        }

        if (mensagem) mensagem.textContent = id ? "Cliente alterado com sucesso!" : "Cliente cadastrado com sucesso!";
        setTimeout(() => Navigation.voltar("/painel-clientes"), 500);
    } catch (erro) {
        console.error(erro);
        if (mensagem) mensagem.textContent = erro.message || "Erro ao salvar cliente.";
    }
}

async function inativarCliente(id) {
    if (!confirm("Deseja realmente inativar este cliente? O histórico será preservado.")) return;

    try {
        const resposta = await fetch(`${API_CLIENTES}/${id}`, { method: "DELETE" });
        const resultado = await lerResposta(resposta);
        if (!resposta.ok) throw new Error(resultado.detail || "Erro ao inativar cliente.");
        await carregarClientes();
    } catch (erro) {
        alert(erro.message);
    }
}

async function reativarCliente(id) {
    try {
        const resposta = await fetch(`${API_CLIENTES}/${id}/reativar`, { method: "PATCH" });
        const resultado = await lerResposta(resposta);
        if (!resposta.ok) throw new Error(resultado.detail || "Erro ao reativar cliente.");
        await carregarClientes();
    } catch (erro) {
        alert(erro.message);
    }
}

// Mantém compatibilidade com chamadas antigas no HTML.
const excluirCliente = inativarCliente;

document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("listaClientes")) {
        carregarClientes();
        document.getElementById("textoFiltro")?.addEventListener("input", filtrarClientes);
        document.getElementById("campoFiltro")?.addEventListener("change", filtrarClientes);
        document.getElementById("btnLimparFiltro")?.addEventListener("click", limparFiltroClientes);
    }

    const formulario = document.getElementById("form-cliente");
    if (formulario) {
        carregarClienteParaEdicao();
        formulario.addEventListener("submit", salvarCliente);
    }
});
