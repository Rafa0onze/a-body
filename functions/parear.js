// Pareia este aparelho: exige o login do Cloudflare Access (o único caminho que ele ainda
// protege) e grava no navegador uma chave longa, HttpOnly, que vale como login dali em diante.
// No banco fica só o hash. Para revogar: DELETE FROM aparelhos (ou a linha do aparelho).
import { ownerPeloAccess, hashChave, COOKIE_APARELHO } from "./_lib/auth.js";
import { ensureSchema } from "./_lib/schema.js";

const VALIDADE = 400 * 24 * 3600; // teto de validade de cookie nos navegadores

export async function onRequest({ request, env }) {
  if (!["GET", "POST"].includes(request.method)) return new Response(null, { status: 405 });
  const owner = await ownerPeloAccess(request, env);
  if (!owner || !env.DB) return new Response("Acesso não autorizado.", { status: 401, headers: { "cache-control": "no-store" } });
  await ensureSchema(env.DB);
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const chave = btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  await env.DB.prepare("INSERT INTO aparelhos (hash, criado) VALUES (?, ?)").bind(await hashChave(chave), new Date().toISOString()).run();
  const headers = new Headers({ "cache-control": "no-store" });
  headers.append("set-cookie", `${COOKIE_APARELHO}=${chave}; Path=/; Max-Age=${VALIDADE}; HttpOnly; Secure; SameSite=Strict`);
  if (request.method === "POST") return new Response(null, { status: 204, headers });
  headers.set("location", "/");
  return new Response(null, { status: 303, headers });
}
