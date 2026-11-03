// Autenticação via Cloudflare Access: valida a assinatura do JWT que o Access
// injeta em cada requisição. Falha fechada: sem configuração, ninguém entra.
const b64u = (s) => Uint8Array.from(
  atob(s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=")),
  (c) => c.charCodeAt(0));
const json = (s) => JSON.parse(new TextDecoder().decode(b64u(s)));

let jwks = { at: 0, keys: null, team: "" };
async function chaves(team) {
  if (jwks.keys && jwks.team === team && Date.now() - jwks.at < 3_600_000) return jwks.keys;
  const r = await fetch(`https://${team}/cdn-cgi/access/certs`);
  if (!r.ok) throw new Error("jwks indisponível");
  jwks = { at: Date.now(), keys: (await r.json()).keys || [], team };
  return jwks.keys;
}

async function emailDoAccess(request, env) {
  const token = request.headers.get("cf-access-jwt-assertion");
  if (!token || !env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) return null;
  const [h, p, s] = token.split(".");
  if (!h || !p || !s) return null;
  try {
    const header = json(h), payload = json(p), agora = Date.now() / 1000;
    if (header.alg !== "RS256") return null;
    if (!(payload.exp > agora) || (payload.nbf && payload.nbf > agora + 60)) return null;
    if (payload.iss !== `https://${env.ACCESS_TEAM_DOMAIN}`) return null;
    if (![].concat(payload.aud || []).includes(env.ACCESS_AUD)) return null;
    const jwk = (await chaves(env.ACCESS_TEAM_DOMAIN)).find((k) => k.kid === header.kid);
    if (!jwk) return null;
    const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64u(s), new TextEncoder().encode(`${h}.${p}`));
    return ok ? String(payload.email || "").toLowerCase() : null;
  } catch { return null; }
}

// Retorna { id, email } do dono ou null. DEV_BYPASS_ACCESS=1 só para testes locais.
export async function getOwner(request, env) {
  const id = env.OWNER_ID, esperado = String(env.OWNER_EMAIL || "").toLowerCase();
  if (!id || !esperado) return null;
  if (env.DEV_BYPASS_ACCESS === "1") return { id, email: esperado };
  const email = await emailDoAccess(request, env);
  return email && email === esperado ? { id, email } : null;
}
