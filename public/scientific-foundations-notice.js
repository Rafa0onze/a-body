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
      "background:#f3f8f5",
      "border:1px solid #cfe2d8",
      "border-radius:16px",
      "padding:14px 16px",
      "margin:16px 0 4px",
      "font-family:inherit",
      "line-height:1.45"
    ].join(";");

    const title = document.createElement("div");
    title.textContent = "✓ " + TEXT[tipo].title;
    title.style.cssText = "font-size:13px;font-weight:800;color:#176b49;margin-bottom:5px";

    const body = document.createElement("div");
    body.textContent = TEXT[tipo].body;
    body.style.cssText = "font-size:12px;color:#52675c";

    box.append(title, body);
    return box;
  }

  function lerPlano() {
    try {
      const raw = localStorage.getItem("abody:plan");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed?.weekDays) return parsed;
      if (parsed?.value?.weekDays) return parsed.value;
      if (typeof parsed?.value === "string") {
        const nested = JSON.parse(parsed.value);
        if (nested?.weekDays) return nested;
      }
      return null;
    } catch {
      return null;
    }
  }

  function fecharResumo() {
    document.querySelector('[data-abody-workout-preview="true"]')?.remove();
    document.body.style.overflow = "";
  }

  function abrirResumo(day, botaoOriginal) {
    fecharResumo();
    const exercises = Array.isArray(day.exercises) ? day.exercises : [];
    const totalSets = exercises.reduce((s, ex) => s + (Number(ex.sets) || 0), 0);
    const plano = lerPlano();
    const duracao = plano?.duracao || "";

    const overlay = document.createElement("div");
    overlay.dataset.abodyWorkoutPreview = "true";
    overlay.style.cssText = "position:fixed;inset:0;z-index:10050;background:#071b13;overflow-y:auto;font-family:inherit;color:#ecf5ef";

    const page = document.createElement("div");
    page.style.cssText = "max-width:480px;margin:0 auto;min-height:100%;padding:28px 25px 34px;box-sizing:border-box";

    const top = document.createElement("div");
    top.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:22px";
    const back = document.createElement("button");
    back.textContent = "← Voltar";
    back.style.cssText = "background:none;border:none;color:#48df91;font-size:14px;font-weight:700;padding:0;cursor:pointer";
    back.onclick = fecharResumo;
    const brand = document.createElement("div");
    brand.textContent = "A-BODY";
    brand.style.cssText = "font-size:14px;font-weight:800;letter-spacing:.08em;color:#ecf5ef";
    top.append(back, brand);

    const eyebrow = document.createElement("div");
    eyebrow.textContent = `${day.label || "TREINO"} · RESUMO DO TREINO`;
    eyebrow.style.cssText = "font-size:12px;font-weight:800;letter-spacing:.14em;color:#48df91;margin-bottom:10px";

    const h1 = document.createElement("h1");
    h1.textContent = day.sub || day.label || "Seu treino";
    h1.style.cssText = "font-size:29px;line-height:1.15;margin:0 0 10px;font-weight:850;color:#f2f7f4";

    const intro = document.createElement("p");
    intro.textContent = "Revise a sequência e prepare o primeiro equipamento antes de começar.";
    intro.style.cssText = "font-size:14px;line-height:1.5;color:#9bb7a7;margin:0 0 18px";

    const stats = document.createElement("div");
    stats.style.cssText = "display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:22px";
    const statItems = [
      [String(exercises.length), "exercícios"],
      [String(totalSets), "séries"],
      [duracao ? `~${duracao}` : "—", "tempo"]
    ];
    statItems.forEach(([value, label]) => {
      const item = document.createElement("div");
      item.style.cssText = "background:#0d2a1d;border:1px solid #214a35;border-radius:13px;padding:12px 8px;text-align:center";
      const number = document.createElement("div");
      number.textContent = value;
      number.style.cssText = "font-size:16px;font-weight:850;color:#ecf5ef";
      const caption = document.createElement("div");
      caption.textContent = label;
      caption.style.cssText = "font-size:10px;color:#8fb09d;margin-top:3px;text-transform:uppercase;letter-spacing:.06em";
      item.append(number, caption);
      stats.appendChild(item);
    });

    const section = document.createElement("div");
    section.textContent = "EXERCÍCIOS";
    section.style.cssText = "font-size:11px;font-weight:800;letter-spacing:.12em;color:#9bb7a7;margin-bottom:8px";

    const list = document.createElement("div");
    list.style.cssText = "display:flex;flex-direction:column;gap:8px;margin-bottom:22px";
    exercises.forEach((ex, index) => {
      const row = document.createElement("div");
      row.style.cssText = "display:flex;align-items:center;gap:12px;background:#0d2a1d;border:1px solid #214a35;border-radius:14px;padding:12px 14px";
      const number = document.createElement("div");
      number.textContent = String(index + 1);
      number.style.cssText = "width:28px;height:28px;border-radius:9px;background:#123b29;color:#48df91;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:850;flex-shrink:0";
      const info = document.createElement("div");
      info.style.cssText = "flex:1;min-width:0";
      const name = document.createElement("div");
      name.textContent = ex.name || `Exercício ${index + 1}`;
      name.style.cssText = "font-size:13px;font-weight:750;color:#ecf5ef;line-height:1.35";
      const details = document.createElement("div");
      const reps = ex.iso ? `${ex.isoSec || 45}s` : (ex.reps || "repetições");
      details.textContent = `${ex.sets || 3} séries · ${reps} · descanso ${ex.rest || 60}s`;
      details.style.cssText = "font-size:11px;color:#8fb09d;margin-top:3px";
      info.append(name, details);
      row.append(number, info);
      list.appendChild(row);
    });

    const ready = document.createElement("div");
    ready.textContent = "Comece somente quando estiver com o primeiro equipamento preparado.";
    ready.style.cssText = "background:#0c251a;border:1px solid #214a35;border-radius:12px;padding:11px 13px;font-size:11px;line-height:1.45;color:#9bb7a7;margin-bottom:14px";

    const start = document.createElement("button");
    start.textContent = "▶ Iniciar agora";
    start.style.cssText = "width:100%;background:#267746;border:none;border-radius:14px;padding:16px;color:#06140e;font-size:15px;font-weight:850;cursor:pointer";
    start.onclick = () => {
      fecharResumo();
      botaoOriginal.dataset.abodyPreviewBypass = "true";
      botaoOriginal.click();
      delete botaoOriginal.dataset.abodyPreviewBypass;
    };

    page.append(top, eyebrow, h1, intro, stats, section, list, ready, start);
    overlay.appendChild(page);
    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";
  }

  function aplicarResumoTreino() {
    const plano = lerPlano();
    if (!plano?.weekDays?.length) return;
    const homeHint = [...document.querySelectorAll("p")].find(p => /escolha o treino do dia/i.test(p.textContent || ""));
    if (!homeHint) return;

    const buttons = [...document.querySelectorAll("button")];
    plano.weekDays.forEach(day => {
      const label = String(day.label || "").trim();
      if (!label) return;
      const button = buttons.find(b => {
        const text = (b.textContent || "").trim();
        return text.startsWith(label) && (!day.sub || text.includes(day.sub));
      });
      if (!button || button.dataset.abodyPreviewBound === "true") return;
      button.dataset.abodyPreviewBound = "true";
      button.addEventListener("click", event => {
        if (button.dataset.abodyPreviewBypass === "true") return;
        event.preventDefault();
        event.stopImmediatePropagation();
        abrirResumo(day, button);
      }, true);
    });
  }

  function aplicarAvisos() {
    const buttons = [...document.querySelectorAll("button")];

    const aluno = buttons.find(b => /gerar meu plano/i.test(b.textContent || ""));
    if (aluno && !document.querySelector('[data-abody-scientific-notice="aluno"]')) {
      const actions = aluno.closest(".ab-form-actions");
      if (actions?.parentElement) actions.parentElement.insertBefore(criarAviso("aluno"), actions);
      else aluno.parentElement?.insertBefore(criarAviso("aluno"), aluno);
    }

    const personal = buttons.find(b => /^\s*(✨\s*)?gerar treino\s*$/i.test((b.textContent || "").trim()));
    if (personal && !document.querySelector('[data-abody-scientific-notice="personal"]')) {
      const actions = personal.closest(".ab-form-actions");
      if (actions?.parentElement) actions.parentElement.insertBefore(criarAviso("personal"), actions);
      else personal.parentElement?.insertBefore(criarAviso("personal"), personal);
    }
  }

  function aplicar() {
    aplicarAvisos();
    aplicarResumoTreino();
  }

  const observer = new MutationObserver(aplicar);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener("DOMContentLoaded", aplicar);
  aplicar();
})();
