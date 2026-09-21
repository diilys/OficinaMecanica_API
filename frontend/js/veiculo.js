const formulario =
    document.getElementById("form-veiculo");

const mensagem =
    document.getElementById("mensagem");

const parametros =
    new URLSearchParams(
        window.location.search
    );

const idVeiculo =
    parametros.get("id");

let veiculos = [];

// ======================================================
// CADASTRAR OU ALTERAR VEÍCULO
// ======================================================
if (formulario) {
    formulario.addEventListener(
        "submit",
        async function (evento) {

            evento.preventDefault();

            if (mensagem) {
                mensagem.textContent = "";
            }

            const veiculo = {
                placa:
                    document.getElementById(
                        "placa"
                    ).value,

                marca:
                    document.getElementById(
                        "marca"
                    ).value,

                modelo:
                    document.getElementById(
                        "modelo"
                    ).value,

                ano: parseInt(
                    document.getElementById(
                        "ano"
                    ).value,
                    10
                ),

                cliente_id: parseInt(
                    document.getElementById(
                        "cliente_id"
                    ).value,
                    10
                )
            };

            try {
                let resposta;

                if (idVeiculo) {
                    resposta =
                        await fetch(
                            `/veiculos/${idVeiculo}`,
                            {
                                method: "PUT",
                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },
                                body:
                                    JSON.stringify(
                                        veiculo
                                    )
                            }
                        );
                } else {
                    resposta =
                        await fetch(
                            "/veiculos",
                            {
                                method: "POST",
                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },
                                body:
                                    JSON.stringify(
                                        veiculo
                                    )
                            }
                        );
                }

                const resultado =
                    await resposta.json();

                if (resposta.ok) {

                    if (mensagem) {
                        mensagem.textContent =
                            idVeiculo
                                ? "Veículo alterado com sucesso!"
                                : "Veículo cadastrado!";
                    }

                    if (!idVeiculo) {
                        formulario.reset();
                    }

                } else {

                    if (mensagem) {
                        mensagem.textContent =
                            "Erro: " +
                            (
                                resultado.detail ||
                                "Erro ao salvar os dados do veículo."
                            );
                    }
                }

            } catch (erro) {

                if (mensagem) {
                    mensagem.textContent =
                        "Erro na conexão.";
                }
            }
        }
    );
}

// ======================================================
// CARREGAR VEÍCULOS
// ======================================================
async function carregarVeiculos() {
    const tabela =
        document.getElementById(
            "listaVeiculos"
        );

    if (!tabela) return;

    try {
        const resposta =
            await fetch("/veiculos");

        if (!resposta.ok) {
            throw new Error(
                "Erro ao carregar veículos."
            );
        }

        veiculos =
            await resposta.json();

        // Exibe respeitando o filtro atual
        filtrarVeiculos();

    } catch (erro) {

        console.error(erro);

        tabela.innerHTML = `
            <tr>
                <td colspan="6"
                    class="text-center text-danger">
                    Erro ao carregar dados.
                </td>
            </tr>
        `;
    }
}

// ======================================================
// EXIBIR VEÍCULOS
// ======================================================
function exibirVeiculos(lista) {
    const tabela =
        document.getElementById(
            "listaVeiculos"
        );

    if (!tabela) return;

    tabela.innerHTML = "";

    if (!lista || lista.length === 0) {
        tabela.innerHTML = `
            <tr>
                <td colspan="6"
                    class="text-center text-muted">
                    Nenhum veículo encontrado.
                </td>
            </tr>
        `;

        return;
    }

    lista.forEach(veic => {

        const linha =
            document.createElement("tr");

        linha.innerHTML = `
            <td>
                ${veic.id}
            </td>

            <td class="fw-bold">
                ${veic.placa}
            </td>

            <td>
                ${veic.marca}
                ${veic.modelo}
            </td>

            <td>
                ${veic.ano}
            </td>

            <td>
                ${veic.cliente_nome || "N/A"}
            </td>

            <td class="text-end">

                <button type="button"
                        class="btn btn-warning btn-sm me-1"
                        onclick="alterarVeiculo(${veic.id})">
                    <i class="fa-solid fa-pen"></i>
                </button>

                <button type="button"
                        class="btn btn-danger btn-sm"
                        onclick="excluirVeiculo(
                            ${veic.id},
                            '${veic.placa}'
                        )">
                    <i class="fa-solid fa-trash"></i>
                </button>

            </td>
        `;

        tabela.appendChild(linha);
    });
}

// ======================================================
// FILTRAGEM EM TEMPO REAL
// ======================================================
function filtrarVeiculos() {

    const campoElemento =
        document.getElementById(
            "campoFiltro"
        );

    const textoElemento =
        document.getElementById(
            "textoFiltro"
        );

    if (!campoElemento || !textoElemento) {
        exibirVeiculos(veiculos);
        return;
    }

    const campo =
        campoElemento.value;

    const texto =
        textoElemento.value
            .toLowerCase()
            .trim();

    if (texto === "") {
        exibirVeiculos(veiculos);
        return;
    }

    const filtrados =
        veiculos.filter(veic => {

            const valor =
                veic[campo];

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

    exibirVeiculos(filtrados);
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
            filtrarVeiculos
        );
    }

    if (campoFiltro) {
        campoFiltro.addEventListener(
            "change",
            filtrarVeiculos
        );
    }

    if (btnLimpar) {
        btnLimpar.addEventListener(
            "click",
            function () {

                if (textoFiltro) {
                    textoFiltro.value = "";
                }

                exibirVeiculos(
                    veiculos
                );
            }
        );
    }
}

// ======================================================
// ALTERAR VEÍCULO
// ======================================================
function alterarVeiculo(id) {
    window.location.href =
        `/cadastro-veiculo?id=${id}`;
}

// ======================================================
// EXCLUIR VEÍCULO
// ======================================================
async function excluirVeiculo(
    id,
    placa
) {
    if (
        !confirm(
            `Deseja excluir o veículo de placa ${placa}?`
        )
    ) {
        return;
    }

    try {
        const resposta =
            await fetch(
                `/veiculos/${id}`,
                {
                    method: "DELETE"
                }
            );

        if (resposta.ok) {
            alert(
                "Veículo excluído com sucesso!"
            );

            await carregarVeiculos();

        } else {
            alert(
                "Erro ao excluir veículo."
            );
        }

    } catch (erro) {
        alert(
            "Erro de conexão."
        );
    }
}

// ======================================================
// INICIALIZAÇÃO
// ======================================================
document.addEventListener(
    "DOMContentLoaded",
    () => {
        inicializarFiltros();
        carregarVeiculos();
    }
);