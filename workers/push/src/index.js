// Agenda o aviso de fim de descanso: um Durable Object por usuário guarda a
// assinatura de push e dispara um alarme na hora exata. O push vai sem conteúdo
// (só VAPID), então não precisa de criptografia de payload; o service worker
// mostra a notificação fixa.
import { DurableObject } from "cloudflare:workers";

const b64u = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const txt = (s) => b64u(new TextEncoder().encode(s));

// JWT ES256 do VAPID (RFC 8292). WebCrypto já devolve a assinatura no formato r||s do JWS.
export async function vapidAuth(endpoint, env, agora = Date.now()) {
  const chave = await crypto.subtle.importKey("jwk", JSON.parse(env.VAPID_PRIVATE_JWK), { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const corpo = `${txt(JSON.stringify({ typ: "JWT", alg: "ES256" }))}.${txt(JSON.stringify({
    aud: new URL(endpoint).origin, exp: Math.floor(agora / 1000) + 12 * 3600, sub: env.VAPID_SUBJECT,
  }))}`;
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, chave, new TextEncoder().encode(corpo));
  return `vapid t=${corpo}.${b64u(sig)}, k=${env.VAPID_PUBLIC_KEY}`;
}

export class PushTimer extends DurableObject {
  async schedule(subscription, quando) {
    await this.ctx.storage.put("sub", subscription);
    await this.ctx.storage.setAlarm(quando);
  }

  async cancel() {
    await this.ctx.storage.deleteAlarm();
  }

  async alarm() {
    const sub = await this.ctx.storage.get("sub");
    if (!sub?.endpoint) return;
    const r = await fetch(sub.endpoint, {
      method: "POST",
      headers: { Authorization: await vapidAuth(sub.endpoint, this.env), TTL: "120", Urgency: "high", "Content-Length": "0" },
    });
    // Assinatura expirada ou revogada: descarta para não tentar de novo.
    if (r.status === 404 || r.status === 410) await this.ctx.storage.delete("sub");
    else if (!r.ok) console.log(JSON.stringify({ service: "abody-push", status: r.status }));
  }
}

// Sem rota pública: só o Pages fala com o Durable Object pelo binding.
export default { fetch: () => new Response("Not found", { status: 404 }) };
