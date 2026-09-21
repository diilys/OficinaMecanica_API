const formularioEstoque = document.getElementById("form-estoque");
const mensagemEstoque = document.getElementById("mensagemEstoque");

if (formularioEstoque) {
    formularioEstoque.addEventListener("submit", async function (evento) {
        evento.preventDefault();
        if (mensagemEstoque) mensagemEstoque.textContent = "";

        const id = document.getElementById("estoque_id").value;
        const item = {
            nome: document.getElementById("nome_peca").value,
            quantidade: parseInt(document.getElementById("quantidade").value, 10),
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
                if (modalElement) {
                    const modal = bootstrap.Modal.getInstance(modalElement);
                    if (modal) modal.hide();
                }
                limparFormularioEstoque();
                carregarEstoque();
            } else {
                if (mensagemEstoque) mensagemEstoque.textContent = "Erro: " + (resultado.detail || "Erro ao salvar item.");
            }
        } catch (erro) {
            if (mensagemEstoque) mensagemEstoque.textContent = "Não foi possível conectar ao servidor.";
        }
    });
}

function limparFormularioEstoque() {
    if (!formularioEstoque) return;
    formularioEstoque.reset();
    document.getElementById("estoque_id").value = "";
    
    const tituloModal = document.getElementById("modalEstoqueTitulo");
    if (tituloModal) tituloModal.textContent = "Cadastrar Peça";
    
    const btnSalvar = document.getElementById("btnSalvarEstoque");
    if (btnSalvar) btnSalvar.textContent = "Salvar";
    
    if (mensagemEstoque) mensagemEstoque.textContent = "";
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
        tabela.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Erro ao carregar o estoque.</td></tr>`;
    }
}

function exibirEstoque(lista) {
    const tabela = document.getElementById("listaEstoque");
    if (!tabela) return;

    tabela.innerHTML = "";

    if (!lista || lista.length === 0) {
        tabela.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Nenhum item encontrado no estoque.</td></tr>`;
        return;
    }

    lista.forEach(item => {
        const linha = document.createElement("tr");
        const nomeSeguro = item.nome ? item.nome.replace(/'/g, "\\'") : "";

        linha.innerHTML = `
            <td>${item.id}</td>
            <td class="fw-bold">${item.nome}</td>
            <td>${item.quantidade}</td>
            <td>R$ ${Number(item.preco || 0).toFixed(2)}</td>
            <td>
                <button type="button" class="btn btn-warning btn-sm" onclick="editarItemEstoque(${item.id}, '${nomeSeguro}', ${item.quantidade}, ${item.preco})">✏️ Alterar</button>
                <button type="button" class="btn btn-danger btn-sm" onclick="excluirItemEstoque(${item.id}, '${nomeSeguro}')">🗑️ Excluir</button>
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

    const tituloModal = document.getElementById("modalEstoqueTitulo");
    if (tituloModal) tituloModal.textContent = "Alterar Peça";
    
    const btnSalvar = document.getElementById("btnSalvarEstoque");
    if (btnSalvar) btnSalvar.textContent = "Salvar Alterações";

    const modalElement = document.getElementById('modalItemEstoque');
    if (modalElement) {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
    }
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