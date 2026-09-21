const formulario = document.getElementById("form-veiculo");
const mensagem = document.getElementById("mensagem");

const parametros = new URLSearchParams(window.location.search);
const veiculoId = parametros.get("id");

if (formulario) {
    formulario.addEventListener("submit", async function (evento) {
        evento.preventDefault();
        mensagem.textContent = "";

        const veiculo = {
            placa: document.getElementById("placa").value,
            marca: document.getElementById("marca").value,
            modelo: document.getElementById("modelo").value,
            ano: parseInt(document.getElementById("ano").value),
            cliente_id: parseInt(document.getElementById("cliente_id").value)
        };

        try {
            let resposta;
            if (veiculoId) {
                resposta = await fetch(`/veiculos/${veiculoId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(veiculo)
                });
            } else {
                resposta = await fetch("/veiculos", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(veiculo)
                });
            }

            const resultado = await resposta.json();

            if (resposta.ok) {
                if (veiculoId) {
                    mensagem.textContent = "Veículo alterado com sucesso!";
                } else {
                    mensagem.textContent = "Veículo cadastrado com sucesso!";
                    formulario.reset();
                }
            } else {
                mensagem.textContent = "Erro: " + (resultado.detail || "Dados inválidos.");
            }
        } catch (erro) {
            mensagem.textContent = "Não foi possível conectar ao servidor.";
        }
    });
}

async function carregarVeiculos() {
    const tabela = document.getElementById("listaVeiculos");
    if (!tabela) return;

    try {
        const resposta = await fetch("/veiculos");
        if (!resposta.ok) throw new Error("Erro ao buscar veículos.");
        
        const veiculos = await resposta.json();
        
        tabela.innerHTML = "";
        veiculos.forEach(v => {
            const linha = document.createElement("tr");
            linha.innerHTML = `
                <td>${v.id}</td>
                <td>${v.placa}</td>
                <td>${v.marca} / ${v.modelo}</td>
                <td>${v.ano}</td>
                <td>${v.cliente_id}</td>
                <td>
                    <button class="btn btn-warning btn-sm" onclick="window.location.href='/frontend/cadastroVeiculo.html?id=${v.id}'">✏️</button>
                    <button class="btn btn-danger btn-sm" onclick="excluirVeiculo(${v.id}, '${v.placa}')">🗑️</button>
                </td>
            `;
            tabela.appendChild(linha);
        });
    } catch (erro) {
        tabela.innerHTML = `<tr><td colspan="6">Erro ao carregar veículos.</td></tr>`;
    }
}

async function carregarVeiculoParaAlteracao() {
    if (!veiculoId || !formulario) return;

    try {
        const resposta = await fetch(`/veiculos`);
        const veiculos = await resposta.json();
        const veiculo = veiculos.find(v => v.id == veiculoId);

        if (!veiculo) return (mensagem.textContent = "Veículo não encontrado.");

        document.getElementById("placa").value = veiculo.placa;
        document.getElementById("marca").value = veiculo.marca;
        document.getElementById("modelo").value = veiculo.modelo;
        document.getElementById("ano").value = veiculo.ano;
        document.getElementById("cliente_id").value = veiculo.cliente_id;
        
        document.getElementById("tituloFormulario").textContent = "Alterar Veículo";
        document.getElementById("btnSalvar").textContent = "Salvar alterações";
    } catch (erro) {
        mensagem.textContent = "Erro ao carregar os dados.";
    }
}

async function excluirVeiculo(id, placa) {
    if (!confirm(`Excluir o veículo de placa ${placa}?`)) return;

    try {
        const resposta = await fetch(`/veiculos/${id}`, { method: "DELETE" });
        if (resposta.ok) {
            alert("Excluído com sucesso!");
            carregarVeiculos();
        } else {
            const resultado = await resposta.json();
            alert("Erro: " + (resultado.detail || "Erro desconhecido."));
        }
    } catch (erro) {
        alert("Erro de conexão.");
    }
}

carregarVeiculos();
carregarVeiculoParaAlteracao();
