// A-BODY — geração robusta: uma chamada à IA + normalização determinística.
export const config = { maxDuration: 60 };

const SUPA_URL = process.env.VITE_SUPABASE_URL || "https://zvmriqxigpwuggyhpoun.supabase.co";
const SUPA_ANON = process.env.VITE_SUPABASE_ANON_KEY || "";
const ORIGENS = ["https://a-body.vercel.app", "http://localhost:5173"];
const MARCADORES = ["personal trainer", "ANÁLISE CORPORAL", "Analise as fotos", "analise corporal"];

const REGRAS = `
Siga internamente esta ordem: 1) combine anamnese, fotos e documentos; 2) determine objetivo, limitações e até 3 prioridades; 3) escolha a divisão semanal; 4) distribua séries por grupo; 5) só então selecione exercícios da biblioteca; 6) revise o plano.
Regras: não repita predominância muscular em dias consecutivos; limite grandes grupos a 14 séries diretas por sessão; bíceps/tríceps a 8; ombros a 10; máximo 2 puxadas verticais, 2 remadas e 2 presses semelhantes; após costas pesadas use no máximo 2 exercícios de bíceps; após empurrar pesado, no máximo 2 de tríceps. Em planos com 3+ dias, inclua core direto em 2 dias. A duração inclui aquecimento e aeróbico. Retorne somente o JSON final no formato solicitado, sem markdown.
`;

function enviar(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  return res.end(JSON.stringify(payload));
}

function textoMensagens(messages) {
  let out = "";
  for (const m of messages || []) {
    if (typeof m.content === "string") out += m.content + "\n";
    else if (Array.isArray(m.content)) for (const c of m.content) if (c?.type === "text") out += String(c.text || "") + "\n";
  }
  return out;
}

function textoResposta(data) {
  return Array.isArray(data?.content) ? data.content.filter(x => x?.type === "text").map(x => x.text || "").join("") : "";
}

function extrairJSON(texto) {
  const limpo = String(texto || "").replace(/```json|```/gi, "").trim();
  const ini = limpo.indexOf("{");
  const fim = limpo.lastIndexOf("}");
  if (ini < 0 || fim <= ini) return null;
  try { return JSON.parse(limpo.slice(ini, fim + 1)); } catch { return null; }
}

function norm(v) {
  return String(v || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function tipo(ex) {
  const n = norm(ex?.name);
  if (/barra fixa|puxada|pulldown|pull.?down/.test(n)) return "vertical";
  if (/remada|serrote|cavalinho/.test(n)) return "remada";
  if (/supino|chest press|flexao/.test(n)) return "press";
  if (/rosca|biceps/.test(n)) return "biceps";
  if (/triceps|mergulho/.test(n)) return "triceps";
  if (/abdom|abdomen|core|prancha|pallof|dead bug|bird.?dog|roda|elevacao de pernas|leg raise/.test(n)) return "core";
  if (/desenvolvimento|elevacao lateral|elevacao frontal|shoulder press/.test(n)) return "ombro";
  if (/agach|leg press|extensora|afundo|avanco|bulgar|terra|stiff|romeno|flexora|nordic|hip thrust|ponte|gluteo|panturrilha/.test(n)) return "pernas";
  if (/crucifixo|peck deck|cross.?over|voador/.test(n)) return "peito";
  return "outro";
}

function normalizarPlano(plano) {
  if (!plano || !Array.isArray(plano.weekDays) || !plano.weekDays.length) return null;

  for (const dia of plano.weekDays) {
    const entrada = Array.isArray(dia.exercises) ? dia.exercises : [];
    const contagem = {};
    const volume = { costas: 0, peito: 0, biceps: 0, triceps: 0, ombro: 0, pernas: 0 };
    const saida = [];

    for (const original of entrada) {
      if (!original?.name || saida.length >= 8) continue;
      const ex = { ...original };
      ex.sets = Math.min(4, Math.max(2, Number(ex.sets) || 3));
      ex.rest = Math.min(180, Math.max(30, Number(ex.rest) || 60));
      const t = tipo(ex);
      contagem[t] = contagem[t] || 0;

      if (["vertical", "remada", "press"].includes(t) && contagem[t] >= 2) continue;
      if (["biceps", "triceps"].includes(t) && contagem[t] >= 2) continue;

      const sets = ex.sets;
      if (t === "vertical" || t === "remada") {
        if (volume.costas + sets > 14) continue;
        volume.costas += sets;
      } else if (t === "press" || t === "peito") {
        if (volume.peito + sets > 14) continue;
        volume.peito += sets;
      } else if (t === "biceps") {
        if (volume.biceps + sets > 8) continue;
        volume.biceps += sets;
      } else if (t === "triceps") {
        if (volume.triceps + sets > 8) continue;
        volume.triceps += sets;
      } else if (t === "ombro") {
        if (volume.ombro + sets > 10) continue;
        volume.ombro += sets;
      } else if (t === "pernas") {
        if (volume.pernas + sets > 18) continue;
        volume.pernas += sets;
      }

      contagem[t]++;
      saida.push(ex);
    }

    dia.exercises = saida;
  }

  const minimoCore = plano.weekDays.length >= 3 ? 2 : 1;
  let diasCore = plano.weekDays.filter(d => (d.exercises || []).some(e => tipo(e) === "core")).length;
  for (let i = 0; i < plano.weekDays.length && diasCore < minimoCore; i++) {
    const dia = plano.weekDays[i];
    if ((dia.exercises || []).some(e => tipo(e) === "core")) continue;
    const core = { id: `core_auto_${i + 1}`, name: i % 2 ? "Prancha lateral" : "Prancha abdominal", sets: 3, reps: i % 2 ? "30-45s" : "40-60s", rest: 45, pose: "plank", iso: true, isoSec: i % 2 ? 45 : 60 };
    if (dia.exercises.length >= 8) dia.exercises[dia.exercises.length - 1] = core;
    else dia.exercises.push(core);
    diasCore++;
  }

  return plano.weekDays.every(d => Array.isArray(d.exercises) && d.exercises.length >= 3) ? plano : null;
}

async function chamarIA(apiKey, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 50000);
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify(body),
    });
    const raw = await r.text();
    let data = null;
    try { data = JSON.parse(raw); } catch {}
    return { ok: r.ok, status: r.status, data };
  } finally { clearTimeout(timer); }
}

export default async function handler(req, res) {
  const origem = req.headers.origin || "";
  res.setHeader("Access-Control-Allow-Origin", ORIGENS.includes(origem) ? origem : ORIGENS[0]);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return enviar(res, 200, { ok: true });
  if (req.method !== "POST") return enviar(res, 405, { error: { message: "Método não permitido." } });

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return enviar(res, 503, { error: { message: "Serviço de geração indisponível." } });
    const jwt = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!jwt) return enviar(res, 401, { error: { message: "Faça login para gerar seu plano." } });

    const usuario = await fetch(`${SUPA_URL}/auth/v1/user`, { headers: { apikey: SUPA_ANON, Authorization: `Bearer ${jwt}` } });
    if (!usuario.ok) return enviar(res, 401, { error: { message: "Sua sessão expirou. Entre novamente." } });

    const body = req.body || {};
    if (!Array.isArray(body.messages) || !body.messages.length) return enviar(res, 400, { error: { message: "Dados da anamnese incompletos." } });
    const texto = textoMensagens(body.messages);
    if (!MARCADORES.some(m => texto.includes(m))) return enviar(res, 400, { error: { message: "Solicitação não reconhecida." } });

    const mensagens = JSON.parse(JSON.stringify(body.messages));
    const ultima = mensagens[mensagens.length - 1];
    if (typeof ultima.content === "string") ultima.content += REGRAS;
    else if (Array.isArray(ultima.content)) ultima.content.push({ type: "text", text: REGRAS });

    const resultado = await chamarIA(apiKey, {
      model: "claude-sonnet-4-6",
      max_tokens: Math.min(Number(body.max_tokens) || 6000, 8192),
      messages: mensagens,
    });
    if (!resultado.ok || !resultado.data) return enviar(res, 502, { error: { message: "Não foi possível gerar seu plano agora. Tente novamente." } });

    const plano = normalizarPlano(extrairJSON(textoResposta(resultado.data)));
    if (!plano) return enviar(res, 502, { error: { message: "Não foi possível concluir seu plano. Tente novamente." } });

    const resposta = { ...resultado.data, content: [{ type: "text", text: JSON.stringify(plano) }] };
    res.setHeader("X-A-Body-Validation", "deterministic-normalizer-v6");
    return enviar(res, 200, resposta);
  } catch (e) {
    console.error("A-BODY v2:", e);
    return enviar(res, 500, { error: { message: "Não foi possível gerar seu plano agora. Tente novamente." } });
  }
}
