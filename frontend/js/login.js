document.getElementById("form-login").addEventListener("submit", async function(e) {
    e.preventDefault();
    const mensagemDiv = document.getElementById("mensagem");
    mensagemDiv.textContent = "";

    const dadosLogin = {
        email: document.getElementById("email").value.trim(),
        senha: document.getElementById("senha").value
    };

    try {
        const resposta = await fetch("/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(dadosLogin)
        });

        const resultado = await resposta.json();

        if (resposta.ok) {
            // Guarda os dados do usuário logado no localStorage
            localStorage.setItem("usuarioLogado", JSON.stringify(resultado));
            
            // Redirecionamento baseado no nível de acesso retornado pela API
            if (resultado.nivel === "admin") {
                window.location.href = "/painel-admin";
            } else if (resultado.nivel === "funcionario") {
                window.location.href = "/frontend/painel-ordens";
            } else {
                window.location.href = "/"; // Redireciona o cliente para a página inicial (index)
            }
        } else {
            mensagemDiv.textContent = resultado.detail || "E-mail ou senha incorretos.";
        }
    } catch (erro) {
        console.error("Erro:", erro);
        mensagemDiv.textContent = "Não foi possível conectar ao servidor.";
    }
});