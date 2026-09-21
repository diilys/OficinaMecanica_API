const formularioOS =
    document.getElementById("form-os");

const mensagemOS =
    document.getElementById("mensagemOS");

const parametrosOS =
    new URLSearchParams(
        window.location.search
    );

const idOS =
    parametrosOS.get("id");

let ordensServico = [];


// ======================================================
// CADASTRAR OU ALTERAR ORDEM DE SERVIÇO
// ======================================================
if (formularioOS) {

    formularioOS.addEventListener(
        "submit",
        async function (evento) {

            evento.preventDefault();

            if (mensagemOS) {
                mensagemOS.textContent = "";
            }

            const id =
                document.getElementById(
                    "os_id"
                ).value;

            const veiculoId =
                parseInt(
                    document.getElementById(
                        "veiculo_id"
                    ).value,
                    10
                );

            const valorTotal =
                parseFloat(
                    document.getElementById(
                        "valor_total"
                    ).value
                );

            const osData = {

                veiculo_id: veiculoId,

                descricao:
                    document.getElementById(
                        "descricao"
                    ).value,

                status:
                    document.getElementById(
                        "status"
                    ).value,

                valor_total: valorTotal

            };

            try {

                let resposta;

                // ==========================================
                // ALTERAR
                // ==========================================
                if (id) {

                    resposta =
                        await fetch(
                            `/ordens-servico/${id}`,
                            {
                                method: "PUT",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                body:
                                    JSON.stringify(
                                        osData
                                    )
                            }
                        );

                }

                // ==========================================
                // CADASTRAR
                // ==========================================
                else {

                    resposta =
                        await fetch(
                            "/ordens-servico",
                            {
                                method: "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                body:
                                    JSON.stringify(
                                        osData
                                    )
                            }
                        );

                }

                const resultado =
                    await resposta.json();

                if (resposta.ok) {

                    if (id) {

                        alert(
                            "Ordem de Serviço alterada com sucesso!"
                        );

                    } else {

                        alert(
                            "Ordem de Serviço cadastrada com sucesso!"
                        );

                    }

                    // Volta para a lista
                    window.location.href =
                        "/painel-ordens";

                } else {

                    if (mensagemOS) {

                        mensagemOS.textContent =
                            "Erro: " +
                            (
                                resultado.detail ||
                                "Erro ao salvar Ordem de Serviço."
                            );

                    }
                }

            } catch (erro) {

                console.error(
                    "Erro:",
                    erro
                );

                if (mensagemOS) {

                    mensagemOS.textContent =
                        "Não foi possível conectar ao servidor.";

                }
            }
        }
    );
}


// ======================================================
// CARREGAR OS PARA ALTERAÇÃO
// ======================================================
async function carregarOSParaAlteracao() {

    // Sem ID = nova OS
    if (!idOS) {

        configurarFormularioNovoOS();

        return;
    }

    try {

        const resposta =
            await fetch(
                "/ordens-servico"
            );

        if (!resposta.ok) {

            throw new Error(
                "Erro ao carregar Ordens de Serviço."
            );
        }

        const ordens =
            await resposta.json();

        const os =
            ordens.find(
                ordem =>
                    String(ordem.id) ===
                    String(idOS)
            );

        if (!os) {

            if (mensagemOS) {

                mensagemOS.textContent =
                    "Ordem de Serviço não encontrada.";

            }

            return;
        }

        // ==========================================
        // PREENCHER FORMULÁRIO
        // ==========================================

        document.getElementById(
            "os_id"
        ).value = os.id;

        document.getElementById(
            "veiculo_id"
        ).value = os.veiculo_id;

        document.getElementById(
            "descricao"
        ).value = os.descricao || "";

        document.getElementById(
            "status"
        ).value = os.status || "Pendente";

        document.getElementById(
            "valor_total"
        ).value = os.valor_total ?? 0;


        // ==========================================
        // ALTERAR TÍTULO
        // ==========================================

        const titulo =
            document.getElementById(
                "modalOSTitulo"
            );

        if (titulo) {

            titulo.textContent =
                "Alterar Ordem de Serviço";

        }


        // ==========================================
        // ALTERAR BOTÃO
        // ==========================================

        const botao =
            document.getElementById(
                "btnSalvarOS"
            );

        if (botao) {

            botao.textContent =
                "Salvar Alterações";

        }

    } catch (erro) {

        console.error(
            "Erro ao carregar OS:",
            erro
        );

        if (mensagemOS) {

            mensagemOS.textContent =
                "Erro ao carregar os dados da Ordem de Serviço.";

        }
    }
}


// ======================================================
// CONFIGURAR NOVA OS
// ======================================================
function configurarFormularioNovoOS() {

    const campoId =
        document.getElementById(
            "os_id"
        );

    if (campoId) {
        campoId.value = "";
    }

    const titulo =
        document.getElementById(
            "modalOSTitulo"
        );

    if (titulo) {

        titulo.textContent =
            "Nova Ordem de Serviço";

    }

    const botao =
        document.getElementById(
            "btnSalvarOS"
        );

    if (botao) {

        botao.textContent =
            "Salvar OS";

    }
}


// ======================================================
// LIMPAR FORMULÁRIO
// ======================================================
function limparFormularioOS() {

    if (!formularioOS) {
        return;
    }

    formularioOS.reset();

    configurarFormularioNovoOS();

    if (mensagemOS) {
        mensagemOS.textContent = "";
    }
}


// ======================================================
// CARREGAR ORDENS DE SERVIÇO
// ======================================================
async function carregarOrdensServico() {

    const tabela =
        document.getElementById(
            "listaOrdensServico"
        );

    if (!tabela) {
        return;
    }

    try {

        const resposta =
            await fetch(
                "/ordens-servico"
            );

        if (!resposta.ok) {

            throw new Error(
                "Erro ao carregar Ordens de Serviço."
            );
        }

        ordensServico =
            await resposta.json();

        filtrarOrdensServico();

    } catch (erro) {

        console.error(erro);

        tabela.innerHTML = `
            <tr>
                <td colspan="7"
                    class="text-center text-danger">
                    Erro ao carregar Ordens de Serviço.
                </td>
            </tr>
        `;
    }
}


// ======================================================
// EXIBIR ORDENS DE SERVIÇO
// ======================================================
function exibirOrdensServico(lista) {

    const tabela =
        document.getElementById(
            "listaOrdensServico"
        );

    if (!tabela) {
        return;
    }

    tabela.innerHTML = "";

    if (!lista || lista.length === 0) {

        tabela.innerHTML = `
            <tr>
                <td colspan="7"
                    class="text-center text-muted">
                    Nenhuma ordem de serviço encontrada.
                </td>
            </tr>
        `;

        return;
    }

    lista.forEach(os => {

        const linha =
            document.createElement("tr");

        linha.innerHTML = `

            <td>
                #${os.id}
            </td>

            <td>
                ${os.cliente_nome || "N/A"}
            </td>

            <td>
                ${os.veiculo_modelo || ""}
                (${os.veiculo_placa || "N/A"})
            </td>

            <td>
                ${os.descricao || ""}
            </td>

            <td>
                <span class="badge ${obterClasseBadge(os.status)}">
                    ${os.status || ""}
                </span>
            </td>

            <td>
                R$ ${Number(
                    os.valor_total || 0
                ).toFixed(2)}
            </td>

            <td>

                <button
                    type="button"
                    class="btn btn-warning btn-sm"
                    onclick="editarOS(${os.id})">

                    ✏️ Alterar

                </button>

                <button
                    type="button"
                    class="btn btn-danger btn-sm"
                    onclick="excluirOS(${os.id})">

                    🗑️ Excluir

                </button>

            </td>
        `;

        tabela.appendChild(linha);
    });
}


// ======================================================
// FILTRAR ORDENS DE SERVIÇO
// ======================================================
function filtrarOrdensServico() {

    const campoFiltro =
        document.getElementById(
            "campoFiltro"
        );

    const textoFiltro =
        document.getElementById(
            "textoFiltro"
        );

    if (!campoFiltro || !textoFiltro) {

        exibirOrdensServico(
            ordensServico
        );

        return;
    }

    const campo =
        campoFiltro.value;

    const texto =
        textoFiltro.value
            .toLowerCase()
            .trim();

    if (texto === "") {

        exibirOrdensServico(
            ordensServico
        );

        return;
    }

    const filtradas =
        ordensServico.filter(os => {

            const valor =
                os[campo];

            if (
                valor === null ||
                valor === undefined
            ) {
                return false;
            }

            return String(valor)
                .toLowerCase()
                .includes(texto);

        });

    exibirOrdensServico(
        filtradas
    );
}


// ======================================================
// INICIALIZAR FILTROS
// ======================================================
function inicializarFiltros() {

    const textoFiltro =
        document.getElementById(
            "textoFiltro"
        );

    const campoFiltro =
        document.getElementById(
            "campoFiltro"
        );

    const btnLimpar =
        document.getElementById(
            "btnLimparFiltro"
        );

    if (textoFiltro) {

        textoFiltro.addEventListener(
            "input",
            filtrarOrdensServico
        );

    }

    if (campoFiltro) {

        campoFiltro.addEventListener(
            "change",
            filtrarOrdensServico
        );

    }

    if (btnLimpar) {

        btnLimpar.addEventListener(
            "click",
            function () {

                if (textoFiltro) {
                    textoFiltro.value = "";
                }

                exibirOrdensServico(
                    ordensServico
                );
            }
        );
    }
}


// ======================================================
// CLASSE DO STATUS
// ======================================================
function obterClasseBadge(status) {

    const statusFormatado =
        status
            ? status.trim().toLowerCase()
            : "";

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


// ======================================================
// ALTERAR ORDEM DE SERVIÇO
// ======================================================
function editarOS(id) {

    window.location.href =
        `/cadastro-ordem-servico?id=${id}`;
}


// ======================================================
// EXCLUIR ORDEM DE SERVIÇO
// ======================================================
async function excluirOS(id) {

    if (
        !confirm(
            `Deseja realmente excluir a OS #${id}?`
        )
    ) {
        return;
    }

    try {

        const resposta =
            await fetch(
                `/ordens-servico/${id}`,
                {
                    method: "DELETE"
                }
            );

        if (resposta.ok) {

            alert(
                "Ordem de Serviço excluída com sucesso!"
            );

            await carregarOrdensServico();

        } else {

            const resultado =
                await resposta.json();

            alert(
                "Erro: " +
                (
                    resultado.detail ||
                    "Não foi possível excluir a OS."
                )
            );
        }

    } catch (erro) {

        console.error(erro);

        alert(
            "Erro de conexão ao excluir OS."
        );
    }
}


// ======================================================
// INICIALIZAÇÃO
// ======================================================
document.addEventListener(
    "DOMContentLoaded",
    function () {

        // Página de cadastro/alteração
        if (formularioOS) {

            carregarOSParaAlteracao();

        }

        // Página da lista
        if (
            document.getElementById(
                "listaOrdensServico"
            )
        ) {

            inicializarFiltros();

            carregarOrdensServico();

        }
    }
);