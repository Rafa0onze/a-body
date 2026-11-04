// Agenda ou cancela o aviso push de fim de descanso (Durable Object no Worker abody-push).
import { getOwner } from "../_lib/auth.js";

// Só serviços de push conhecidos, para o endpoint não virar um proxy arbitrário.
const SERVICOS = /^https:\/\/(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9.-]+\.notify\.windows\.com|web\.push\.apple\.com)\//;

export function validar(c) {
  if (c?.action === "cancel") return { action: "cancel" };
  const s = Number(c?.seconds), sub = c?.subscription;
  if (c?.action !== "schedule" || !Number.isInteger(s) || s < 1 || s > 1800) return null;
  if (typeof sub?.endpoint !== "string" || sub.endpoint.length > 1000 || !SERVICOS.test(sub.endpoint)) return null;
  return { action: "schedule", seconds: s, subscription: { endpoint: sub.endpoint } };
}

const json = (status, dados) => new Response(JSON.stringify(dados), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export async function onRequestPost({ request, env }) {
  const owner = await getOwner(request, env);
  if (!owner) return json(401, { error: "Acesso não autorizado." });
  if (!env.PUSH) return json(503, { error: "Push não configurado." });
  const pedido = validar(await request.json().catch(() => null));
  if (!pedido) return json(400, { error: "Pedido inválido." });
  const timer = env.PUSH.get(env.PUSH.idFromName(owner.id));
  if (pedido.action === "cancel") await timer.cancel();
  else await timer.schedule(pedido.subscription, Date.now() + pedido.seconds * 1000);
  return json(200, { ok: true });
}
