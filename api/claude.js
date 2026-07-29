// api/claude.js — Vercel Serverless Function
// Geração estruturada de treinos com auditoria interna e respostas sempre em JSON.

export const config = { maxDuration: 60 };

const SUPA_URL = process.env.VITE_SUPABASE_URL || "https://zvmriqxigpwuggyhpoun.supabase.co";
const SUPA_ANON = process.env.VITE_SUPABASE_ANON_KEY || "";
const ORIGENS = ["https://a-body.vercel.app", "http://localhost:5173"];
const QUOTA_DIARIA = 20;
const QUOTA_PRO = 60;
const MARCADORES = ["personal trainer", "ANÁLISE CORPORAL", "Analise as fotos", "analise corporal"];

const PIPELINE_INTERNO = `
FLUXO OBRIGATÓRIO DE RACIOCÍNIO DO A-BODY — EXECUTE INTERNAMENTE E RETORNE APENAS O JSON FINAL:
1. DIAGNÓSTICO: combine anamnese, fotos e documentos disponíveis. Identifique objetivo principal, nível, limitações, até 3 prioridades de melhoria e grupos apenas de manutenção. Não escolha exercícios ainda.
2. ESTRATÉGIA SEMANAL: escolha a divisão compatível com os dias disponíveis, distribua os grupos sem repetir predominância em dias consecutivos e reserve recuperação adequada.
3. VOLUME: defina primeiro as séries semanais e por sessão de cada grupo. Grandes grupos normalmente 8–14 séries diretas por sessão; pequenos grupos 4–8; ombros até 10. Considere volume indireto.
4. EXERCÍCIOS: somente depois selecione exercícios exclusivamente da biblioteca fornecida. Evite redundância: máximo 2 puxadas verticais, 2 remadas horizontais, 2 presses semelhantes e 2 isoladores do mesmo pequeno grupo quando ele já recebe alto volume indireto.
5. SESSÃO: ordene multiarticulares antes de isoladores, defina séries, repetições e descanso. A duração informada inclui cerca de 5 min de aquecimento e 10–15 min de aeróbico. Não preencha tempo com exercícios repetidos.
6. CORE: em planos de 3 ou mais dias, inclua trabalho direto em pelo menos 2 dias; em planos de 2 dias, em pelo menos 1 dia.
7. AUDITORIA FINAL: confira semana inteira, volume, redundância, duração, recuperação, objetivo e limitações. Corrija silenciosamente qualquer falha.
Retorne somente JSON válido, sem markdown e sem explicações.
`;

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  return res.end(JSON.stringify(payload));
}

function corpoTexto(messages) {
  let texto = "";
  for (const m of messages || []) {
    if (typeof m.content === "string") texto += m.content + "\n";
    else if (Array.isArray(m.content)) {
      for (const c of m.content) if (c?.type === "text") texto += String(c.text || "") + "\n";
    }
  }
  return texto;
}

function eGeracaoDeTreino(texto) {
  return /crie plano de treino|montando treino para o aluno|api json de personal trainer/i.test(texto || "");
}

function prepararMensagens(messages, treino) {
  const copia = JSON.parse(JSON.stringify(messages));
  if (!treino) return copia;
  for (const m of copia) {
    const limpar = t => String(t || "")
      .replace(/Max\s*5\s*exercícios\/dia\.?/gi, "Use quantidade variável de exercícios conforme objetivo, volume e duração.")
      .replace(/exatamente\s+5\s+exercícios/gi, "quantidade adequada de exercícios");
    if (typeof m.content === "string") m.content = limpar(m.content);
    else if (Array.isArray(m.content)) for (const c of m.content) if (c?.type === "text") c.text = limpar(c.text);
  }
  const ultima = copia[copia.length - 1];
  if (typeof ultima.content === "string") ultima.content += PIPELINE_INTERNO;
  else if (Array.isArray(ultima.content)) ultima.content.push({ type: "text", text: PIPELINE_INTERNO });
  return copia;
}

function textoResposta(data) {
  return Array.isArray(data?.content)
    ? data.content.filter(x => x?.type === "text").map(x => x.text || "").join("")
    : "";
}

function extrairPlano(texto) {
  const limpo = String(texto || "").replace(/```json|```/gi, "").trim();
  const ini = limpo.indexOf("{");
  const fim = limpo.lastIndexOf("}");
  if (ini < 0 || fim <= ini) return null;
  try {
    const plano = JSON.parse(limpo.slice(ini, fim + 1));
    return plano && Array.isArray(plano.weekDays) && plano.weekDays.length ? plano : null;
  } catch {
    return null;
  }
}

function normalizarNome(v) {
  return String(v || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function auditarPlano(plano) {
  const erros = [];
  let diasCore = 0;
  for (const [i, dia] of (plano?.weekDays || []).entries()) {
    const exs = Array.isArray(dia?.exercises) ? dia.exercises : [];
    if (!exs.length) erros.push(`dia ${i + 1} sem exercícios`);
    if (exs.length > 8) erros.push(`dia ${i + 1} com exercícios demais`);
    const padroes = { vertical: 0, remada: 0, press: 0, biceps: 0, triceps: 0 };
    const volume = { costas: 0, peito: 0, biceps: 0, triceps: 0, ombro: 0, pernas: 0, core: 0 };
    let total = 0;
    for (const ex of exs) {
      const n = normalizarNome(ex?.name);
      const s = Math.max(0, Number(ex?.sets) || 0);
      total += s;
      if (/barra fixa|puxada|pulldown|pull.?down/.test(n)) { padroes.vertical++; volume.costas += s; }
      if (/remada|serrote|cavalinho/.test(n)) { padroes.remada++; volume.costas += s; }
      if (/supino|chest press|flexao/.test(n)) { padroes.press++; volume.peito += s; }
      if (/crucifixo|peck deck|cross.?over|voador/.test(n)) volume.peito += s;
      if (/rosca|biceps/.test(n)) { padroes.biceps++; volume.biceps += s; }
      if (/triceps|mergulho/.test(n)) { padroes.triceps++; volume.triceps += s; }
      if (/desenvolvimento|elevacao lateral|elevacao frontal|shoulder press/.test(n)) volume.ombro += s;
      if (/agach|leg press|extensora|afundo|avanco|bulgar|terra|stiff|romeno|flexora|nordic|hip thrust|ponte|gluteo|panturrilha/.test(n)) volume.pernas += s;
      if (/abdom|abdomen|core|prancha|pallof|dead bug|bird.?dog|roda|elevacao de pernas|leg raise/.test(n)) volume.core += s;
    }
    if (total > 32) erros.push(`dia ${i + 1} com volume total excessivo`);
    if (volume.costas > 14 || volume.peito > 14 || volume.pernas > 18) erros.push(`dia ${i + 1} com volume excessivo de grupo grande`);
    if (volume.biceps > 8 || volume.triceps > 8 || volume.ombro > 10) erros.push(`dia ${i + 1} com volume excessivo de grupo pequeno`);
    if (padroes.vertical > 2 || padroes.remada > 2 || padroes.press > 2) erros.push(`dia ${i + 1} com padrões redundantes`);
    if (volume.costas >= 8 && padroes.biceps > 2) erros.push(`dia ${i + 1} com bíceps redundante após costas`);
    if ((volume.peito + volume.ombro) >= 8 && padroes.triceps > 2) erros.push(`dia ${i + 1} com tríceps redundante após empurrar`);
    if (volume.core > 0) diasCore++;
  }
  const minimoCore = (plano?.weekDays?.length || 0) >= 3 ? 2 : 1;
  if (diasCore < minimoCore) erros.push("distribuição insuficiente de core");
  return erros;
}

async function chamarAnthropic(apiKey, body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });
    const raw = await r.text();
    let data;
    try { data = JSON.parse(raw); }
    catch { data = { error: { message: "Resposta inválida do serviço de IA." } }; }
    return { status: r.status, data };
  } finally {
    clearTimeout(timeout);
  }
}

export default async function handler(req, res) {
  const origem = req.headers.origin || "";
  res.setHeader("Access-Control-Allow-Origin", ORIGENS.includes(origem) ? origem : ORIGENS[0]);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return json(res, 200, { ok: true });
  if (req.method !== "POST") return json(res, 405, { error: { message: "Método não permitido." } });

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return json(res, 503, { error: { message: "Serviço de geração temporariamente indisponível." } });

    const jwt = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!jwt) return json(res, 401, { error: { message: "Faça login para gerar seu plano." } });

    const uResp = await fetch(`${SUPA_URL}/auth/v1/user`, { headers: { apikey: SUPA_ANON, Authorization: `Bearer ${jwt}` } });
    if (!uResp.ok) return json(res, 401, { error: { message: "Sua sessão expirou. Entre novamente." } });

    let quota = QUOTA_DIARIA;
    try {
      const p = await fetch(`${SUPA_URL}/rest/v1/profissionais?select=user_id&limit=1`, { headers: { apikey: SUPA_ANON, Authorization: `Bearer ${jwt}` } });
      if (p.ok && (await p.json()).length) quota = QUOTA_PRO;
    } catch {}

    const q = await fetch(`${SUPA_URL}/rest/v1/rpc/consume_ia_quota`, {
      method: "POST",
      headers: { apikey: SUPA_ANON, Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
      body: JSON.stringify({ limite: quota }),
    });
    if (!(q.ok && await q.json() === true)) return json(res, 429, { error: { message: "Limite diário de geração atingido. Tente amanhã." } });

    const body = req.body || {};
    if (!Array.isArray(body.messages) || !body.messages.length || body.messages.length > 4) {
      return json(res, 400, { error: { message: "Dados da anamnese incompletos." } });
    }

    const texto = corpoTexto(body.messages);
    if (!MARCADORES.some(m => texto.includes(m))) return json(res, 400, { error: { message: "Solicitação não reconhecida." } });

    let anexos = 0;
    for (const m of body.messages) {
      if (typeof m.content === "string") continue;
      if (!Array.isArray(m.content)) return json(res, 400, { error: { message: "Dados inválidos." } });
      for (const c of m.content) {
        if (c?.type === "text") continue;
        const imagemOk = c?.type === "image" && c.source?.type === "base64" && ["image/jpeg", "image/png", "image/webp"].includes(c.source?.media_type);
        const pdfOk = c?.type === "document" && c.source?.type === "base64" && c.source?.media_type === "application/pdf";
        if ((!imagemOk && !pdfOk) || typeof c.source?.data !== "string" || c.source.data.length > 5_000_000) {
          return json(res, 400, { error: { message: "Uma foto ou documento é inválido ou excede o tamanho permitido." } });
        }
        if (++anexos > 5) return json(res, 400, { error: { message: "Envie no máximo cinco anexos." } });
      }
    }

    const treino = eGeracaoDeTreino(texto);
    const mensagens = prepararMensagens(body.messages, treino);
    const base = {
      model: "claude-sonnet-4-6",
      max_tokens: Math.min(Number(body.max_tokens) || 6000, 8192),
      messages: mensagens,
    };

    let resultado = await chamarAnthropic(apiKey, base);
    if (resultado.status >= 400) return json(res, 502, { error: { message: "Não foi possível gerar seu plano agora. Tente novamente em instantes." } });

    if (treino) {
      let plano = extrairPlano(textoResposta(resultado.data));
      let erros = plano ? auditarPlano(plano) : ["JSON inválido"];

      if (erros.length) {
        const correcao = `O plano anterior foi rejeitado internamente por: ${erros.join("; ")}. Refaça apenas a montagem final, mantendo anamnese, diagnóstico e estratégia. Retorne somente JSON válido e já auditado.`;
        resultado = await chamarAnthropic(apiKey, {
          ...base,
          messages: [...mensagens, { role: "assistant", content: textoResposta(resultado.data) }, { role: "user", content: correcao }],
        });
        if (resultado.status >= 400) return json(res, 502, { error: { message: "Não foi possível concluir seu plano agora. Tente novamente em instantes." } });
        plano = extrairPlano(textoResposta(resultado.data));
        erros = plano ? auditarPlano(plano) : ["JSON inválido"];
        if (erros.length) return json(res, 503, { error: { message: "A geração está temporariamente indisponível. Tente novamente em alguns minutos." } });
      }
    }

    res.setHeader("X-A-Body-Validation", "pipeline-single-retry-v5");
    return json(res, 200, resultado.data);
  } catch (e) {
    console.error("A-BODY generation error:", e);
    return json(res, 500, { error: { message: "Não foi possível gerar seu plano agora. Tente novamente em instantes." } });
  }
}
