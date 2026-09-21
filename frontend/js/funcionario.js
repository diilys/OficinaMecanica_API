const formulario = document.getElementById("form-funcionario");
const mensagem = document.getElementById("mensagem");

const parametros = new URLSearchParams(window.location.search);
const funcionarioId = parametros.get("id");

if (formulario) {
    formulario.addEventListener("submit", async function (evento) {
        evento.preventDefault();
        mensagem.textContent = "";

        const funcionario = {
            nome: document.getElementById("nome").value,
            cpf: document.getElementById("cpf").value,
            telefone: document.getElementById("telefone").value || null,
            estado_civil: document.getElementById("estado_civil").value || null,
            endereco: document.getElementById("endereco").value || null,
            cargo: document.getElementById("cargo").value || null,
            email: document.getElementById("email").value,
            senha: document.getElementById("senha").value
        };

        try {
            let resposta;
            if (funcionarioId) {
                resposta = await fetch(`/funcionarios/${funcionarioId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(funcionario)
                });
            } else {
                resposta = await fetch("/funcionarios", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(funcionario)
                });
            }

            const resultado = await resposta.json();

            if (resposta.ok) {
                if (funcionarioId) {
                    mensagem.textContent = "Funcionário alterado com sucesso!";
                } else {
                    mensagem.textContent = "Funcionário cadastrado com sucesso!";
                    formulario.reset();
                }
            } else {
                mensagem.textContent = "Erro: " + obterMensagemErro(resultado);
            }
        } catch (erro) {
            mensagem.textContent = "Não foi possível conectar ao servidor.";
        }
    });
}

function obterMensagemErro(resultado) {
    if (!resultado.detail) return "Dados inválidos.";
    if (Array.isArray(resultado.detail)) {
        return resultado.detail.map(erro => erro.msg).join(" ");
    }
    return resultado.detail;
}

async function carregarFuncionarios() {
    const tabela = document.getElementById("listaFuncionarios");
    if (!tabela) return;

    try {
        const resposta = await fetch("/funcionarios");
        if (!resposta.ok) throw new Error("Erro ao buscar funcionários.");
        
        const funcionarios = await resposta.json();
        exibirFuncionarios(funcionarios);
    } catch (erro) {
        tabela.innerHTML = `<tr><td colspan="7">Erro ao carregar funcionários.</td></tr>`;
    }
}

function exibirFuncionarios(lista) {
    const tabela = document.getElementById("listaFuncionarios");
    if (!tabela) return;

    tabela.innerHTML = "";
    lista.forEach(f => {
        const linha = document.createElement("tr");
        linha.innerHTML = `
            <td>${f.id}</td>
            <td>${f.nome}</td>
            <td>${f.cargo || '-'}</td>
            <td>${f.cpf}</td>
            <td>${f.email}</td>
            <td>
                <button type="button" class="btn btn-warning btn-sm" onclick="alterarFuncionario(${f.id})">✏️</button>
            </td>
            <td>
                <button type="button" class="btn btn-danger btn-sm" onclick="excluirFuncionario(${f.id}, '${f.nome}')">🗑️</button>
            </td>
        `;
        tabela.appendChild(linha);
    });
}

function alterarFuncionario(id) {
    window.location.href = `/frontend/cadastroFuncionario.html?id=${id}`;
}

async function carregarFuncionarioParaAlteracao() {
    if (!funcionarioId || !formulario) return;

    try {
        const resposta = await fetch(`/funcionarios`);
        if (!resposta.ok) throw new Error("Erro ao buscar funcionários.");
        
        const funcionarios = await resposta.json();
        const func = funcionarios.find(f => f.id == funcionarioId);

        if (!func) {
            mensagem.textContent = "Funcionário não encontrado.";
            return;
        }

        document.getElementById("nome").value = func.nome;
        document.getElementById("cpf").value = func.cpf;
        document.getElementById("telefone").value = func.telefone || "";
        document.getElementById("estado_civil").value = func.estado_civil || "";
        document.getElementById("endereco").value = func.endereco || "";
        document.getElementById("cargo").value = func.cargo || "";
        document.getElementById("email").value = func.email;
        
        document.getElementById("tituloFormulario").textContent = "Alterar Funcionário";
        document.getElementById("btnSalvar").textContent = "Salvar alterações";
    } catch (erro) {
        mensagem.textContent = "Não foi possível carregar os dados.";
    }
}

async function excluirFuncionario(id, nome) {
    if (!confirm(`Deseja excluir o funcionário ${nome}?`)) return;

    try {
        const resposta = await fetch(`/funcionarios/${id}`, { method: "DELETE" });
        const resultado = await resposta.json();
        
        if (resposta.ok) {
            alert("Excluído com sucesso!");
            carregarFuncionarios();
        } else {
            alert("Erro: " + obterMensagemErro(resultado));
        }
    } catch (erro) {
        alert("Erro de conexão.");
    }
}

carregarFuncionarios();
carregarFuncionarioParaAlteracao();