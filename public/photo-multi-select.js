(() => {
  const CONTROL_ID = "abody-multi-photo-control";

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  function imageInputs() {
    return [...document.querySelectorAll('input[type="file"]')].filter(input => {
      if (input.id === CONTROL_ID) return false;
      const accept = String(input.getAttribute("accept") || "").toLowerCase();
      return accept.includes("image") && !accept.includes("pdf");
    }).slice(0, 3);
  }

  async function assignFile(file, index) {
    for (let attempt = 0; attempt < 6; attempt++) {
      const target = imageInputs()[index];
      if (target) {
        try {
          const dt = new DataTransfer();
          dt.items.add(file);
          target.files = dt.files;
          target.dispatchEvent(new Event("change", { bubbles: true }));
          return true;
        } catch (error) {
          console.warn("A-BODY: não foi possível distribuir a foto", error);
          return false;
        }
      }
      await sleep(80);
    }
    return false;
  }

  async function handleSelection(event, status) {
    const files = [...(event.target.files || [])].filter(file => file.type.startsWith("image/")).slice(0, 3);
    event.target.value = "";
    if (!files.length) return;

    status.textContent = `Carregando ${files.length} foto${files.length > 1 ? "s" : ""}…`;
    let loaded = 0;
    for (let i = 0; i < files.length; i++) {
      if (await assignFile(files[i], i)) loaded++;
      await sleep(120);
    }
    status.textContent = loaded === 3
      ? "3 fotos carregadas: Frente, Costas e Lateral."
      : `${loaded} foto${loaded === 1 ? "" : "s"} carregada${loaded === 1 ? "" : "s"}. Você pode completar ou trocar abaixo.`;
  }

  function apply() {
    if (document.getElementById(CONTROL_ID)) return;
    if (imageInputs().length < 3) return;

    const intro = [...document.querySelectorAll("p")].find(p => /envie fotos de roupa de banho/i.test(p.textContent || ""));
    if (!intro?.parentElement) return;

    const wrapper = document.createElement("div");
    wrapper.dataset.abodyMultiPhoto = "true";
    wrapper.style.cssText = "margin:14px 0 18px;padding:14px;background:#0d2a1d;border:1px solid #2f7050;border-radius:14px";

    const input = document.createElement("input");
    input.id = CONTROL_ID;
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.style.display = "none";

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Selecionar as 3 fotos de uma vez";
    button.style.cssText = "width:100%;background:#42dd8c;color:#06140e;border:0;border-radius:12px;padding:13px 14px;font:inherit;font-size:14px;font-weight:800;cursor:pointer";
    button.onclick = () => input.click();

    const hint = document.createElement("div");
    hint.textContent = "Escolha na ordem: Frente, Costas e Lateral. Depois, você ainda poderá trocar cada imagem separadamente.";
    hint.style.cssText = "font-size:11px;line-height:1.45;color:#9bb7a7;margin-top:8px";

    const status = document.createElement("div");
    status.setAttribute("aria-live", "polite");
    status.style.cssText = "font-size:11px;line-height:1.45;color:#48df91;margin-top:6px";

    input.addEventListener("change", event => handleSelection(event, status));
    wrapper.append(input, button, hint, status);
    intro.insertAdjacentElement("afterend", wrapper);
  }

  const observer = new MutationObserver(apply);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener("DOMContentLoaded", apply);
  apply();
})();
