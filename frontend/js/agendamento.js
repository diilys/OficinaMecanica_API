document.addEventListener(
    "DOMContentLoaded",
    async () => {

        const formAgendamento =
            document.getElementById(
                "form-agendamento"
            );

        const listaAgendamentos =
            document.getElementById(
                "listaAgendamentos"
            );


        /*
         * Página utilizada pelo cliente.
         */
        if (formAgendamento) {

            const usuario =
                await Auth.exigir([
                    "cliente"
                ]);

            if (!usuario) {
                return;
            }

            iniciarAgendamentoCliente(
                formAgendamento,
                usuario
            );

            return;
        }


        /*
         * Página administrativa/operacional.
         */
        if (listaAgendamentos) {

            const usuario =
                await Auth.exigir([
                    "admin",
                    "funcionario"
                ]);

            if (!usuario) {
                return;
            }

            iniciarGerenciamentoAgendamentos(
                listaAgendamentos
            );
        }
    }
);


/* ============================================================
   API
   ============================================================ */

function formatarErroAgendamento(
    erro
) {

    if (!erro) {
        return "Não foi possível concluir a operação.";
    }


    /*
     * Caso o backend já tenha enviado uma mensagem simples.
     */
    if (typeof erro === "string") {
        return erro;
    }


    /*
     * FastAPI pode retornar detail como uma lista de objetos:
     *
     * [
     *     {
     *         type: "...",
     *         loc: [...],
     *         msg: "...",
     *         input: "..."
     *     }
     * ]
     *
     * Sem esse tratamento o JavaScript exibe:
     * [object Object],[object Object]
     */
    if (Array.isArray(erro)) {

        const mensagens =
            erro
                .map(
                    (item) => {

                        if (
                            typeof item ===
                            "string"
                        ) {
                            return item;
                        }


                        if (
                            item &&
                            typeof item ===
                            "object"
                        ) {

                            if (item.msg) {
                                return item.msg;
                            }

                            if (item.message) {
                                return item.message;
                            }

                            if (item.mensagem) {
                                return item.mensagem;
                            }

                            if (item.detail) {
                                return formatarErroAgendamento(
                                    item.detail
                                );
                            }
                        }


                        return null;
                    }
                )
                .filter(Boolean);


        if (mensagens.length) {

            return mensagens.join(
                " | "
            );
        }


        return "Não foi possível concluir a operação.";
    }


    /*
     * Caso seja um objeto de erro.
     */
    if (
        typeof erro ===
        "object"
    ) {

        if (erro.msg) {

            return formatarErroAgendamento(
                erro.msg
            );
        }


        if (erro.message) {

            return formatarErroAgendamento(
                erro.message
            );
        }


        if (erro.mensagem) {

            return formatarErroAgendamento(
                erro.mensagem
            );
        }


        if (erro.detail) {

            return formatarErroAgendamento(
                erro.detail
            );
        }
    }


    return "Não foi possível concluir a operação.";
}


async function apiAgendamento(
    resposta
) {

    if (resposta.status === 401) {

        window.location.replace(
            "/login"
        );

        throw new Error(
            "Sua sessão expirou."
        );
    }


    if (!resposta.ok) {

        let mensagem =
            "Não foi possível concluir a operação.";


        try {

            const dados =
                await resposta.json();


            mensagem =
                formatarErroAgendamento(
                    dados.detail ||
                    dados.mensagem ||
                    dados.message ||
                    mensagem
                );

        } catch (erro) {

            console.error(
                erro
            );
        }


        throw new Error(
            mensagem
        );
    }


    if (resposta.status === 204) {
        return null;
    }


    return await resposta.json();
}


/* ============================================================
   CLIENTE - NOVO AGENDAMENTO
   ============================================================ */

async function iniciarAgendamentoCliente(
    formulario,
    usuario
) {

    const selectVeiculo =
        document.getElementById(
            "veiculo_id"
        );

    const btnVoltar =
        document.getElementById(
            "btnVoltar"
        );


    if (btnVoltar) {

        btnVoltar.addEventListener(
            "click",
            () => {
                Navigation.voltar("/");
            }
        );
    }


    if (selectVeiculo) {

        try {

            const veiculos =
                await apiAgendamento(
                    await fetch(
                        `/clientes/${usuario.id}/veiculos`,
                        {
                            credentials:
                                "same-origin"
                        }
                    )
                );


            selectVeiculo.innerHTML =
                `
                    <option value="">
                        Selecione um veículo
                    </option>
                `;


            veiculos.forEach(
                (veiculo) => {

                    const option =
                        document.createElement(
                            "option"
                        );


                    option.value =
                        veiculo.id;


                    option.textContent =
                        `${veiculo.marca} ${veiculo.modelo} - ${veiculo.placa}`;


                    selectVeiculo.appendChild(
                        option
                    );
                }
            );

        } catch (erro) {

            alert(
                erro.message
            );
        }
    }


    formulario.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            const botao =
                formulario.querySelector(
                    "[type='submit']"
                );


            const dados = {

                veiculo_id:
                    Number(
                        document.getElementById(
                            "agendamento_veiculo"
                        ).value
                    ),

                data_hora:
                    document.getElementById(
                        "agendamento_data"
                    ).value,

                observacoes:
                    document.getElementById(
                        "agendamento_observacoes"
                    )?.value
                        .trim() || null
            };


            if (!dados.veiculo_id) {

                alert(
                    "Selecione um veículo."
                );

                return;
            }


            if (!dados.data_hora) {

                alert(
                    "Informe a data e o horário."
                );

                return;
            }


            try {

                if (botao) {
                    botao.disabled = true;
                }


                await apiAgendamento(
                    await fetch(
                        "/agendamentos",
                        {
                            method:
                                "POST",

                            credentials:
                                "same-origin",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify(
                                    dados
                                )
                        }
                    )
                );


                alert(
                    "Agendamento realizado com sucesso!"
                );


                Navigation.voltar("/");

            } catch (erro) {

                alert(
                    erro.message
                );

            } finally {

                if (botao) {
                    botao.disabled = false;
                }
            }
        }
    );
}


/* ============================================================
   GERENCIAMENTO DE AGENDAMENTOS
   ============================================================ */

async function iniciarGerenciamentoAgendamentos(
    tabela
) {

    let agendamentos = [];


    const pesquisa =
        document.getElementById(
            "pesquisaAgendamento"
        );


    const filtro =
        document.getElementById(
            "filtroStatusAgendamento"
        );


    const mensagem =
        document.getElementById(
            "mensagemAgendamentos"
        );


    const btnVoltar =
        document.getElementById(
            "btnVoltar"
        );


    if (btnVoltar) {

        btnVoltar.addEventListener(
            "click",
            () => {
                Navigation.voltar(
                    "/painel-admin"
                );
            }
        );
    }


    function mostrarMensagem(
        texto,
        tipo
    ) {

        alert(
            formatarErroAgendamento(
                texto
            )
        );
    }


    function formatarData(
        data
    ) {

        if (!data) {
            return "-";
        }


        const objeto =
            new Date(data);


        if (
            Number.isNaN(
                objeto.getTime()
            )
        ) {
            return data;
        }


        return objeto.toLocaleString(
            "pt-BR"
        );
    }


    function renderizar() {

        const termo =
            pesquisa
                ? pesquisa.value
                    .trim()
                    .toLowerCase()
                : "";


        let status =
            filtro
                ? filtro.value
                : "";


        /*
         * Na interface aparece "Pendente",
         * mas o status utilizado pelo agendamento
         * é "agendado".
         */
        if (status === "pendente") {

            status =
                "agendado";
        }


        const filtrados =
            agendamentos.filter(
                (agendamento) => {

                    if (
                        status &&
                        String(
                            agendamento.status ??
                            ""
                        )
                            .trim()
                            .toLowerCase() !==
                        String(status)
                            .trim()
                            .toLowerCase()
                    ) {
                        return false;
                    }


                    if (!termo) {
                        return true;
                    }


                    const texto = [
                        agendamento.cliente,
                        agendamento.cliente_nome,
                        agendamento.nome_cliente,
                        agendamento.placa,
                        agendamento.modelo,
                        agendamento.marca
                    ]
                        .filter(Boolean)
                        .join(" ")
                        .toLowerCase();


                    return texto.includes(
                        termo
                    );
                }
            );


        if (!filtrados.length) {

            tabela.innerHTML = `
                <tr>
                    <td
                        colspan="5"
                        class="text-center text-muted py-4"
                    >
                        Nenhum agendamento encontrado.
                    </td>
                </tr>
            `;

            return;
        }


        tabela.innerHTML =
            filtrados
                .map(
                    (agendamento) => {

                        const cliente =
                            agendamento.cliente_nome ||
                            agendamento.nome_cliente ||
                            agendamento.cliente ||
                            "-";


                        const veiculo =
                            agendamento.veiculo ||
                            [
                                agendamento.marca,
                                agendamento.modelo
                            ]
                                .filter(Boolean)
                                .join(" ") ||
                            agendamento.placa ||
                            "-";


                        return `
                            <tr>

                                <td>
                                    ${escaparAgendamento(
                                        cliente
                                    )}
                                </td>


                                <td>
                                    ${escaparAgendamento(
                                        veiculo
                                    )}

                                    ${
                                        agendamento.placa &&
                                        !String(
                                            veiculo
                                        ).includes(
                                            agendamento.placa
                                        )
                                            ? `<small class="d-block text-muted">
                                                ${escaparAgendamento(
                                                    agendamento.placa
                                                )}
                                               </small>`
                                            : ""
                                    }
                                </td>


                                <td>
                                    ${escaparAgendamento(
                                        formatarData(
                                            agendamento.data_hora
                                        )
                                    )}
                                </td>


                                <td>

                                    <select
                                        class="form-select form-select-sm status-agendamento"
                                        data-id="${escaparAgendamento(
                                            agendamento.id
                                        )}"
                                    >

                                        ${optionStatus(
                                            "agendado",
                                            "Pendente",
                                            agendamento.status
                                        )}

                                        ${optionStatus(
                                            "confirmado",
                                            "Confirmado",
                                            agendamento.status
                                        )}

                                        ${optionStatus(
                                            "concluido",
                                            "Concluído",
                                            agendamento.status
                                        )}

                                        ${optionStatus(
                                            "cancelado",
                                            "Cancelado",
                                            agendamento.status
                                        )}

                                    </select>

                                </td>


                                <td>
                                    ${escaparAgendamento(
                                        agendamento.observacoes ||
                                        "-"
                                    )}
                                </td>

                            </tr>
                        `;
                    }
                )
                .join("");
    }


    async function carregar() {

        try {

            agendamentos =
                await apiAgendamento(
                    await fetch(
                        "/agendamentos",
                        {
                            credentials:
                                "same-origin"
                        }
                    )
                );


            if (
                !Array.isArray(
                    agendamentos
                )
            ) {
                agendamentos = [];
            }


            renderizar();

        } catch (erro) {

            tabela.innerHTML = `
                <tr>
                    <td
                        colspan="5"
                        class="text-center text-danger py-4"
                    >
                        ${escaparAgendamento(
                            erro.message
                        )}
                    </td>
                </tr>
            `;


            mostrarMensagem(
                erro.message,
                "danger"
            );
        }
    }


    tabela.addEventListener(
        "change",
        async (event) => {

            const select =
                event.target.closest(
                    ".status-agendamento"
                );


            if (!select) {
                return;
            }


            const id =
                select.dataset.id;


            const novoStatus =
                select.value;


            select.disabled = true;


            try {

                await apiAgendamento(
                    await fetch(
                        `/agendamentos/${id}`,
                        {
                            method:
                                "PUT",

                            credentials:
                                "same-origin",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({
                                    status:
                                        novoStatus
                                })
                        }
                    )
                );


                const agendamento =
                    agendamentos.find(
                        (item) =>
                            String(
                                item.id
                            ) ===
                            String(id)
                    );


                if (agendamento) {

                    agendamento.status =
                        novoStatus;
                }


                mostrarMensagem(
                    "Status atualizado com sucesso.",
                    "success"
                );


                renderizar();

            } catch (erro) {

                mostrarMensagem(
                    erro.message,
                    "danger"
                );


                await carregar();

            } finally {

                select.disabled = false;
            }
        }
    );


    if (pesquisa) {

        pesquisa.addEventListener(
            "input",
            renderizar
        );
    }


    if (filtro) {

        filtro.addEventListener(
            "change",
            renderizar
        );
    }


    await carregar();
}


/* ============================================================
   UTILITÁRIOS
   ============================================================ */

function optionStatus(
    valor,
    texto,
    atual
) {

    const valorAtual =
        String(
            atual ?? ""
        )
            .trim()
            .toLowerCase();


    const valorOption =
        String(
            valor ?? ""
        )
            .trim()
            .toLowerCase();


    return `
        <option
            value="${valor}"
            ${
                valorAtual === valorOption
                    ? "selected"
                    : ""
            }
        >
            ${texto}
        </option>
    `;
}


function escaparAgendamento(
    valor
) {

    return String(
        valor ?? ""
    )
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );
}
