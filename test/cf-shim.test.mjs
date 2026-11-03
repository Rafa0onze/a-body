// Testa a camada Cloudflare (D1 + R2 + proxy) com um D1/R2 simulados em Node.
import test from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import path from "node:path";

let DatabaseSync;
try { ({ DatabaseSync } = await import("node:sqlite")); } catch { /* Node < 22: testes ignorados */ }
const run = DatabaseSync ? test : test.skip;

const raiz = path.resolve(import.meta.dirname, "..");
const carregar = (p) => import(pathToFileURL(path.join(raiz, p)).href);

function fakeD1() {
  const db = new DatabaseSync(":memory:");
  const prep = (sql) => ({
    bind: (...a) => ({
      run: async () => { const st = db.prepare(sql); const r = st.run(...a); return { meta: { changes: Number(r.changes) } }; },
      all: async () => ({ results: db.prepare(sql).all(...a) }),
      first: async () => db.prepare(sql).get(...a) ?? null,
    }),
    run: async () => { const r = db.prepare(sql).run(); return { meta: { changes: Number(r.changes) } }; },
    all: async () => ({ results: db.prepare(sql).all() }),
  });
  return { prepare: prep, batch: async (ss) => { for (const s of ss) await s.run(); return []; } };
}
function fakeR2() {
  const m = new Map();
  return {
    put: async (k, v, o) => { m.set(k, { body: v, httpMetadata: o?.httpMetadata }); },
    get: async (k) => m.get(k) ?? null,
    head: async (k) => m.get(k) ?? null,
    delete: async (k) => { m.delete(k); },
    list: async () => ({ objects: [...m.keys()].map((key) => ({ key })), truncated: false }),
    _m: m,
  };
}

const OWNER = "a40adc21-11df-41d8-ba22-8176847035a2";
const mkEnv = (extra = {}) => ({ DB: fakeD1(), FILES: fakeR2(), OWNER_ID: OWNER, OWNER_EMAIL: "eu@example.com", DEV_BYPASS_ACCESS: "1", ...extra });

async function chamar(onRequest, env, p, opts = {}) {
  const r = await onRequest({ request: new Request(`https://t.test/sb${p}`, opts), env });
  const t = await r.clone().text();
  let d; try { d = t ? JSON.parse(t) : null; } catch { d = t; }
  return { r, d, status: r.status };
}
const J = (o) => JSON.stringify(o);

run("sem Access/dono configurado, tudo é negado (falha fechada)", async () => {
  const { onRequest } = await carregar("functions/sb/[[path]].js");
  const env = mkEnv({ DEV_BYPASS_ACCESS: "0" });
  assert.equal((await chamar(onRequest, env, "/rest/v1/user_data")).status, 401);
  assert.equal((await chamar(onRequest, env, "/auth/v1/user")).status, 401);
});

run("user_data: upsert, leitura, filtros, CAS e ignore-duplicates", async () => {
  const { onRequest } = await carregar("functions/sb/[[path]].js");
  const env = mkEnv();
  const post = (body, prefer) => chamar(onRequest, env, "/rest/v1/user_data", { method: "POST", headers: prefer ? { prefer } : {}, body: J(body) });
  assert.equal((await post({ key: "abody:plan", value: { a: 1 } }, "resolution=merge-duplicates")).status, 201);
  assert.equal((await post({ key: "abody:plan", value: { a: 2 } }, "resolution=merge-duplicates")).status, 201);
  let g = await chamar(onRequest, env, "/rest/v1/user_data?key=eq.abody%3Aplan&select=value");
  assert.deepEqual(g.d, [{ value: { a: 2 } }]);
  await post({ key: "abody:measurement:1", value: { n: 1 } });
  await post({ key: "abody:measurement:2", value: { n: 2 } });
  g = await chamar(onRequest, env, "/rest/v1/user_data?key=like.abody%3Ameasurement%3A*&select=value&order=key.asc&limit=500&offset=0");
  assert.deepEqual(g.d.map((x) => x.value.n), [1, 2]);
  // duplicado sem Prefer => 409; ignore-duplicates => nada retornado
  assert.equal((await post({ key: "abody:measurement:1", value: { n: 9 } })).status, 409);
  const ig = await post({ key: "abody:measurement:1", value: { n: 9 } }, "resolution=ignore-duplicates,return=representation");
  assert.deepEqual(ig.d, []);
  // CAS: só atualiza se updated_at confere
  const atual = (await chamar(onRequest, env, "/rest/v1/user_data?key=eq.abody%3Aplan&select=value,updated_at")).d[0];
  const errado = await chamar(onRequest, env, `/rest/v1/user_data?key=eq.abody%3Aplan&updated_at=eq.${encodeURIComponent("2000-01-01T00:00:00.000Z")}&select=value,updated_at`,
    { method: "PATCH", headers: { prefer: "return=representation" }, body: J({ value: { a: 3 }, updated_at: new Date().toISOString() }) });
  assert.deepEqual(errado.d, []);
  const certo = await chamar(onRequest, env, `/rest/v1/user_data?key=eq.abody%3Aplan&updated_at=eq.${encodeURIComponent(atual.updated_at)}&select=value,updated_at`,
    { method: "PATCH", headers: { prefer: "return=representation" }, body: J({ value: { a: 3 }, updated_at: new Date(Date.now() + 5).toISOString() }) });
  assert.deepEqual(certo.d.map((x) => x.value), [{ a: 3 }]);
  // outro user_id nunca é acessível
  assert.deepEqual((await chamar(onRequest, env, "/rest/v1/user_data?user_id=eq.outro&select=value")).d, []);
  assert.equal((await post({ user_id: "outro", key: "x", value: 1 })).status, 403);
});

run("histórico acumulativo do app funciona de ponta a ponta contra a camada", async () => {
  const { onRequest } = await carregar("functions/sb/[[path]].js");
  const { saveCumulativeHistory } = await carregar("src/history-sync.js");
  const env = mkEnv();
  const request = async (p, opts = {}) => {
    const r = await onRequest({ request: new Request(`https://t.test/sb${p}`, opts), env });
    const t = await r.text(); const d = t ? JSON.parse(t) : {};
    if (!r.ok) throw Object.assign(new Error(d.message || "erro"), { status: r.status });
    return d;
  };
  const session = { access_token: "solo", user: { id: OWNER } };
  const a = await saveCumulativeHistory({ request, session, key: "abody:bodyhistory", value: [{ id: "a1", date: "2026-10-01", peso: 80 }] });
  const b = await saveCumulativeHistory({ request, session, key: "abody:bodyhistory", value: [{ id: "a2", date: "2026-10-08", peso: 79 }] });
  assert.equal(a.length, 1);
  assert.deepEqual(b.map((x) => x.id).sort(), ["a1", "a2"]);
});

run("storage: fotos privadas só do dono, URL assinada, leitura e exclusão", async () => {
  const { onRequest } = await carregar("functions/sb/[[path]].js");
  const env = mkEnv();
  const p = `${OWNER}/123_front.jpg`;
  const up = await chamar(onRequest, env, `/storage/v1/object/fotos-corporais/${p}`, { method: "POST", headers: { "content-type": "image/jpeg", "x-upsert": "true" }, body: new Uint8Array([1, 2, 3]) });
  assert.equal(up.status, 200);
  assert.equal((await chamar(onRequest, env, `/storage/v1/object/fotos-corporais/outro/1.jpg`, { method: "POST", body: new Uint8Array([1]) })).status, 403);
  assert.equal((await chamar(onRequest, env, `/storage/v1/object/fotos-corporais/${OWNER}/../x.jpg`, { method: "POST", body: new Uint8Array([1]) })).status, 403);
  const sg = await chamar(onRequest, env, `/storage/v1/object/sign/fotos-corporais/${p}`, { method: "POST", body: J({ expiresIn: 3600 }) });
  assert.match(sg.d.signedURL, /^\/object\/sign\/fotos-corporais\//);
  const get = await onRequest({ request: new Request(`https://t.test/sb/storage/v1${sg.d.signedURL}`), env });
  assert.equal(get.status, 200);
  assert.equal(get.headers.get("content-type"), "image/jpeg");
  assert.equal((await chamar(onRequest, env, "/storage/v1/object/fotos-corporais", { method: "DELETE", body: J({ prefixes: [p] }) })).status, 200);
  assert.equal((await chamar(onRequest, env, `/storage/v1/object/sign/fotos-corporais/${p}`, { method: "POST", body: "{}" })).status, 404);
});

run("importação só funciona com ALLOW_IMPORT=1 e alimenta biblioteca e histórico", async () => {
  const { onRequest } = await carregar("functions/sb/[[path]].js");
  const corpo = J({ user_data: [{ key: "abody:plan", value: { ok: true }, updated_at: "2026-10-14T00:33:19.796Z" }], exercicios: [{ numero: 2, nome: "B" }, { numero: 1, nome: "A" }] });
  assert.equal((await chamar(onRequest, mkEnv(), "/admin/import", { method: "POST", body: corpo })).status, 403);
  const env = mkEnv({ ALLOW_IMPORT: "1" });
  assert.equal((await chamar(onRequest, env, "/admin/import", { method: "POST", body: corpo })).status, 200);
  assert.deepEqual((await chamar(onRequest, env, "/rest/v1/exercicios?select=*&order=numero")).d.map((e) => e.nome), ["A", "B"]);
  const ex = await chamar(onRequest, env, "/admin/export");
  assert.equal(ex.d.user_data.length, 1);
  // exercícios (imagens) só gravam em modo de importação
  assert.equal((await chamar(onRequest, env, "/storage/v1/object/exercicios/a.webp", { method: "POST", body: new Uint8Array([1]) })).status, 200);
  assert.equal((await chamar(mkEnvOnRequest(onRequest), mkEnv(), "/storage/v1/object/exercicios/b.webp", { method: "POST", body: new Uint8Array([1]) })).status, 403);
});
function mkEnvOnRequest(f) { return f; }

run("tabelas do B2B não quebram o app: leitura vazia, escrita descartada", async () => {
  const { onRequest } = await carregar("functions/sb/[[path]].js");
  const env = mkEnv();
  assert.deepEqual((await chamar(onRequest, env, "/rest/v1/profissionais?user_id=eq.x&select=user_id")).d, []);
  assert.equal((await chamar(onRequest, env, "/rest/v1/eventos", { method: "POST", body: "{}" })).status, 204);
  assert.equal((await chamar(onRequest, env, "/functions/v1/sync-self-plan", { method: "POST" })).status, 404);
  assert.equal((await chamar(onRequest, env, "/auth/v1/user")).d.id, OWNER);
});

run("cota diária de IA: reserva, confirma, cancela e respeita o limite", async () => {
  const { makeQuota } = await carregar("functions/_lib/quota.js");
  const { ensureSchema } = await carregar("functions/_lib/schema.js");
  const db = fakeD1(); await ensureSchema(db);
  const q = makeQuota(db);
  const r1 = await q.reserve_ia_quota({ limite: 2 }), r2 = await q.reserve_ia_quota({ limite: 2 });
  assert.ok(r1 && r2);
  assert.equal(await q.reserve_ia_quota({ limite: 2 }), null);
  await q.cancel_ia_quota({ reserva_id: r2 });
  assert.ok(await q.reserve_ia_quota({ limite: 2 }));
  assert.equal(await q.confirm_ia_quota({ reserva_id: r1 }), true);
  assert.equal(await q.confirm_ia_quota({ reserva_id: r1 }), false);
});

run("adaptador Node→Pages: json, streaming com keep-alive e proxy de IA protegido", async () => {
  const { nodeHandler } = await carregar("functions/_lib/node-compat.js");
  const ctx = (env, req) => ({ request: req, env, waitUntil: () => {} });
  const env = mkEnv();
  const simples = nodeHandler(async (req, res) => res.status(201).json({ m: req.method, q: req.query.x }));
  const r = await simples(ctx(env, new Request("https://t.test/api/x?x=1", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })));
  assert.equal(r.status, 201); assert.deepEqual(await r.json(), { m: "POST", q: "1" });
  const stream = nodeHandler(async (req, res) => {
    res.setHeader("Content-Type", "application/json"); res.write(" "); await new Promise((x) => setTimeout(x, 5)); res.write(" ");
    res.status(200); res.end(JSON.stringify({ ok: true }));
  });
  const s = await stream(ctx(env, new Request("https://t.test/api/y", { method: "POST", body: "{}" })));
  assert.deepEqual(JSON.parse(await s.text()), { ok: true });
  const { default: ia } = await carregar("api/claude.js");
  const semAcesso = nodeHandler(ia);
  const bloqueado = await semAcesso(ctx(mkEnv({ DEV_BYPASS_ACCESS: "0", OPENAI_API_KEY: "x" }), new Request("https://t.test/api/openai", { method: "POST", headers: { "content-type": "application/json" }, body: J({ messages: [{ role: "user", content: "A-BODY:PLANO_TREINO" }] }) })));
  assert.equal(bloqueado.status, 401);
});
