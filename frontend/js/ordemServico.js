const formulario = document.getElementById("form-ordem-servico");
const mensagem = document.getElementById("mensagem");

const parametros = new URLSearchParams(window.location.search);
const idOS = parametros.get("id");

let ordensServico = [];

// ======================================================
// CADASTRAR OU ALTERAR ORDEM DE SERVIÇO
// ======================================================
if (formulario) {
    formulario.addEventListener("submit", async function (evento) {
        evento.preventDefault();
        if (mensagem) mensagem.textContent = "";

        const ordem = {
            cliente_id: document.getElementById("cliente_id").value,
            veiculo_id: document.getElementById("veiculo_id").value,
            descricao: document.getElementById("descricao").value,
            status: document.getElementById("status").value,
            valor_total: document.getElementById("valor_total").value
        };

        try {
            let resposta;

            if (idOS) {
                resposta = await fetch(`/ordens-servico/${idOS}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(ordem)
                });
            } else {
                resposta = await fetch("/ordens-servico", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(ordem)
                });
            }

            if (resposta.ok) {
                if (mensagem) mensagem.textContent = idOS ? "Ordem de serviço atualizada!" : "Ordem de serviço aberta!";
                if (!idOS) formulario.reset();
            } else {
                if (mensagem) mensagem.textContent = "Erro ao salvar Ordem de Serviço.";
            }
        } catch (erro) {
            if (mensagem) mensagem.textContent = "Erro ao conectar com o servidor.";
        }
    });
}

// ======================================================
// CARREGAR E EXIBIR ORDENS DE SERVIÇO
// ======================================================
async function carregarOrdensServico() {
    const tabela = document.getElementById("listaOrdensServico");
    if (!tabela) return;

    try {
        const resposta = await fetch("/ordens-servico");
        if (!resposta.ok) throw new Error("Erro ao buscar ordens de serviço.");

        ordensServico = await resposta.json();
        exibirOrdensServico(ordensServico);
    } catch (erro) {
        console.error(erro);
        tabela.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Erro ao carregar dados.</td></tr>`;
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
        linha.innerHTML = `
            <td class="fw-bold">#${os.id}</td>
            <td>${os.cliente_nome || 'N/A'}</td>
            <td>${os.veiculo_placa || 'N/A'}</td>
            <td>${os.descricao}</td>
            <td><span class="badge bg-secondary">${os.status}</span></td>
            <td>R$ ${parseFloat(os.valor_total || 0).toFixed(2)}</td>
            <td class="text-end">
                <button type="button" class="btn btn-warning btn-sm me-1" onclick="alterarOS(${os.id})">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button type="button" class="btn btn-danger btn-sm" onclick="excluirOS(${os.id})">
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
function filtrarOrdens() {
    const campoElemento = document.getElementById("campoFiltro");
    const textoElemento = document.getElementById("textoFiltro");

    if (!campoElemento || !textoElemento) return;

    const campo = campoElemento.value;
    const texto = textoElemento.value.toLowerCase().trim();

    const filtradas = ordensServico.filter(os => {
        const valor = os[campo];
        if (valor === null || valor === undefined) return false;
        return String(valor).toLowerCase().includes(texto);
    });

    exibirOrdensServico(filtradas);
}

function inicializarFiltros() {
    const textoFiltro = document.getElementById("textoFiltro");
    const campoFiltro = document.getElementById("campoFiltro");
    const btnLimpar = document.getElementById("btnLimparFiltro");

    if (textoFiltro) {
        textoFiltro.addEventListener("input", filtrarOrdens);
        textoFiltro.addEventListener("keyup", filtrarOrdens);
    }

    if (campoFiltro) {
        campoFiltro.addEventListener("change", filtrarOrdens);
    }

    if (btnLimpar) {
        btnLimpar.addEventListener("click", function () {
            if (textoFiltro) textoFiltro.value = "";
            exibirOrdensServico(ordensServico);
        });
    }
}

function alterarOS(id) {
    window.location.href = `/cadastro-ordem-servico?id=${id}`;
}

async function excluirOS(id) {
    if (!confirm(`Deseja cancelar/excluir a Ordem de Serviço #${id}?`)) return;

    try {
        const resposta = await fetch(`/ordens-servico/${id}`, { method: "DELETE" });
        if (resposta.ok) {
            alert("Ordem de serviço excluída!");
            carregarOrdensServico();
        } else {
            alert("Erro ao excluir OS.");
        }
    } catch (erro) {
        alert("Erro de conexão.");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    carregarOrdensServico();
    inicializarFiltros();
});