document.addEventListener(
    "DOMContentLoaded",
    async () => {

        /*
         * A autenticação NÃO é feita por localStorage.
         *
         * Auth.exigir() chama /me.
         *
         * O backend valida:
         *
         * cookie
         *   ↓
         * token da sessão
         *   ↓
         * tabela sessao
         *   ↓
         * usuário
         *   ↓
         * tipo = admin
         */

        const usuario =
            await Auth.exigir([
                "admin"
            ]);


        if (!usuario) {
            return;
        }


        const elementoNome =
            document.getElementById(
                "nome-usuario"
            );


        if (elementoNome) {

            elementoNome.textContent =
                `Olá, ${usuario.nome}`;
        }


        const btnSair =
            document.getElementById(
                "btn-sair-admin"
            );


        if (btnSair) {

            btnSair.addEventListener(
                "click",
                async () => {

                    await Auth.sair();
                }
            );
        }
    }
);
