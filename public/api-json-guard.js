// Direciona a geração do A-BODY para a rota robusta e garante resposta JSON.
(() => {
  const fetchOriginal = window.fetch.bind(window);

  window.fetch = async (...args) => {
    const input = args[0];
    const originalUrl = typeof input === "string" ? input : input?.url || "";
    const isClaude = originalUrl.includes("/api/claude") && !originalUrl.includes("/api/claude-v2");

    if (isClaude) {
      if (typeof input === "string") args[0] = originalUrl.replace("/api/claude", "/api/claude-v2");
      else args[0] = new Request(input, { ...args[1], url: undefined });
    }

    // Request.url não pode ser alterada; recria quando necessário.
    if (isClaude && typeof input !== "string") {
      args[0] = new Request(originalUrl.replace("/api/claude", "/api/claude-v2"), input);
    }

    let response;
    try {
      response = await fetchOriginal(...args);
    } catch {
      return new Response(JSON.stringify({ error: { message: "Não foi possível gerar seu plano agora. Tente novamente." } }), {
        status: 502,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    }

    const url = isClaude ? "/api/claude-v2" : originalUrl;
    if (!url.includes("/api/claude")) return response;

    const clone = response.clone();
    const contentType = clone.headers.get("content-type") || "";
    if (contentType.includes("application/json")) return response;

    let texto = "";
    try { texto = await clone.text(); } catch {}
    console.warn("A-BODY: resposta não JSON recebida da API", texto.slice(0, 200));

    return new Response(JSON.stringify({
      error: { message: "Não foi possível gerar seu plano agora. Tente novamente." }
    }), {
      status: response.ok ? 502 : response.status,
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  };
})();
