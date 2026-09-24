let ordensServico = [];
let osAtualId = null;
let osAtual = null;

document.addEventListener("DOMContentLoaded", async () => {
    const usuario = await Auth.exigir(["admin", "funcionario"]);
    if (!usuario) return;

    if (document.getElementById("listaOrdensServico")) {
        iniciarListaOS();
        return;
    }

    if (document.getElementById("form-os")) {
        iniciarFormularioOS();
    }
});

async function apiOS(resposta) {
    if (resposta.status === 401) {
        window.location.replace("/login");
        throw new Error("Sua sessão expirou.");
    }

    let dados = null;
    try {
        dados = resposta.status === 204 ? null : await resposta.json();
    } catch (_) {}

    if (!resposta.ok) {
        let mensagem = dados?.detail || dados?.mensagem || "Não foi possível concluir a operação.";
        if (Array.isArray(mensagem)) {
            mensagem = mensagem.map(item => item.msg || String(item)).join(" | ");
        }
        throw new Error(mensagem);
    }

    return dados;
}

function iniciarListaOS() {
    const tabela = document.getElementById("listaOrdensServico");
    const pesquisa = document.getElementById("pesquisaOS");
    const filtro = document.getElementById("filtroStatusOS");

    async function carregar() {
        try {
            ordensServico = await apiOS(await fetch("/ordens-servico", {
                credentials: "same-origin"
            }));
            if (!Array.isArray(ordensServico)) ordensServico = [];
            renderizar();
        } catch (erro) {
            tabela.innerHTML = `<tr><td colspan="7" class="text-center text-danger">${escaparHTML(erro.message)}</td></tr>`;
        }
    }

    function renderizar() {
        const termo = (pesquisa?.value || "").trim().toLowerCase();
        const status = filtro?.value || "";

        const lista = ordensServico.filter(ordem => {
            if (status && ordem.status !== status) return false;
            if (!termo) return true;

            return [
                ordem.id,
                ordem.cliente_nome,
                ordem.veiculo_placa,
                ordem.veiculo_modelo,
                ordem.descricao
            ].filter(Boolean).join(" ").toLowerCase().includes(termo);
        });

        if (!lista.length) {
            tabela.innerHTML = `<tr><td colspan="7" class="text-center text-muted">Nenhuma ordem de serviço encontrada.</td></tr>`;
            return;
        }

        tabela.innerHTML = lista.map(ordem => `
            <tr>
                <td>${escaparHTML(ordem.id)}</td>
                <td>${escaparHTML(ordem.cliente_nome || "-")}</td>
                <td>${escaparHTML(`${ordem.veiculo_modelo || ""}${ordem.veiculo_placa ? " - " + ordem.veiculo_placa : ""}` || "-")}</td>
                <td>${escaparHTML(ordem.descricao || "-")}</td>
                <td>
                    <select class="form-select form-select-sm status-os" data-id="${ordem.id}">
                        ${optionStatusOS("pendente", "Pendente", ordem.status)}
                        ${optionStatusOS("em_andamento", "Em andamento", ordem.status)}
                        ${optionStatusOS("concluida", "Concluída", ordem.status)}
                        ${optionStatusOS("cancelada", "Cancelada", ordem.status)}
                    </select>
                </td>
                <td>${formatarMoeda(ordem.valor_total)}</td>
                <td class="text-end">
                    <button type="button" class="btn btn-warning btn-sm me-1 editar-os" data-id="${ordem.id}" title="Editar">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button type="button" class="btn btn-danger btn-sm excluir-os" data-id="${ordem.id}" title="Excluir">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join("");
    }

    tabela.addEventListener("click", async event => {
        const editar = event.target.closest(".editar-os");
        if (editar) {
            window.location.href = `/cadastro-ordem-servico?id=${editar.dataset.id}`;
            return;
        }

        const excluir = event.target.closest(".excluir-os");
        if (!excluir) return;

        if (!confirm("Deseja realmente excluir esta ordem de serviço?")) return;

        try {
            await apiOS(await fetch(`/ordens-servico/${excluir.dataset.id}`, {
                method: "DELETE",
                credentials: "same-origin"
            }));
            alert("Ordem de serviço excluída com sucesso.");
            await carregar();
        } catch (erro) {
            alert(erro.message);
        }
    });

    tabela.addEventListener("change", async event => {
        const select = event.target.closest(".status-os");
        if (!select) return;

        select.disabled = true;
        try {
            await apiOS(await fetch(`/ordens-servico/${select.dataset.id}`, {
                method: "PUT",
                credentials: "same-origin",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({status: select.value})
            }));

            const ordem = ordensServico.find(item => String(item.id) === String(select.dataset.id));
            if (ordem) ordem.status = select.value;
            alert("Status atualizado com sucesso.");
        } catch (erro) {
            alert(erro.message);
            await carregar();
        } finally {
            select.disabled = false;
        }
    });

    pesquisa?.addEventListener("input", renderizar);
    filtro?.addEventListener("change", renderizar);
    carregar();
}

async function iniciarFormularioOS() {
    const form = document.getElementById("form-os");
    const parametros = new URLSearchParams(window.location.search);
    osAtualId = parametros.get("id");

    await Promise.all([
        carregarVeiculosOS(),
        carregarFuncionariosOS()
    ]);

    await prepararDetalhesOS();

    if (osAtualId) {
        document.getElementById("tituloOS").textContent = "Editar Ordem de Serviço";
        document.getElementById("btnSalvarOS").textContent = "Salvar Alterações";
        await carregarOS(osAtualId);
    } else {
        document.getElementById("tituloOS").textContent = "Nova Ordem de Serviço";
        document.getElementById("btnSalvarOS").textContent = "Cadastrar Ordem de Serviço";
        document.getElementById("status").value = "pendente";
        bloquearAcoesDependentesDaOS(true);
        renderizarDetalhesOS();
    }

    form.addEventListener("submit", salvarOS);

    document.getElementById("btnAdicionarPeca")?.addEventListener("click", adicionarPecaOS);
    document.getElementById("btnAdicionarServico")?.addEventListener("click", adicionarServicoOS);
    document.getElementById("btnFinalizarOS")?.addEventListener("click", finalizarOS);
    document.getElementById("btnConfirmarFinalizacao")?.addEventListener("click", confirmarPagamentoEFinalizarOS);
}

async function carregarVeiculosOS() {
    const select = document.getElementById("veiculo_id");
    const veiculos = await apiOS(await fetch("/veiculos", {credentials: "same-origin"}));

    select.innerHTML = `<option value="">Selecione um veículo</option>` +
        veiculos.map(v => `<option value="${v.id}">${escaparHTML(`${v.marca} ${v.modelo} - ${v.placa}${v.cliente_nome ? " | " + v.cliente_nome : ""}`)}</option>`).join("");
}

async function carregarFuncionariosOS() {
    const select = document.getElementById("funcionario_id");
    const funcionarios = await apiOS(await fetch("/opcoes-funcionarios", {credentials: "same-origin"}));

    select.innerHTML = `<option value="">Não definido</option>` +
        funcionarios.map(f => `<option value="${f.id}">${escaparHTML(f.nome)}${f.cargo ? " - " + escaparHTML(f.cargo) : ""}</option>`).join("");
}

async function carregarOS(id) {
    osAtual = await apiOS(await fetch(`/ordens-servico/${id}`, {credentials: "same-origin"}));

    document.getElementById("veiculo_id").value = osAtual.veiculo_id ?? "";
    document.getElementById("funcionario_id").value = osAtual.funcionario_id ?? "";
    document.getElementById("descricao").value = osAtual.descricao ?? "";
    document.getElementById("valor_base").value = Number(osAtual.valor_base || 0).toFixed(2);
    document.getElementById("status").value = osAtual.status || "pendente";
    document.getElementById("observacoes").value = osAtual.observacoes ?? "";

    bloquearAcoesDependentesDaOS(false);
    renderizarDetalhesOS();
}

async function salvarOS(event) {
    event.preventDefault();

    const dados = {
        veiculo_id: Number(document.getElementById("veiculo_id").value),
        funcionario_id: document.getElementById("funcionario_id").value
            ? Number(document.getElementById("funcionario_id").value)
            : null,
        descricao: document.getElementById("descricao").value.trim(),
        valor_base: Number(document.getElementById("valor_base").value || 0),
        observacoes: document.getElementById("observacoes").value.trim() || null
    };

    if (osAtualId) {
        dados.status = document.getElementById("status").value;
    }

    try {
        const resultado = await apiOS(await fetch(
            osAtualId ? `/ordens-servico/${osAtualId}` : "/ordens-servico",
            {
                method: osAtualId ? "PUT" : "POST",
                credentials: "same-origin",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(dados)
            }
        ));

        if (!osAtualId) {
            alert("Ordem de serviço cadastrada com sucesso.");
            window.location.href = `/cadastro-ordem-servico?id=${resultado.id}`;
            return;
        }

        alert("Ordem de serviço atualizada com sucesso.");
        await carregarOS(osAtualId);
    } catch (erro) {
        alert(erro.message);
    }
}

function bloquearAcoesDependentesDaOS(bloquear) {
    [
        "peca_os",
        "peca_quantidade",
        "btnAdicionarPeca",
        "servico_os",
        "btnAdicionarServico",
        "btnFinalizarOS"
    ].forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) elemento.disabled = bloquear;
    });
}

async function prepararDetalhesOS() {
    const [pecas, servicos] = await Promise.all([
        apiOS(await fetch("/estoque", {credentials: "same-origin"})),
        apiOS(await fetch("/servicos", {credentials: "same-origin"}))
    ]);

    document.getElementById("peca_os").innerHTML =
        `<option value="">Selecione uma peça</option>` +
        pecas.filter(p => p.ativo).map(p =>
            `<option value="${p.id}">${escaparHTML(p.nome)} - ${formatarMoeda(p.preco_venda)} | Estoque: ${p.quantidade_estoque}</option>`
        ).join("");

    document.getElementById("servico_os").innerHTML =
        `<option value="">Selecione um serviço</option>` +
        servicos.filter(s => s.ativo).map(s =>
            `<option value="${s.id}">${escaparHTML(s.descricao)} - ${formatarMoeda(s.valor_mao_obra)}</option>`
        ).join("");

    renderizarDetalhesOS();
}

function renderizarDetalhesOS() {
    if (!osAtual) return;

    document.getElementById("totalOS").textContent = formatarMoeda(osAtual.valor_total);

    const pecas = document.getElementById("listaPecasOS");
    pecas.innerHTML = (osAtual.pecas || []).length
        ? osAtual.pecas.map(p => `
            <div class="d-flex justify-content-between align-items-center border-bottom py-2">
                <span>${escaparHTML(p.nome)} — ${p.quantidade} × ${formatarMoeda(p.valor_unitario)}</span>
                <button class="btn btn-danger btn-sm remover-peca" data-id="${p.peca_id}" data-qtd="${p.quantidade}" type="button"><i class="fa-solid fa-trash"></i></button>
            </div>`).join("")
        : `<span class="text-muted">Nenhuma peça adicionada.</span>`;

    const servicos = document.getElementById("listaServicosOS");
    servicos.innerHTML = (osAtual.servicos || []).length
        ? osAtual.servicos.map(s => `
            <div class="d-flex justify-content-between align-items-center border-bottom py-2">
                <span>${escaparHTML(s.descricao)} — ${formatarMoeda(s.valor)}</span>
                <button class="btn btn-danger btn-sm remover-servico" data-id="${s.servico_id}" type="button"><i class="fa-solid fa-trash"></i></button>
            </div>`).join("")
        : `<span class="text-muted">Nenhum serviço adicional.</span>`;

    pecas.querySelectorAll(".remover-peca").forEach(btn => {
        btn.addEventListener("click", () => removerPecaOS(btn.dataset.id, btn.dataset.qtd));
    });

    servicos.querySelectorAll(".remover-servico").forEach(btn => {
        btn.addEventListener("click", () => removerServicoOS(btn.dataset.id));
    });
}

async function recarregarOSAtual() {
    await carregarOS(osAtualId);
}

async function adicionarPecaOS() {
    const pecaId = Number(document.getElementById("peca_os").value);
    const quantidade = Number(document.getElementById("peca_quantidade").value);
    if (!pecaId || !quantidade) return alert("Selecione a peça e informe a quantidade.");

    try {
        await apiOS(await fetch(`/ordens-servico/${osAtualId}/pecas`, {
            method: "POST",
            credentials: "same-origin",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({peca_id: pecaId, quantidade})
        }));
        await recarregarOSAtual();
    } catch (erro) { alert(erro.message); }
}

async function removerPecaOS(pecaId, quantidade) {
    try {
        await apiOS(await fetch(`/ordens-servico/${osAtualId}/pecas/${pecaId}?quantidade=${quantidade}`, {
            method: "DELETE",
            credentials: "same-origin"
        }));
        await recarregarOSAtual();
    } catch (erro) { alert(erro.message); }
}

async function adicionarServicoOS() {
    const servicoId = Number(document.getElementById("servico_os").value);
    if (!servicoId) return alert("Selecione um serviço.");

    try {
        await apiOS(await fetch(`/ordens-servico/${osAtualId}/servicos`, {
            method: "POST",
            credentials: "same-origin",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({servico_id: servicoId})
        }));
        await recarregarOSAtual();
    } catch (erro) { alert(erro.message); }
}

async function removerServicoOS(servicoId) {
    try {
        await apiOS(await fetch(`/ordens-servico/${osAtualId}/servicos/${servicoId}`, {
            method: "DELETE",
            credentials: "same-origin"
        }));
        await recarregarOSAtual();
    } catch (erro) { alert(erro.message); }
}

function finalizarOS() {
    if (!osAtualId || !osAtual) {
        alert("Cadastre a ordem de serviço antes de finalizá-la.");
        return;
    }

    if (osAtual.status === "concluida") {
        alert("Esta ordem de serviço já está concluída.");
        return;
    }

    const confirmou = confirm(
        "Deseja realmente finalizar esta ordem de serviço? Após a confirmação, será solicitado o método de pagamento."
    );

    if (!confirmou) return;

    document.getElementById("valorPagamentoModal").textContent =
        formatarMoeda(osAtual.valor_total);

    const modalElemento = document.getElementById("modalPagamentoOS");
    const modal = bootstrap.Modal.getOrCreateInstance(modalElemento);
    modal.show();
}

async function confirmarPagamentoEFinalizarOS() {
    const botao = document.getElementById("btnConfirmarFinalizacao");
    const metodo = document.getElementById("pagamento_metodo").value;

    if (!metodo) {
        alert("Selecione uma forma de pagamento.");
        return;
    }

    botao.disabled = true;

    try {
        await apiOS(await fetch(`/ordens-servico/${osAtualId}/finalizar`, {
            method: "PATCH",
            credentials: "same-origin",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                metodo_pagamento: metodo
            })
        }));

        const modalElemento = document.getElementById("modalPagamentoOS");
        bootstrap.Modal.getOrCreateInstance(modalElemento).hide();

        alert("Pagamento confirmado e ordem de serviço finalizada com sucesso.");

        await recarregarOSAtual();
        document.getElementById("status").value = "concluida";
    } catch (erro) {
        alert(erro.message);
    } finally {
        botao.disabled = false;
    }
}

function optionStatusOS(valor, texto, atual) {
    return `<option value="${valor}" ${valor === atual ? "selected" : ""}>${texto}</option>`;
}

function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function escaparHTML(valor) {
    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
