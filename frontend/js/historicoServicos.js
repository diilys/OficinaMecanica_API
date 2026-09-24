const hj = async (resposta) => {
    const dados = await resposta.json().catch(() => ({}));
    if (!resposta.ok) throw new Error(dados.detail || 'Erro.');
    return dados;
};
let historico = [];
let usuarioHistorico = null;
const hm = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

async function carregarHistorico() {
    usuarioHistorico = await Auth.exigir(['cliente']);
    if (!usuarioHistorico) return;
    historico = await hj(await fetch(`/clientes/${usuarioHistorico.id}/ordens-servico`));
    filtrarHistorico();
}

function filtrarHistorico() {
    const status = document.getElementById('filtroHistoricoStatus').value;
    const texto = document.getElementById('filtroHistoricoTexto').value.toLowerCase();
    const lista = historico.filter(o =>
        (!status || o.status === status) &&
        `${o.veiculo_placa} ${o.veiculo_modelo} ${o.descricao}`.toLowerCase().includes(texto)
    );
    document.getElementById('listaHistorico').innerHTML = lista.map(o => `
        <div class="col-12"><div class="card shadow-sm border-0"><div class="card-body">
            <div class="d-flex justify-content-between">
                <div>
                    <h5 class="fw-bold mb-1">OS #${o.id} - ${o.veiculo_modelo} (${o.veiculo_placa})</h5>
                    <p class="mb-1">${o.descricao}</p>
                    <small class="text-muted">Aberta em ${new Date(o.data_abertura).toLocaleString('pt-BR')}</small>
                </div>
                <div class="text-end">
                    <span class="badge ${o.status === 'concluida' ? 'bg-success' : 'bg-warning text-dark'}">${o.status === 'concluida' ? 'Concluída' : 'Em andamento'}</span>
                    <div class="fw-bold mt-2">${hm(o.valor_total)}</div>
                </div>
            </div>
        </div></div></div>`).join('') || '<div class="empty-state">Nenhum serviço em andamento ou concluído.</div>';
}

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('filtroHistoricoStatus')?.addEventListener('change', filtrarHistorico);
    document.getElementById('filtroHistoricoTexto')?.addEventListener('input', filtrarHistorico);
    await carregarHistorico();
});
