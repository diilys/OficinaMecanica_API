window.Auth = {
    usuario: null,

    async me() {
        if (this.usuario) return this.usuario;
        const resposta = await fetch('/me', { credentials: 'same-origin' });
        if (!resposta.ok) return null;
        this.usuario = await resposta.json();
        return this.usuario;
    },

    async exigir(papeis = []) {
        const usuario = await this.me();
        if (!usuario) {
            window.location.replace('/login');
            return null;
        }
        if (papeis.length && !papeis.includes(usuario.nivel)) {
            window.location.replace('/');
            return null;
        }
        return usuario;
    },

    async sair() {
        try {
            await fetch('/logout', { method: 'POST', credentials: 'same-origin' });
        } finally {
            localStorage.removeItem('usuarioLogado');
            this.usuario = null;
            window.location.replace('/');
        }
    }
};
