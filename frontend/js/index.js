async function toggleSidebar() {
    document.getElementById('sidebar-lateral')?.classList.toggle('aberta');
}

async function sair() {
    await Auth.sair();
}

async function verificarLoginEAgendar() {
    const usuario = await Auth.me();
    if (!usuario) {
        window.location.href = '/login';
        return;
    }
    if (usuario.nivel === 'cliente') {
        window.location.href = '/agendamento';
        return;
    }
    alert('O agendamento pelo portal é destinado a clientes.');
}

function cardMenu(href, icone, titulo, texto) {
    return `
        <a class="sidebar-card" href="${href}">
            <div class="d-flex gap-3 align-items-start">
                <i class="fa-solid ${icone} fs-4 mt-1"></i>
                <div>
                    <div class="fw-bold">${titulo}</div>
                    <div class="small text-muted">${texto}</div>
                </div>
            </div>
        </a>`;
}

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('btn-toggle-menu')?.addEventListener('click', toggleSidebar);
    document.getElementById('btn-agendar-agora')?.addEventListener('click', verificarLoginEAgendar);

    const usuario = await Auth.me();
    const area = document.getElementById('area-auth');
    const menu = document.getElementById('conteudo-menu-lateral');

    if (usuario && area) {
        area.innerHTML = `
            <div class="d-flex align-items-center gap-2 text-white justify-content-end">
                <span class="fw-semibold small text-truncate user-name-limit">
                    <i class="fa-solid fa-user me-1"></i>${usuario.nome}
                </span>
                <button id="btnSairIndex" class="btn btn-outline-light btn-sm">Sair</button>
            </div>`;
        document.getElementById('btnSairIndex')?.addEventListener('click', sair);
    }

    if (!menu) return;

    if (!usuario) {
        menu.innerHTML =
            cardMenu('/login', 'fa-right-to-bracket', 'Entrar', 'Acesse sua conta.') +
            cardMenu('/cadastro-cliente', 'fa-user-plus', 'Criar conta', 'Cadastre-se como cliente.');
    } else if (usuario.nivel === 'cliente') {
        menu.innerHTML =
            cardMenu('/garagem', 'fa-car', 'Minha garagem', 'Cadastre e gerencie seus veículos.') +
            cardMenu('/historico-servicos', 'fa-clock-rotate-left', 'Histórico de serviços', 'Consulte serviços em andamento e concluídos.') +
            cardMenu('/agendamento', 'fa-calendar-check', 'Agendar atendimento', 'Escolha um veículo e uma data para atendimento.');
    } else if (usuario.nivel === 'admin') {
        menu.innerHTML = cardMenu('/painel-admin', 'fa-screwdriver-wrench', 'Painel administrativo', 'Acesse o gerenciamento da oficina.');
    } else {
        menu.innerHTML = cardMenu('/painel-ordens', 'fa-clipboard-list', 'Ordens de serviço', 'Acompanhe as operações da oficina.');
    }
});
