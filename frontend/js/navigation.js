window.Navigation = {
    voltar(fallback = '/') {
        const referrer = document.referrer;
        if (referrer) {
            try {
                const anterior = new URL(referrer);
                if (anterior.origin === window.location.origin && anterior.href !== window.location.href) {
                    window.history.back();
                    return;
                }
            } catch (_) {}
        }
        if (window.history.length > 1) {
            window.history.back();
            return;
        }
        window.location.href = fallback;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-voltar]').forEach(elemento => {
        elemento.addEventListener('click', evento => {
            evento.preventDefault();
            Navigation.voltar(elemento.dataset.fallback || '/');
        });
    });
});
