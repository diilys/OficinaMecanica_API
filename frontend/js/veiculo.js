const formularioVeiculo = document.getElementById("form-veiculo");
const mensagemVeiculo = document.getElementById("mensagem");
const idVeiculo = new URLSearchParams(window.location.search).get("id");
let veiculos = [];

async function lerRespostaVeiculo(resposta) {
    const tipo = resposta.headers.get("content-type") || "";
    return tipo.includes("application/json") ? resposta.json() : resposta.text();
}

function configurarAreaUsuarioVeiculo() {
    const areaAuth = document.getElementById("area-auth");
    if (!areaAuth) return;

    const usuarioSalvo = localStorage.getItem("usuarioLogado");
    if (!usuarioSalvo) return;

    try {
        const usuario = JSON.parse(usuarioSalvo);
        areaAuth.innerHTML = `
            <div class="d-flex align-items-center gap-2 text-white justify-content-end">
                <span class="fw-semibold small text-truncate" style="max-width: 130px;">
                    <i class="fa-solid fa-user me-1"></i> ${usuario.nome || "Usuário"}
                </span>
                <button onclick="fazerLogout()" class="btn btn-outline-light btn-sm fw-semibold py-0 px-2">Sair</button>
            </div>
        `;
    } catch (erro) {
        localStorage.removeItem("usuarioLogado");
    }
}

function fazerLogout() {
    localStorage.removeItem("usuarioLogado");
    window.location.reload();
}

if (formularioVeiculo) {
    formularioVeiculo.addEventListener("submit", async evento => {
        evento.preventDefault();
        if (mensagemVeiculo) mensagemVeiculo.textContent = "";

        const veiculo = {
            placa: document.getElementById("placa").value.trim(),
            marca: document.getElementById("marca").value.trim(),
            modelo: document.getElementById("modelo").value.trim(),
            ano: Number.parseInt(document.getElementById("ano").value, 10),
            cliente_id: Number.parseInt(document.getElementById("cliente_id").value, 10)
        };

        try {
            const resposta = await fetch(idVeiculo ? `/veiculos/${idVeiculo}` : "/veiculos", {
                method: idVeiculo ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(veiculo)
            });

            const resultado = await lerRespostaVeiculo(resposta);
            if (!resposta.ok) throw new Error(resultado.detail || "Erro ao salvar veículo.");

            if (mensagemVeiculo) mensagemVeiculo.textContent = idVeiculo ? "Veículo alterado com sucesso!" : "Veículo cadastrado com sucesso!";
            setTimeout(() => Navigation.voltar("/painel-veiculos"), 500);
        } catch (erro) {
            console.error(erro);
            if (mensagemVeiculo) mensagemVeiculo.textContent = erro.message || "Erro na conexão.";
        }
    });
}

async function carregarVeiculoParaEdicao() {
    if (!idVeiculo || !formularioVeiculo) return;

    try {
        const resposta = await fetch("/veiculos");
        if (!resposta.ok) throw new Error("Erro ao carregar veículo.");
        const lista = await resposta.json();
        const veiculo = lista.find(item => Number(item.id) === Number(idVeiculo));
        if (!veiculo) throw new Error("Veículo não encontrado.");

        document.getElementById("placa").value = veiculo.placa || "";
        document.getElementById("marca").value = veiculo.marca || "";
        document.getElementById("modelo").value = veiculo.modelo || "";
        document.getElementById("ano").value = veiculo.ano || "";
        document.getElementById("cliente_id").value = veiculo.cliente_id || "";

        const titulo = document.getElementById("tituloFormulario");
        if (titulo) titulo.textContent = "Alterar Veículo";

        const botao = document.getElementById("btnSalvar");
        if (botao) botao.textContent = "Salvar Alterações";
    } catch (erro) {
        console.error(erro);
        if (mensagemVeiculo) mensagemVeiculo.textContent = erro.message;
    }
}

async function carregarVeiculos() {
    const tabela = document.getElementById("listaVeiculos");
    if (!tabela) return;

    try {
        const resposta = await fetch("/veiculos");
        if (!resposta.ok) throw new Error("Erro ao carregar veículos.");
        veiculos = await resposta.json();
        filtrarVeiculos();
    } catch (erro) {
        console.error(erro);
        tabela.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Erro ao carregar veículos.</td></tr>`;
    }
}

function exibirVeiculos(lista) {
    const tabela = document.getElementById("listaVeiculos");
    if (!tabela) return;

    tabela.innerHTML = "";
    if (!lista.length) {
        tabela.innerHTML = `<tr><td colspan="6" class="text-center text-muted">Nenhum veículo encontrado.</td></tr>`;
        return;
    }

    lista.forEach(veiculo => {
        const linha = document.createElement("tr");
        linha.innerHTML = `
            <td>${veiculo.id}</td>
            <td class="fw-bold">${veiculo.placa || ""}</td>
            <td>${veiculo.marca || ""} ${veiculo.modelo || ""}</td>
            <td>${veiculo.ano || ""}</td>
            <td>${veiculo.cliente_nome || "N/A"}${veiculo.cliente_ativo === false ? ' <span class="badge bg-secondary">Cliente inativo</span>' : ""}</td>
            <td class="text-end">
                <button type="button" class="btn btn-warning btn-sm me-1" onclick="alterarVeiculo(${veiculo.id})"><i class="fa-solid fa-pen"></i></button>
                <button type="button" class="btn btn-danger btn-sm" onclick="excluirVeiculo(${veiculo.id}, '${String(veiculo.placa || "").replace(/'/g, "\\'")}')"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tabela.appendChild(linha);
    });
}

function filtrarVeiculos() {
    const campo = document.getElementById("campoFiltro");
    const texto = document.getElementById("textoFiltro");
    if (!campo || !texto) return exibirVeiculos(veiculos);

    const termo = texto.value.toLowerCase().trim();
    if (!termo) return exibirVeiculos(veiculos);

    exibirVeiculos(veiculos.filter(veiculo =>
        String(veiculo[campo.value] ?? "").toLowerCase().includes(termo)
    ));
}

function alterarVeiculo(id) {
    window.location.href = `/cadastro-veiculo?id=${id}`;
}

async function excluirVeiculo(id, placa) {
    if (!confirm(`Deseja excluir o veículo de placa ${placa}? A exclusão só será permitida se ele não possuir histórico vinculado.`)) return;

    try {
        const resposta = await fetch(`/veiculos/${id}`, { method: "DELETE" });
        const resultado = await lerRespostaVeiculo(resposta);
        if (!resposta.ok) throw new Error(resultado.detail || "Erro ao excluir veículo.");
        await carregarVeiculos();
    } catch (erro) {
        alert(erro.message);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    configurarAreaUsuarioVeiculo();
    carregarVeiculoParaEdicao();

    if (document.getElementById("listaVeiculos")) {
        carregarVeiculos();
        document.getElementById("textoFiltro")?.addEventListener("input", filtrarVeiculos);
        document.getElementById("campoFiltro")?.addEventListener("change", filtrarVeiculos);
        document.getElementById("btnLimparFiltro")?.addEventListener("click", () => {
            const texto = document.getElementById("textoFiltro");
            if (texto) texto.value = "";
            exibirVeiculos(veiculos);
        });
    }
});
