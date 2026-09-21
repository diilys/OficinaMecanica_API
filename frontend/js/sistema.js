// Controle de Sessão e Autenticação do Painel
document.addEventListener("DOMContentLoaded", () => {
    const usuarioStorage = localStorage.getItem("usuarioLogado");

    if (!usuarioStorage) {
        // Se não estiver logado, redireciona para o login
        window.location.href = "/login";
    } else {
        const usuario = JSON.parse(usuarioStorage);
        const elementoNome = document.getElementById("nome-usuario");
        
        if (elementoNome) {
            elementoNome.textContent = `Olá, ${usuario.nome}`;
        }
        
        // Trava de segurança para garantir acesso restrito a administradores
        if (usuario.nivel !== "admin") {
            alert("Acesso restrito a administradores.");
            window.location.href = "/";
        }
    }
});

// Função de Logout
function sair() {
    localStorage.removeItem("usuarioLogado");
    window.location.href = "/login";
}