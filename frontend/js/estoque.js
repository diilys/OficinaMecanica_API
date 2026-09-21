const formularioEstoque = document.getElementById("form-estoque");
const mensagemEstoque = document.getElementById("mensagemEstoque");

const parametrosEstoque = new URLSearchParams(window.location.search);
const idEstoque = parametrosEstoque.get("id");

let itensEstoque = [];


// ======================================================
// CADASTRAR OU ALTERAR ITEM DO ESTOQUE
// ======================================================
if (formularioEstoque) {

    formularioEstoque.addEventListener("submit", async function (evento) {

        evento.preventDefault();

        if (mensagemEstoque) {
            mensagemEstoque.textContent = "";
        }

        const id = document.getElementById("estoque_id").value;

        const item = {
            nome: document.getElementById("nome_peca").value,
            quantidade: parseInt(
                document.getElementById("quantidade").value,
                10
            ),
            preco: parseFloat(
                document.getElementById("preco").value
            )
        };

        try {

            let resposta;

            // ALTERAR
            if (id) {

                resposta = await fetch(`/estoque/${id}`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(item)
                });

            }

            // CADASTRAR
            else {

                resposta = await fetch("/estoque", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(item)
                });

            }

            const resultado = await resposta.json();

            if (resposta.ok) {

                if (id) {
                    alert("Peça alterada com sucesso!");
                } else {
                    alert("Peça cadastrada com sucesso!");
                }

                // Depois de salvar, volta para a lista
                window.location.href = "/painel-estoque";

            } else {

                if (mensagemEstoque) {

                    mensagemEstoque.textContent =
                        "Erro: " +
                        (
                            resultado.detail ||
                            "Erro ao salvar item."
                        );

                }
            }

        } catch (erro) {

            console.error("Erro:", erro);

            if (mensagemEstoque) {
                mensagemEstoque.textContent =
                    "Não foi possível conectar ao servidor.";
            }
        }
    });
}


// ======================================================
// CARREGAR ITEM PARA ALTERAÇÃO
// ======================================================
async function carregarItemParaAlteracao() {

    // Se não existe ID na URL,
    // significa que é um cadastro novo.
    if (!idEstoque) {
        configurarFormularioNovo();
        return;
    }

    try {

        const resposta = await fetch("/estoque");

        if (!resposta.ok) {
            throw new Error(
                "Erro ao carregar estoque."
            );
        }

        const itens = await resposta.json();

        const item = itens.find(
            item => String(item.id) === String(idEstoque)
        );

        if (!item) {

            if (mensagemEstoque) {
                mensagemEstoque.textContent =
                    "Peça não encontrada.";
            }

            return;
        }

        // Guarda o ID no campo hidden
        document.getElementById("estoque_id").value =
            item.id;

        // Preenche o formulário
        document.getElementById("nome_peca").value =
            item.nome || "";

        document.getElementById("quantidade").value =
            item.quantidade ?? 0;

        document.getElementById("preco").value =
            item.preco ?? 0;

        // Altera título
        const titulo =
            document.getElementById("modalEstoqueTitulo");

        if (titulo) {
            titulo.textContent =
                "Alterar Peça";
        }

        // Altera texto do botão
        const botao =
            document.getElementById("btnSalvarEstoque");

        if (botao) {
            botao.textContent =
                "Salvar Alterações";
        }

    } catch (erro) {

        console.error(
            "Erro ao carregar item:",
            erro
        );

        if (mensagemEstoque) {
            mensagemEstoque.textContent =
                "Erro ao carregar os dados da peça.";
        }
    }
}


// ======================================================
// CONFIGURAR FORMULÁRIO PARA NOVO CADASTRO
// ======================================================
function configurarFormularioNovo() {

    const campoId =
        document.getElementById("estoque_id");

    if (campoId) {
        campoId.value = "";
    }

    const titulo =
        document.getElementById("modalEstoqueTitulo");

    if (titulo) {
        titulo.textContent =
            "Cadastrar Peça";
    }

    const botao =
        document.getElementById("btnSalvarEstoque");

    if (botao) {
        botao.textContent =
            "Salvar Item";
    }
}


// ======================================================
// LIMPAR FORMULÁRIO
// ======================================================
function limparFormularioEstoque() {

    if (!formularioEstoque) {
        return;
    }

    formularioEstoque.reset();

    const campoId =
        document.getElementById("estoque_id");

    if (campoId) {
        campoId.value = "";
    }

    configurarFormularioNovo();

    if (mensagemEstoque) {
        mensagemEstoque.textContent = "";
    }
}


// ======================================================
// CARREGAR ESTOQUE
// ======================================================
async function carregarEstoque() {

    const tabela =
        document.getElementById("listaEstoque");

    if (!tabela) {
        return;
    }

    try {

        const resposta =
            await fetch("/estoque");

        if (!resposta.ok) {
            throw new Error(
                "Erro ao buscar itens do estoque."
            );
        }

        itensEstoque =
            await resposta.json();

        filtrarEstoque();

    } catch (erro) {

        console.error(erro);

        tabela.innerHTML = `
            <tr>
                <td colspan="5"
                    class="text-center text-danger">
                    Erro ao carregar o estoque.
                </td>
            </tr>
        `;
    }
}


// ======================================================
// EXIBIR ESTOQUE
// ======================================================
function exibirEstoque(lista) {

    const tabela =
        document.getElementById("listaEstoque");

    if (!tabela) {
        return;
    }

    tabela.innerHTML = "";

    if (!lista || lista.length === 0) {

        tabela.innerHTML = `
            <tr>
                <td colspan="5"
                    class="text-center text-muted">
                    Nenhum item encontrado no estoque.
                </td>
            </tr>
        `;

        return;
    }

    lista.forEach(item => {

        const linha =
            document.createElement("tr");

        linha.innerHTML = `
            <td>${item.id}</td>

            <td class="fw-bold">
                ${item.nome}
            </td>

            <td>
                ${item.quantidade}
            </td>

            <td>
                R$ ${Number(
                    item.preco || 0
                ).toFixed(2)}
            </td>

            <td>

                <button
                    type="button"
                    class="btn btn-warning btn-sm"
                    onclick="editarItemEstoque(${item.id})">

                    ✏️ Alterar

                </button>

                <button
                    type="button"
                    class="btn btn-danger btn-sm"
                    onclick="excluirItemEstoque(
                        ${item.id},
                        '${String(item.nome || "")
                            .replace(/'/g, "\\'")}'
                    )">

                    🗑️ Excluir

                </button>

            </td>
        `;

        tabela.appendChild(linha);
    });
}


// ======================================================
// FILTRAR ESTOQUE
// ======================================================
function filtrarEstoque() {

    const campoFiltro =
        document.getElementById("campoFiltro");

    const textoFiltro =
        document.getElementById("textoFiltro");

    if (!campoFiltro || !textoFiltro) {

        exibirEstoque(itensEstoque);

        return;
    }

    const campo =
        campoFiltro.value;

    const texto =
        textoFiltro.value
            .toLowerCase()
            .trim();

    if (texto === "") {

        exibirEstoque(itensEstoque);

        return;
    }

    const filtrados =
        itensEstoque.filter(item => {

            const valor =
                item[campo];

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

    exibirEstoque(filtrados);
}


// ======================================================
// INICIALIZAR FILTROS
// ======================================================
function inicializarFiltros() {

    const textoFiltro =
        document.getElementById("textoFiltro");

    const campoFiltro =
        document.getElementById("campoFiltro");

    const btnLimpar =
        document.getElementById("btnLimparFiltro");

    if (textoFiltro) {

        textoFiltro.addEventListener(
            "input",
            filtrarEstoque
        );

    }

    if (campoFiltro) {

        campoFiltro.addEventListener(
            "change",
            filtrarEstoque
        );

    }

    if (btnLimpar) {

        btnLimpar.addEventListener(
            "click",
            function () {

                if (textoFiltro) {
                    textoFiltro.value = "";
                }

                exibirEstoque(
                    itensEstoque
                );
            }
        );

    }
}


// ======================================================
// ALTERAR ITEM
// ======================================================
function editarItemEstoque(id) {

    window.location.href =
        `/cadastro-estoque?id=${id}`;
}


// ======================================================
// EXCLUIR ITEM
// ======================================================
async function excluirItemEstoque(id, nome) {

    if (
        !confirm(
            `Deseja realmente remover '${nome}' do estoque?`
        )
    ) {
        return;
    }

    try {

        const resposta =
            await fetch(
                `/estoque/${id}`,
                {
                    method: "DELETE"
                }
            );

        if (resposta.ok) {

            alert(
                "Item excluído com sucesso!"
            );

            await carregarEstoque();

        } else {

            const resultado =
                await resposta.json();

            alert(
                "Erro: " +
                (
                    resultado.detail ||
                    "Não foi possível excluir o item."
                )
            );
        }

    } catch (erro) {

        console.error(erro);

        alert(
            "Erro de conexão ao excluir."
        );
    }
}


// ======================================================
// INICIALIZAÇÃO
// ======================================================
document.addEventListener(
    "DOMContentLoaded",
    function () {

        // Se estamos na página de cadastro/alteração
        if (formularioEstoque) {

            carregarItemParaAlteracao();

        }

        // Se estamos na página de lista
        if (
            document.getElementById("listaEstoque")
        ) {

            inicializarFiltros();

            carregarEstoque();

        }
    }
);