const formularioOS = document.getElementById("form-os");
const mensagemOS = document.getElementById("mensagemOS");

if (formularioOS) {
    formularioOS.addEventListener("submit", async function (evento) {
        evento.preventDefault();
        mensagemOS.textContent = "";

        const id = document.getElementById("os_id").value;
        const osData = {
            veiculo_id: parseInt(document.getElementById("veiculo_id").value),
            descricao: document.getElementById("descricao").value,
            status: document.getElementById("status").value,
            valor_total: parseFloat(document.getElementById("valor_total").value)
        };

        try {
            let resposta;
            if (id) {
                resposta = await fetch(`/ordens-servico/${id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(osData)
                });
            } else {
                resposta = await fetch("/ordens-servico", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(osData)
                });
            }

            const resultado = await resposta.json();

            if (resposta.ok) {
                const modalElement = document.getElementById('modalOrdemServico');
                const modal = bootstrap.Modal.getInstance(modalElement);
                if (modal) modal.hide();
                limparFormularioOS();
                carregarOrdensServico();
            } else {
                mensagemOS.textContent = "Erro: " + (resultado.detail || "Erro ao salvar Ordem de Serviço.");
            }
        } catch (erro) {
            mensagemOS.textContent = "Não foi possível conectar ao servidor.";
        }
    });
}

function limparFormularioOS() {
    if (!formularioOS) return;
    formularioOS.reset();
    document.getElementById("os_id").value = "";
    document.getElementById("modalOSTitulo").textContent = "Nova Ordem de Serviço";
    document.getElementById("btnSalvarOS").textContent = "Salvar OS";
    mensagemOS.textContent = "";
}

async function carregarOrdensServico() {
    const tabela = document.getElementById("listaOrdensServico");
    if (!tabela) return;

    try {
        const resposta = await fetch("/ordens-servico");
        if (!resposta.ok) throw new Error("Erro ao carregar Ordens de Serviço.");

        const ordens = await resposta.json();
        exibirOrdensServico(ordens);
    } catch (erro) {
        tabela.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Erro ao carregar Ordens de Serviço.</td></tr>`;
    }
}

function exibirOrdensServico(lista) {
    const tabela = document.getElementById("listaOrdensServico");
    if (!tabela) return;

    tabela.innerHTML = "";
    lista.forEach(os => {
        const linha = document.createElement("tr");
        linha.innerHTML = `
            <td>#${os.id}</td>
            <td>${os.cliente_nome}</td>
            <td>${os.veiculo_modelo} (${os.veiculo_placa})</td>
            <td>${os.descricao}</td>
            <td><span class="badge ${obterClasseBadge(os.status)}">${os.status}</span></td>
            <td>R$ ${Number(os.valor_total).toFixed(2)}</td>
            <td>
                <button type="button" class="btn btn-warning btn-sm" onclick="editarOS(${os.id}, ${os.veiculo_id}, '${os.descricao.replace(/'/g, "\\'")}', '${os.status}', ${os.valor_total})">✏️ Alterar</button>
                <button type="button" class="btn btn-danger btn-sm" onclick="excluirOS(${os.id})">🗑️ Excluir</button>
            </td>
        `;
        tabela.appendChild(linha);
    });
}

function obterClasseBadge(status) {
    // Tratamento unificado para lidar com variações de maiúsculas/minúsculas vindas do banco
    const statusFormatado = status ? status.trim().toLowerCase() : "";
    
    switch (statusFormatado) {
        case "concluído": 
        case "concluido": 
            return "bg-success";
        case "em andamento": 
            return "bg-warning text-dark";
        case "pendente": 
            return "bg-secondary";
        case "cancelado": 
            return "bg-danger";
        default: 
            return "bg-info";
    }
}

function editarOS(id, veiculo_id, descricao, status, valor_total) {
    document.getElementById("os_id").value = id;
    document.getElementById("veiculo_id").value = veiculo_id;
    document.getElementById("descricao").value = descricao;
    document.getElementById("status").value = status;
    document.getElementById("valor_total").value = valor_total;

    document.getElementById("modalOSTitulo").textContent = "Alterar Ordem de Serviço";
    document.getElementById("btnSalvarOS").textContent = "Salvar Alterações";

    const modal = new bootstrap.Modal(document.getElementById('modalOrdemServico'));
    modal.show();
}

async function excluirOS(id) {
    if (!confirm(`Deseja realmente excluir a OS #${id}?`)) return;

    try {
        const resposta = await fetch(`/ordens-servico/${id}`, { method: "DELETE" });
        if (resposta.ok) {
            alert("Ordem de Serviço excluída com sucesso!");
            carregarOrdensServico();
        } else {
            const resultado = await resposta.json();
            alert("Erro: " + (resultado.detail || "Não foi possível excluir a OS."));
        }
    } catch (erro) {
        alert("Erro de conexão ao excluir OS.");
    }
}

carregarOrdensServico();
