(() => {
  const TEXT = {
    aluno: {
      title: "Treino baseado em evidências científicas",
      body: "A IA considera recuperação muscular, volume e frequência semanal, sobreposição entre grupos musculares, ordem dos exercícios, nível de experiência, limitações e segurança. As regras seguem recomendações atuais do ACSM e da IUSCA, além de revisões sistemáticas sobre treinamento resistido."
    },
    personal: {
      title: "Fundamentos usados pela IA",
      body: "A proposta é gerada e validada com base em recuperação muscular, volume, frequência, sobreposição de fadiga, ordem dos exercícios, experiência, limitações e segurança, conforme recomendações atuais do ACSM e da IUSCA e revisões sistemáticas sobre treinamento resistido. Você pode editar todo o treino antes de salvar."
    }
  };

  function criarAviso(tipo) {
    const box = document.createElement("div");
    box.dataset.abodyScientificNotice = tipo;
    box.style.cssText = [
      "background:#0d2218",
      "border:1px solid #244c38",
      "border-radius:12px",
      "padding:12px 14px",
      "margin:0 0 18px",
      "font-family:inherit",
      "line-height:1.45"
    ].join(";");

    const title = document.createElement("div");
    title.textContent = "✓ " + TEXT[tipo].title;
    title.style.cssText = "font-size:12px;font-weight:800;color:#6ee7a8;margin-bottom:5px";

    const body = document.createElement("div");
    body.textContent = TEXT[tipo].body;
    body.style.cssText = "font-size:11px;color:#9ab7a7";

    box.append(title, body);
    return box;
  }

  function encontrarTitulo(texto) {
    return [...document.querySelectorAll("h1,h2")]
      .find(el => (el.textContent || "").trim().toLowerCase() === texto.toLowerCase());
  }

  function aplicar() {
    const tituloDados = encontrarTitulo("Dados pessoais");
    if (tituloDados && !document.querySelector('[data-abody-scientific-notice="aluno"]')) {
      tituloDados.insertAdjacentElement("afterend", criarAviso("aluno"));
    }

    const buttons = [...document.querySelectorAll("button")];
    const personal = buttons.find(b => /^\s*(✨\s*)?gerar treino\s*$/i.test((b.textContent || "").trim()));
    if (personal && !document.querySelector('[data-abody-scientific-notice="personal"]')) {
      personal.parentElement?.insertBefore(criarAviso("personal"), personal);
    }
  }

  const observer = new MutationObserver(aplicar);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener("DOMContentLoaded", aplicar);
  aplicar();
})();