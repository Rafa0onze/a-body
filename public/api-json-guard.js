// Garante que /api/claude sempre seja interpretada pelo app como JSON.
(() => {
  const fetchOriginal = window.fetch.bind(window);

  window.fetch = async (...args) => {
    const response = await fetchOriginal(...args);
    const input = args[0];
    const url = typeof input === "string" ? input : input?.url || "";

    if (!url.includes("/api/claude")) return response;

    const clone = response.clone();
    const contentType = clone.headers.get("content-type") || "";
    if (contentType.includes("application/json")) return response;

    let texto = "";
    try { texto = await clone.text(); } catch {}
    console.warn("A-BODY: resposta não JSON recebida da API", texto.slice(0, 200));

    return new Response(JSON.stringify({
      error: {
        message: "Não foi possível gerar seu plano agora. Tente novamente em instantes."
      }
    }), {
      status: response.ok ? 502 : response.status,
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  };
})();
