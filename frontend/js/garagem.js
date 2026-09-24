const gj = async (resposta) => {
    const dados = await resposta.json().catch(() => ({}));
    if (!resposta.ok) throw new Error(dados.detail || 'Erro na operação.');
    return dados;
};

let usuario = null;
let garagem = [];

const el = (id) => document.getElementById(id);

async function carregarGaragem() {
    usuario = await Auth.exigir(['cliente']);
    if (!usuario) return;

    garagem = await gj(await fetch(`/clientes/${usuario.id}/veiculos`));
    const lista = el('listaGaragem');
    lista.innerHTML = garagem.map(v => `
        <tr>
            <td class="fw-bold">${v.placa}</td>
            <td>${v.marca}</td>
            <td>${v.modelo}</td>
            <td>${v.ano}</td>
            <td class="text-end">
                <button class="btn btn-warning btn-sm" data-editar="${v.id}"><i class="fa fa-pen"></i></button>
                <button class="btn btn-danger btn-sm" data-excluir="${v.id}"><i class="fa fa-trash"></i></button>
            </td>
        </tr>`).join('') || '<tr><td colspan="5" class="empty-state">Nenhum veículo cadastrado.</td></tr>';

    lista.querySelectorAll('[data-editar]').forEach(btn => btn.addEventListener('click', () => editarGaragem(Number(btn.dataset.editar))));
    lista.querySelectorAll('[data-excluir]').forEach(btn => btn.addEventListener('click', () => excluirGaragem(Number(btn.dataset.excluir))));
}

function abrirForm() {
    el('formGaragemWrapper').classList.remove('d-none');
    el('garagem_placa').focus();
}

function limparForm() {
    el('form-garagem').reset();
    el('garagem_veiculo_id').value = '';
    el('tituloGaragemForm').textContent = 'Novo veículo';
    el('mensagemGaragem').textContent = '';
    el('formGaragemWrapper').classList.add('d-none');
}

function editarGaragem(id) {
    const v = garagem.find(x => x.id === id);
    if (!v) return;
    abrirForm();
    el('garagem_veiculo_id').value = v.id;
    el('garagem_placa').value = v.placa;
    el('garagem_marca').value = v.marca;
    el('garagem_modelo').value = v.modelo;
    el('garagem_ano').value = v.ano;
    el('tituloGaragemForm').textContent = 'Alterar veículo';
}

async function excluirGaragem(id) {
    if (!confirm('Excluir este veículo? Isso só será permitido se ele não possuir histórico.')) return;
    try {
        await gj(await fetch(`/veiculos/${id}`, { method: 'DELETE' }));
        await carregarGaragem();
    } catch (erro) {
        alert(erro.message);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    el('btnNovoVeiculoCliente')?.addEventListener('click', abrirForm);
    el('btnCancelarGaragem')?.addEventListener('click', limparForm);

    el('form-garagem')?.addEventListener('submit', async (evento) => {
        evento.preventDefault();
        const id = el('garagem_veiculo_id').value;
        const body = {
            placa: el('garagem_placa').value.trim().toUpperCase(),
            marca: el('garagem_marca').value.trim(),
            modelo: el('garagem_modelo').value.trim(),
            ano: Number(el('garagem_ano').value),
            cliente_id: usuario.id
        };

        try {
            await gj(await fetch(id ? `/veiculos/${id}` : '/veiculos', {
                method: id ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            }));
            limparForm();
            await carregarGaragem();
        } catch (erro) {
            el('mensagemGaragem').className = 'mt-3 text-danger';
            el('mensagemGaragem').textContent = erro.message;
        }
    });

    await carregarGaragem();
});
