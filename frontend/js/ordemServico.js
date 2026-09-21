const formularioOS = document.getElementById("form-os");
const mensagemOS = document.getElementById("mensagemOS");

if (formularioOS) {
    formularioOS.addEventListener("submit", async function (evento) {
        evento.preventDefault();
        if (mensagemOS) mensagemOS.textContent = "";

        const id = document.getElementById("os_id").value;
        const osData = {
            veiculo_id: parseInt(document.getElementById("veiculo_id").value, 10),
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
                if (modalElement) {
                    const modal = bootstrap.Modal.getInstance(modalElement);
                    if (modal) modal.hide();
                }
                limparFormularioOS();
                carregarOrdensServico();
            } else {
                if (mensagemOS) mensagemOS.textContent = "Erro: " + (resultado.detail || "Erro ao salvar Ordem de Serviço.");
            }
        } catch (erro) {
            if (mensagemOS) mensagemOS.textContent = "Não foi possível conectar ao servidor.";
        }
    });
}

function limparFormularioOS() {
    if (!formularioOS) return;
    formularioOS.reset();
    document.getElementById("os_id").value = "";
    
    const tituloModal = document.getElementById("modalOSTitulo");
    if (tituloModal) tituloModal.textContent = "Nova Ordem de Serviço";
    
    const btnSalvar = document.getElementById("btnSalvarOS");
    if (btnSalvar) btnSalvar.textContent = "Salvar OS";
    
    if (mensagemOS) mensagemOS.textContent = "";
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

    if (!lista || lista.length === 0) {
        tabela.innerHTML = `<tr><td colspan="7" class="text-center text-muted">Nenhuma ordem de serviço encontrada.</td></tr>`;
        return;
    }

    lista.forEach(os => {
        const linha = document.createElement("tr");
        const descricaoSegura = os.descricao ? os.descricao.replace(/'/g, "\\'") : "";
        
        linha.innerHTML = `
            <td>#${os.id}</td>
            <td>${os.cliente_nome || 'N/A'}</td>
            <td>${os.veiculo_modelo || ''} (${os.veiculo_placa || 'N/A'})</td>
            <td>${os.descricao}</td>
            <td><span class="badge ${obterClasseBadge(os.status)}">${os.status}</span></td>
            <td>R$ ${Number(os.valor_total || 0).toFixed(2)}</td>
            <td>
                <button type="button" class="btn btn-warning btn-sm" onclick="editarOS(${os.id}, ${os.veiculo_id}, '${descricaoSegura}', '${os.status}', ${os.valor_total})">✏️ Alterar</button>
                <button type="button" class="btn btn-danger btn-sm" onclick="excluirOS(${os.id})">🗑️ Excluir</button>
            </td>
        `;
        tabela.appendChild(linha);
    });
}

function obterClasseBadge(status) {
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

    const tituloModal = document.getElementById("modalOSTitulo");
    if (tituloModal) tituloModal.textContent = "Alterar Ordem de Serviço";
    
    const btnSalvar = document.getElementById("btnSalvarOS");
    if (btnSalvar) btnSalvar.textContent = "Salvar Alterações";

    const modalElement = document.getElementById('modalOrdemServico');
    if (modalElement) {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
    }
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