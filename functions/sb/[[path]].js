// Camada compatível com as chamadas REST/Storage do Supabase que o app já faz.
// Dados no D1 (env.DB), arquivos no R2 (env.FILES). Acesso só do dono (Cloudflare Access).
import { getOwner } from "../_lib/auth.js";
import { ensureSchema } from "../_lib/schema.js";

const JSON_H = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
const out = (obj, status = 200, extra = {}) =>
  new Response(obj === undefined ? null : JSON.stringify(obj), { status, headers: { ...JSON_H, ...extra } });
const vazio = (status = 204) => new Response(null, { status, headers: { "cache-control": "no-store" } });
const erro = (status, message, code) => out({ message, code, error_description: message }, status);

const BUCKETS = new Set(["fotos-corporais", "perfis", "documentos-saude", "exercicios"]);
const COLUNAS = new Set(["user_id", "key", "value", "updated_at"]);
const MAX_ARQUIVO = 12 * 1024 * 1024;

const seguro = (p) => p && !p.split("/").some((s) => s === ".." || s === "." || s === "") && !p.includes("\\");

function preferencias(request) {
  const p = (request.headers.get("prefer") || "").toLowerCase();
  return { representacao: p.includes("return=representation"), mesclar: p.includes("merge-duplicates"), ignorar: p.includes("ignore-duplicates") };
}

function linha(r, colunas) {
  const o = { user_id: r.user_id, key: r.key, value: JSON.parse(r.value), updated_at: r.updated_at };
  if (!colunas) return o;
  return Object.fromEntries(colunas.map((c) => [c, o[c]]));
}

function filtros(url, owner) {
  const where = ["user_id = ?"], args = [owner.id];
  for (const [col, expr] of url.searchParams) {
    if (["select", "order", "limit", "offset", "on_conflict", "columns"].includes(col)) continue;
    if (!COLUNAS.has(col)) throw Object.assign(new Error(`coluna ${col}`), { status: 400 });
    const i = expr.indexOf("."), op = expr.slice(0, i), val = expr.slice(i + 1);
    if (col === "user_id") { if (op !== "eq" || val !== owner.id) { where.push("0"); } continue; }
    if (op === "eq") { where.push(`${col} = ?`); args.push(val); }
    else if (op === "like") { where.push(`${col} LIKE ? ESCAPE '\\'`); args.push(val.replace(/[\\%_]/g, "\\$&").replace(/\*/g, "%")); }
    else throw Object.assign(new Error(`operador ${op}`), { status: 400 });
  }
  return { where: where.join(" AND "), args };
}

async function userData(request, env, url, owner) {
  const db = env.DB, pref = preferencias(request), cols = (url.searchParams.get("select") || "*");
  const colunas = cols === "*" ? null : cols.split(",").map((c) => c.trim()).filter((c) => COLUNAS.has(c));

  if (request.method === "GET" || request.method === "HEAD") {
    const { where, args } = filtros(url, owner);
    let ordem = "";
    const o = url.searchParams.get("order");
    if (o) { const [c, d] = o.split("."); if (COLUNAS.has(c)) ordem = ` ORDER BY ${c} ${d === "desc" ? "DESC" : "ASC"}`; }
    const limite = Math.min(Number(url.searchParams.get("limit")) || 1000, 1000);
    const deslocamento = Math.max(Number(url.searchParams.get("offset")) || 0, 0);
    const { results } = await db.prepare(`SELECT * FROM user_data WHERE ${where}${ordem} LIMIT ? OFFSET ?`).bind(...args, limite, deslocamento).all();
    return out(results.map((r) => linha(r, colunas)));
  }

  if (request.method === "POST") {
    const corpo = await request.json().catch(() => null);
    const itens = Array.isArray(corpo) ? corpo : corpo ? [corpo] : [];
    if (!itens.length) return erro(400, "Corpo inválido.");
    const sufixo = pref.mesclar
      ? " ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at"
      : pref.ignorar ? " ON CONFLICT(user_id, key) DO NOTHING" : "";
    const salvos = [];
    for (const it of itens) {
      if (typeof it.key !== "string" || !it.key || it.key.length > 300) return erro(400, "Chave inválida.");
      if (it.user_id && it.user_id !== owner.id) return erro(403, "Acesso negado.", "42501");
      const valor = JSON.stringify(it.value ?? null);
      if (valor.length > 1_500_000) return erro(413, "Registro grande demais.");
      const quando = typeof it.updated_at === "string" && it.updated_at ? it.updated_at : new Date().toISOString();
      try {
        const r = await db.prepare(`INSERT INTO user_data (user_id, key, value, updated_at) VALUES (?, ?, ?, ?)${sufixo} RETURNING *`)
          .bind(owner.id, it.key, valor, quando).all();
        salvos.push(...r.results);
      } catch (e) {
        if (/UNIQUE|constraint/i.test(String(e?.message))) return erro(409, "Registro duplicado.", "23505");
        throw e;
      }
    }
    return pref.representacao ? out(salvos.map((r) => linha(r, colunas)), 201) : vazio(201);
  }

  if (request.method === "PATCH") {
    const corpo = await request.json().catch(() => null);
    if (!corpo || typeof corpo !== "object") return erro(400, "Corpo inválido.");
    const { where, args } = filtros(url, owner);
    const sets = [], vals = [];
    if ("value" in corpo) { sets.push("value = ?"); vals.push(JSON.stringify(corpo.value ?? null)); }
    sets.push("updated_at = ?"); vals.push(typeof corpo.updated_at === "string" ? corpo.updated_at : new Date().toISOString());
    const r = await db.prepare(`UPDATE user_data SET ${sets.join(", ")} WHERE ${where} RETURNING *`).bind(...vals, ...args).all();
    return pref.representacao ? out(r.results.map((x) => linha(x, colunas))) : vazio(204);
  }

  if (request.method === "DELETE") {
    const { where, args } = filtros(url, owner);
    await db.prepare(`DELETE FROM user_data WHERE ${where}`).bind(...args).run();
    return vazio(204);
  }
  return erro(405, "Método não permitido.");
}

async function exercicios(env) {
  const { results } = await env.DB.prepare("SELECT data FROM exercicios ORDER BY numero").all();
  return out(results.map((r) => JSON.parse(r.data)));
}

function donoDoCaminho(bucket, path, owner, importando) {
  if (importando) return true;
  if (bucket === "exercicios") return false; // só leitura fora do modo de importação
  return path.startsWith(`${owner.id}/`);
}

async function storage(request, env, partes, owner) {
  // partes: depois de "storage/v1/object"
  const importando = env.ALLOW_IMPORT === "1";
  const [a, ...resto] = partes;

  if (a === "sign" && request.method === "POST") {
    const [bucket, ...p] = resto, path = p.join("/");
    if (!BUCKETS.has(bucket) || !seguro(path)) return erro(400, "Caminho inválido.");
    if (bucket !== "exercicios" && !path.startsWith(`${owner.id}/`)) return erro(403, "Acesso negado.");
    const existe = await env.FILES.head(`${bucket}/${path}`);
    if (!existe) return erro(404, "Objeto não encontrado.");
    return out({ signedURL: `/object/sign/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}?token=solo` });
  }

  if (["sign", "public", "authenticated"].includes(a) && request.method === "GET") {
    const [bucket, ...p] = resto, path = decodeURIComponent(p.join("/"));
    if (!BUCKETS.has(bucket) || !seguro(path)) return erro(400, "Caminho inválido.");
    if (bucket !== "exercicios" && bucket !== "perfis" && !path.startsWith(`${owner.id}/`)) return erro(403, "Acesso negado.");
    const obj = await env.FILES.get(`${bucket}/${path}`);
    if (!obj) return erro(404, "Objeto não encontrado.");
    return new Response(obj.body, { headers: {
      "content-type": obj.httpMetadata?.contentType || "application/octet-stream",
      "cache-control": bucket === "exercicios" ? "private, max-age=604800" : "private, max-age=3600",
      "x-content-type-options": "nosniff" } });
  }

  const bucket = a, path = decodeURIComponent(resto.join("/"));
  if (!BUCKETS.has(bucket)) return erro(400, "Bucket inválido.");

  if ((request.method === "POST" || request.method === "PUT") && path) {
    if (!seguro(path) || !donoDoCaminho(bucket, path, owner, importando)) return erro(403, "Acesso negado.", "42501");
    const dados = await request.arrayBuffer();
    if (dados.byteLength > MAX_ARQUIVO) return erro(413, "Arquivo grande demais.");
    const tipo = request.headers.get("content-type") || "application/octet-stream";
    if (request.headers.get("x-upsert") !== "true" && await env.FILES.head(`${bucket}/${path}`)) return erro(409, "Já existe.", "Duplicate");
    await env.FILES.put(`${bucket}/${path}`, dados, { httpMetadata: { contentType: tipo } });
    return out({ Key: `${bucket}/${path}` });
  }

  if (request.method === "DELETE") {
    let caminhos = path ? [path] : [];
    if (!path) { const c = await request.json().catch(() => ({})); caminhos = Array.isArray(c.prefixes) ? c.prefixes : []; }
    for (const c of caminhos) {
      if (!seguro(c) || !donoDoCaminho(bucket, c, owner, false)) return erro(403, "Acesso negado.", "42501");
    }
    for (const c of caminhos) await env.FILES.delete(`${bucket}/${c}`);
    return out(caminhos.map((name) => ({ name })));
  }
  return erro(405, "Método não permitido.");
}

async function admin(request, env, acao, owner) {
  if (acao === "export" && request.method === "GET") {
    const { results } = await env.DB.prepare("SELECT * FROM user_data WHERE user_id = ?").bind(owner.id).all();
    const arquivos = []; let cursor;
    do { const l = await env.FILES.list({ cursor, limit: 1000 }); arquivos.push(...l.objects.map((o) => o.key)); cursor = l.truncated ? l.cursor : undefined; } while (cursor);
    return out({ exportado_em: new Date().toISOString(), user_data: results.map((r) => linha(r)), arquivos });
  }
  if (acao === "import" && request.method === "POST") {
    if (env.ALLOW_IMPORT !== "1") return erro(403, "Importação desativada.");
    const c = await request.json().catch(() => null);
    if (!c) return erro(400, "Corpo inválido.");
    const stmts = [];
    for (const r of c.user_data || []) {
      stmts.push(env.DB.prepare(`INSERT INTO user_data (user_id, key, value, updated_at) VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`)
        .bind(owner.id, String(r.key), JSON.stringify(r.value ?? null), String(r.updated_at)));
    }
    for (const e of c.exercicios || []) {
      stmts.push(env.DB.prepare(`INSERT INTO exercicios (numero, data) VALUES (?, ?)
        ON CONFLICT(numero) DO UPDATE SET data = excluded.data`).bind(Number(e.numero), JSON.stringify(e)));
    }
    for (let i = 0; i < stmts.length; i += 40) await env.DB.batch(stmts.slice(i, i + 40));
    return out({ user_data: (c.user_data || []).length, exercicios: (c.exercicios || []).length });
  }
  return erro(404, "Rota não encontrada.");
}

export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const partes = url.pathname.replace(/^\/sb\/?/, "").split("/").filter(Boolean);
  const owner = await getOwner(request, env);
  if (!owner) return erro(401, "Acesso não autorizado.", "401");
  if (!env.DB || !env.FILES) return erro(503, "Armazenamento não configurado.");
  await ensureSchema(env.DB);

  try {
    const [area, versao, recurso, ...resto] = partes;

    if (area === "auth" && versao === "v1") {
      const usuario = { id: owner.id, aud: "authenticated", role: "authenticated", email: owner.email, app_metadata: {}, user_metadata: {} };
      if (recurso === "user" && request.method === "GET") return out(usuario);
      if (recurso === "token" && request.method === "POST") {
        return out({ access_token: "solo", refresh_token: "solo", token_type: "bearer", expires_in: 31536000, user: usuario });
      }
      if (recurso === "logout") return vazio();
      return erro(400, "Indisponível neste modo.");
    }

    if (area === "rest" && versao === "v1") {
      if (recurso === "user_data") return await userData(request, env, url, owner);
      if (recurso === "exercicios" && request.method === "GET") return await exercicios(env);
      if (recurso === "rpc") return erro(403, "Indisponível neste modo.");
      // Tabelas do antigo módulo B2B e telemetria: sem dados, escrita descartada.
      if (request.method === "GET" || request.method === "HEAD") return out([]);
      return preferencias(request).representacao ? out([], 201) : vazio(204);
    }

    if (area === "storage" && versao === "v1" && recurso === "object") return await storage(request, env, resto, owner);
    if (area === "functions") return erro(404, "Indisponível neste modo.");
    if (area === "admin") return await admin(request, env, versao, owner);
    return erro(404, "Rota não encontrada.");
  } catch (e) {
    console.log(JSON.stringify({ service: "abody-sb", error: e?.name || "Error", message: String(e?.message).slice(0, 120) }));
    return erro(e?.status || 500, e?.status === 400 ? "Requisição inválida." : "Erro interno.");
  }
}
