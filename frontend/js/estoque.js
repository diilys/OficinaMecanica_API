const formularioEstoque = document.getElementById("form-estoque");
const mensagemEstoque = document.getElementById("mensagemEstoque");

if (formularioEstoque) {
    formularioEstoque.addEventListener("submit", async function (evento) {
        evento.preventDefault();
        mensagemEstoque.textContent = "";

        const id = document.getElementById("estoque_id").value;
        const item = {
            nome: document.getElementById("nome_peca").value,
            quantidade: parseInt(document.getElementById("quantidade").value),
            preco: parseFloat(document.getElementById("preco").value)
        };

        try {
            let resposta;
            if (id) {
                resposta = await fetch(`/estoque/${id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(item)
                });
            } else {
                resposta = await fetch("/estoque", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(item)
                });
            }

            const resultado = await resposta.json();

            if (resposta.ok) {
                const modalElement = document.getElementById('modalItemEstoque');
                const modal = bootstrap.Modal.getInstance(modalElement);
                if (modal) modal.hide();
                limparFormularioEstoque();
                carregarEstoque();
            } else {
                mensagemEstoque.textContent = "Erro: " + (resultado.detail || "Erro ao salvar item.");
            }
        } catch (erro) {
            mensagemEstoque.textContent = "Não foi possível conectar ao servidor.";
        }
    });
}

function limparFormularioEstoque() {
    if (!formularioEstoque) return;
    formularioEstoque.reset();
    document.getElementById("estoque_id").value = "";
    document.getElementById("modalEstoqueTitulo").textContent = "Cadastrar Peça";
    document.getElementById("btnSalvarEstoque").textContent = "Salvar";
    mensagemEstoque.textContent = "";
}

async function carregarEstoque() {
    const tabela = document.getElementById("listaEstoque");
    if (!tabela) return;

    try {
        const resposta = await fetch("/estoque");
        if (!resposta.ok) throw new Error("Erro ao buscar itens do estoque.");

        const itens = await resposta.json();
        exibirEstoque(itens);
    } catch (erro) {
        tabela.innerHTML = `<tr><td colspan="5">Erro ao carregar o estoque.</td></tr>`;
    }
}

function exibirEstoque(lista) {
    const tabela = document.getElementById("listaEstoque");
    if (!tabela) return;

    tabela.innerHTML = "";
    lista.forEach(item => {
        const linha = document.createElement("tr");
        linha.innerHTML = `
            <td>${item.id}</td>
            <td>${item.nome}</td>
            <td>${item.quantidade}</td>
            <td>R$ ${Number(item.preco).toFixed(2)}</td>
            <td>
                <button type="button" class="btn btn-warning btn-sm" onclick="editarItemEstoque(${item.id}, '${item.nome}', ${item.quantidade}, ${item.preco})">✏️ Alterar</button>
                <button type="button" class="btn btn-danger btn-sm" onclick="excluirItemEstoque(${item.id}, '${item.nome}')">🗑️ Excluir</button>
            </td>
        `;
        tabela.appendChild(linha);
    });
}

function editarItemEstoque(id, nome, quantidade, preco) {
    document.getElementById("estoque_id").value = id;
    document.getElementById("nome_peca").value = nome;
    document.getElementById("quantidade").value = quantidade;
    document.getElementById("preco").value = preco;

    document.getElementById("modalEstoqueTitulo").textContent = "Alterar Peça";
    document.getElementById("btnSalvarEstoque").textContent = "Salvar Alterações";

    const modal = new bootstrap.Modal(document.getElementById('modalItemEstoque'));
    modal.show();
}

async function excluirItemEstoque(id, nome) {
    if (!confirm(`Deseja realmente remover '${nome}' do estoque?`)) return;

    try {
        const resposta = await fetch(`/estoque/${id}`, { method: "DELETE" });
        if (resposta.ok) {
            alert("Item excluído com sucesso!");
            carregarEstoque();
        } else {
            const resultado = await resposta.json();
            alert("Erro: " + (resultado.detail || "Não foi possível excluir o item."));
        }
    } catch (erro) {
        alert("Erro de conexão ao excluir.");
    }
}

carregarEstoque();