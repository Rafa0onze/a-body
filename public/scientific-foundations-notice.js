(() => {
  const TEXT = {
    aluno: {
      title: "Fundamentos usados pela IA",
      body: "A geração considera recuperação muscular, volume e frequência semanal, sobreposição entre grupos musculares, ordem dos exercícios, nível de experiência, limitações e segurança. As regras seguem recomendações atuais do ACSM e da IUSCA e revisões sistemáticas sobre treinamento resistido."
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
      "margin:12px 0 4px",
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

  function aplicar() {
    const buttons = [...document.querySelectorAll("button")];

    const aluno = buttons.find(b => /gerar meu plano/i.test(b.textContent || ""));
    if (aluno && !document.querySelector('[data-abody-scientific-notice="aluno"]')) {
      aluno.parentElement?.insertBefore(criarAviso("aluno"), aluno);
    }

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
