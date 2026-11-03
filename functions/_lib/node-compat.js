// Adapta um handler no formato Node/Vercel (req, res) para uma Pages Function.
// Mantém suporte a res.write() (keep-alive em streaming) usado pelo proxy de IA.
import { getOwner } from "./auth.js";
import { ensureSchema } from "./schema.js";
import { makeQuota } from "./quota.js";

export function nodeHandler(handler) {
  return async (context) => {
    const { request, env } = context;
    globalThis.process ??= { env: {} };
    process.env ??= {};
    for (const [k, v] of Object.entries(env)) if (typeof v === "string") process.env[k] = v;

    const owner = await getOwner(request, env);
    if (owner && env.DB) await ensureSchema(env.DB);

    const url = new URL(request.url);
    const headers = {};
    request.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });
    let body;
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
      const texto = await request.text();
      try { body = (headers["content-type"] || "").includes("json") ? JSON.parse(texto) : texto; } catch { body = {}; }
    }
    const req = {
      method: request.method, headers, body, url: url.pathname + url.search,
      query: Object.fromEntries(url.searchParams),
      abody: { owner, quota: owner && env.DB ? makeQuota(env.DB) : null },
    };

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter(), enc = new TextEncoder(), hdrs = new Headers();
    let status = 200, enviado = false, fim = false, entregar;
    const resposta = new Promise((r) => { entregar = r; });
    const escrever = (t) => writer.write(enc.encode(String(t))).catch(() => { res.destroyed = true; });
    const res = {
      destroyed: false,
      get writableEnded() { return fim; },
      get headersSent() { return enviado; },
      setHeader(k, v) { hdrs.set(k, String(v)); },
      getHeader(k) { return hdrs.get(k); },
      status(c) { status = c; return res; },
      json(o) { hdrs.set("content-type", "application/json; charset=utf-8"); return res.end(JSON.stringify(o)); },
      write(chunk) {
        if (!enviado) { enviado = true; entregar(new Response(readable, { status, headers: hdrs })); }
        escrever(chunk); return true;
      },
      end(chunk) {
        if (fim) return res;
        if (!enviado) {
          enviado = true; fim = true;
          const semCorpo = status === 204 || status === 304 || chunk == null;
          entregar(new Response(semCorpo ? null : chunk, { status, headers: hdrs }));
          writer.close().catch(() => {});
          return res;
        }
        if (chunk != null) escrever(chunk);
        fim = true; writer.close().catch(() => {});
        return res;
      },
      once() {}, off() {},
    };

    const feito = Promise.resolve()
      .then(() => handler(req, res))
      .catch((e) => {
        console.log(JSON.stringify({ service: "abody-compat", error: e?.name || "Error" }));
        if (!enviado) res.status(500).json({ error: { message: "Erro interno." } });
        else if (!fim) { fim = true; writer.close().catch(() => {}); }
      })
      .then(() => { if (!enviado) res.end(); });
    context.waitUntil(feito);
    return resposta;
  };
}
