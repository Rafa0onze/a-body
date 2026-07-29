// api/claude.js — Vercel Serverless Function
// Proxy autenticado da Anthropic com auditoria científica interna dos treinos.

const SUPA_URL = process.env.VITE_SUPABASE_URL || "https://zvmriqxigpwuggyhpoun.supabase.co";
const SUPA_ANON = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXAiLCJyZWYiOiJ6dm1yaXF4aWdwd3VnZ3locG91biIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzgzNTQzMTAwLCJleHAiOjIwOTkxMTkxMDB9.HrnVWaVSaWkGUXRc8MXKjM2Vj2N0xN6wwp95y7zmjbQ";
const ORIGENS = ["https://a-body.vercel.app", "http://localhost:5173"];
const QUOTA_DIARIA = 20;
const QUOTA_PRO = 60;
const MAX_TENTATIVAS_TREINO = 4;
const MARCADORES = ["personal trainer", "ANÁLISE CORPORAL", "Analise as fotos", "analise corporal"];

const REGRAS_CIENTIFICAS = `

PADRÃO CIENTÍFICO A-BODY — REGRAS OBRIGATÓRIAS:
1. Obedeça ao objetivo escolhido na anamnese. A duração não deve ser preenchida com exercícios redundantes.
2. Não programe dois dias consecutivos com predominância de membros inferiores nem repita o mesmo grupo principal em dias consecutivos. Considere sobreposição peito/ombros/tríceps, costas/bíceps e quadríceps/glúteos/posteriores.
3. Por sessão, mantenha grandes grupos normalmente entre 8 e 14 séries diretas e pequenos grupos entre 4 e 8. Não ultrapasse 14 séries de peito, costas, quadríceps, posteriores ou glúteos; 8 de bíceps, tríceps ou panturrilhas; 10 de ombros.
4. Considere volume indireto. Após costas pesadas, use no máximo 2 exercícios diretos de bíceps. Após peito/ombro pesados, use no máximo 2 exercícios diretos de tríceps.
5. Evite redundância: máximo de 2 puxadas verticais, 2 remadas horizontais, 2 presses de peito semelhantes e 3 exercícios de dominância de joelho. Não use três exercícios com função essencialmente igual.
6. Para costas ou peito, use no máximo 4 exercícios diretos por sessão. Para bíceps e tríceps, normalmente no máximo 2.
7. Priorize multiarticulares antes de isoladores, salvo justificativa individual.
8. Inclua core direto: em planos de 3 a 6 dias, pelo menos 2 exercícios em 2 dias diferentes; em planos de 2 dias, pelo menos 1.
9. A duração representa a sessão completa: cerca de 5 minutos de aquecimento e 10 a 15 minutos de aeróbico. Complete eventual tempo restante com core, mobilidade ou aeróbico, nunca com redundância.
10. Use de 4 a 8 exercícios conforme duração, séries e descansos. Qualidade e aderência ao objetivo têm prioridade.
11. Audite a semana inteira antes de responder e devolva somente JSON válido.
`;

function corpoTexto(messages) {
  let texto = "";
  for (const m of messages || []) {
    if (typeof m.content === "string") texto += m.content + "\n";
    else if (Array.isArray(m.content)) {
      for (const c of m.content) if (c.type === "text") texto += (c.text || "") + "\n";
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
  const trocar = t => String(t || "")
    .replace(/Max\s*5\s*exercícios\/dia\.?/gi, "Quantidade variável de 4 a 8 exercícios/dia conforme duração, objetivo e qualidade do programa.")
    .replace(/exatamente\s+5\s+exercícios/gi, "quantidade adequada de exercícios");
  for (const m of copia) {
    if (typeof m.content === "string") m.content = trocar(m.content);
    else if (Array.isArray(m.content)) for (const c of m.content) if (c.type === "text") c.text = trocar(c.text);
  }
  const ultima = copia[copia.length - 1];
  if (typeof ultima.content === "string") ultima.content += REGRAS_CIENTIFICAS;
  else if (Array.isArray(ultima.content)) ultima.content.push({ type: "text", text: REGRAS_CIENTIFICAS });
  return copia;
}

function textoResposta(data) {
  return Array.isArray(data?.content)
    ? data.content.filter(x => x.type === "text").map(x => x.text || "").join("")
    : "";
}

function extrairJSON(texto) {
  const limpo = String(texto || "").replace(/```json|```/gi, "").trim();
  const ini = limpo.indexOf("{");
  const fim = limpo.lastIndexOf("}");
  if (ini < 0 || fim <= ini) return null;
  try { return JSON.parse(limpo.slice(ini, fim + 1)); } catch { return null; }
}

function minutosSolicitados(texto) {
  const trecho = String(texto || "").match(/Duração:\s*([^\n|]+)/i)?.[1]?.trim() || "";
  let m = trecho.match(/(\d+)\s*h\s*(\d+)?/i);
  if (m) return Number(m[1]) * 60 + Number(m[2] || 0);
  m = trecho.match(/(\d+)\s*min/i);
  if (m) return Number(m[1]);
  m = trecho.match(/^(\d+)$/);
  return m ? Number(m[1]) : null;
}

function limiteExercicios(minutos) {
  if (!minutos) return 8;
  if (minutos <= 45) return 5;
  if (minutos <= 60) return 6;
  if (minutos <= 75) return 7;
  return 8;
}

function estimarMinutosDia(dia) {
  const exs = Array.isArray(dia?.exercises) ? dia.exercises : [];
  let segundos = 0;
  exs.forEach((ex, i) => {
    const series = Math.max(1, Number(ex.sets) || 3);
    const descanso = Math.max(30, Number(ex.rest) || 60);
    const execucao = ex.isometric ? Math.max(30, Number(ex.isoSeconds) || 45) : 40;
    segundos += series * execucao + Math.max(0, series - 1) * descanso;
    if (i > 0) segundos += 90;
  });
  const cardioMedio = (Number(dia?.postCardio?.minMinutes || 10) + Number(dia?.postCardio?.maxMinutes || 15)) / 2;
  return Math.round(segundos / 60 + 5 + cardioMedio);
}

function nomeNorm(ex) {
  return String(ex?.name || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function classificar(ex) {
  const n = nomeNorm(ex);
  const grupos = new Set();
  const padroes = new Set();
  if (/barra fixa|puxada|pulldown|pull.?down/.test(n)) { grupos.add("costas"); padroes.add("puxada_vertical"); }
  if (/remada|serrote|cavalinho/.test(n)) { grupos.add("costas"); padroes.add("remada_horizontal"); }
  if (/face pull|pullover/.test(n)) { grupos.add("costas"); padroes.add("acessorio_costas"); }
  if (/supino|flexao de braco|chest press/.test(n)) { grupos.add("peito"); padroes.add("press_peito"); }
  if (/crucifixo|peck deck|cross.?over|voador/.test(n)) { grupos.add("peito"); padroes.add("isolador_peito"); }
  if (/desenvolvimento|shoulder press/.test(n)) { grupos.add("ombro"); padroes.add("press_ombro"); }
  if (/elevacao lateral|elevacao frontal/.test(n)) { grupos.add("ombro"); padroes.add("isolador_ombro"); }
  if (/rosca|biceps/.test(n)) { grupos.add("biceps"); padroes.add("isolador_biceps"); }
  if (/triceps|mergulho/.test(n)) { grupos.add("triceps"); padroes.add("isolador_triceps"); }
  if (/agachamento|hack squat|leg press|afundo|avanco|bulgar/.test(n)) { grupos.add("quadriceps"); padroes.add("dominancia_joelho"); }
  if (/terra|stiff|romeno|flexora|nordic/.test(n)) { grupos.add("posterior"); padroes.add("dominancia_quadril"); }
  if (/hip thrust|ponte|gluteo/.test(n)) { grupos.add("gluteos"); padroes.add("extensao_quadril"); }
  if (/panturrilha/.test(n)) { grupos.add("panturrilha"); padroes.add("panturrilha"); }
  if (/abdom|abdomen|core|prancha|pallof|dead bug|bird.?dog|roda|elevacao de pernas|leg raise/.test(n)) { grupos.add("core"); padroes.add("core"); }
  return { grupos, padroes };
}

function gruposDoDia(dia) {
  const totais = { lower: 0, push: 0, pull: 0 };
  for (const ex of dia?.exercises || []) {
    const s = Number(ex.sets) || 0;
    const { grupos } = classificar(ex);
    if (["quadriceps", "posterior", "gluteos"].some(g => grupos.has(g))) totais.lower += s;
    if (["peito", "ombro", "triceps"].some(g => grupos.has(g))) totais.push += s;
    if (["costas", "biceps"].some(g => grupos.has(g))) totais.pull += s;
  }
  const predominantes = new Set();
  const max = Math.max(totais.lower, totais.push, totais.pull);
  if (max > 0) for (const [g, v] of Object.entries(totais)) if (v === max || v >= max * 0.8) predominantes.add(g);
  return predominantes;
}

function validarPlano(textoRespostaIA, textoPedido) {
  const plano = extrairJSON(textoRespostaIA);
  if (!plano || !Array.isArray(plano.weekDays) || !plano.weekDays.length) return ["estrutura inválida"];
  const erros = [];
  const alvo = minutosSolicitados(textoPedido);
  const maxEx = limiteExercicios(alvo);
  const volumeSemanal = {};

  for (let i = 1; i < plano.weekDays.length; i++) {
    const ant = gruposDoDia(plano.weekDays[i - 1]);
    const atu = gruposDoDia(plano.weekDays[i]);
    if (ant.has("lower") && atu.has("lower")) erros.push(`dias ${i} e ${i + 1}: pernas consecutivas`);
    if (ant.has("push") && atu.has("push")) erros.push(`dias ${i} e ${i + 1}: push consecutivo`);
    if (ant.has("pull") && atu.has("pull")) erros.push(`dias ${i} e ${i + 1}: pull consecutivo`);
  }

  let exerciciosCore = 0;
  const diasCore = new Set();
  for (const [i, dia] of plano.weekDays.entries()) {
    const exs = Array.isArray(dia.exercises) ? dia.exercises : [];
    if (!exs.length) erros.push(`dia ${i + 1}: sem exercícios`);
    if (exs.length > maxEx) erros.push(`dia ${i + 1}: exercícios excessivos`);

    const volume = {};
    const contagemPadrao = {};
    const exerciciosGrupo = {};
    let seriesTotais = 0;
    for (const ex of exs) {
      const s = Number(ex.sets) || 0;
      seriesTotais += s;
      const { grupos, padroes } = classificar(ex);
      for (const g of grupos) {
        volume[g] = (volume[g] || 0) + s;
        volumeSemanal[g] = (volumeSemanal[g] || 0) + s;
        exerciciosGrupo[g] = (exerciciosGrupo[g] || 0) + 1;
      }
      for (const p of padroes) contagemPadrao[p] = (contagemPadrao[p] || 0) + 1;
    }

    if (seriesTotais > 32) erros.push(`dia ${i + 1}: séries totais excessivas`);
    for (const g of ["peito", "costas", "quadriceps", "posterior", "gluteos"]) if ((volume[g] || 0) > 14) erros.push(`dia ${i + 1}: volume excessivo de ${g}`);
    for (const g of ["biceps", "triceps", "panturrilha"]) if ((volume[g] || 0) > 8) erros.push(`dia ${i + 1}: volume excessivo de ${g}`);
    if ((volume.ombro || 0) > 10) erros.push(`dia ${i + 1}: volume excessivo de ombro`);
    if ((exerciciosGrupo.costas || 0) > 4) erros.push(`dia ${i + 1}: exercícios excessivos de costas`);
    if ((exerciciosGrupo.peito || 0) > 4) erros.push(`dia ${i + 1}: exercícios excessivos de peito`);
    if ((exerciciosGrupo.biceps || 0) > 2 && (volume.costas || 0) >= 8) erros.push(`dia ${i + 1}: bíceps redundante`);
    if ((exerciciosGrupo.triceps || 0) > 2 && ((volume.peito || 0) + (volume.ombro || 0)) >= 8) erros.push(`dia ${i + 1}: tríceps redundante`);
    if ((contagemPadrao.puxada_vertical || 0) > 2) erros.push(`dia ${i + 1}: puxadas verticais redundantes`);
    if ((contagemPadrao.remada_horizontal || 0) > 2) erros.push(`dia ${i + 1}: remadas redundantes`);
    if ((contagemPadrao.press_peito || 0) > 2) erros.push(`dia ${i + 1}: presses redundantes`);
    if ((contagemPadrao.dominancia_joelho || 0) > 3) erros.push(`dia ${i + 1}: dominância de joelho redundante`);
    if ((volume.core || 0) > 0) { exerciciosCore += exerciciosGrupo.core || 0; diasCore.add(i); }

    if (alvo) {
      const estimado = estimarMinutosDia(dia);
      if (estimado < Math.max(30, alvo - 20) && exs.length < maxEx) erros.push(`dia ${i + 1}: duração insuficiente`);
      if (estimado > alvo + 10) erros.push(`dia ${i + 1}: duração excessiva`);
    }
  }

  const minimoCore = plano.weekDays.length >= 3 ? 2 : 1;
  const minimoDiasCore = plano.weekDays.length >= 3 ? 2 : 1;
  if (exerciciosCore < minimoCore) erros.push("core insuficiente");
  if (diasCore.size < minimoDiasCore) erros.push("core mal distribuído");
  for (const g of ["peito", "costas", "quadriceps", "posterior", "gluteos"]) if ((volumeSemanal[g] || 0) > 28) erros.push(`volume semanal excessivo de ${g}`);
  for (const g of ["biceps", "triceps", "ombro"]) if ((volumeSemanal[g] || 0) > 20) erros.push(`volume semanal excessivo de ${g}`);
  return erros;
}

async function chamarAnthropic(apiKey, body) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify(body),
  });
  return { status: r.status, data: await r.json() };
}

function mensagemCorrecao(erros, tentativa) {
  return `AUDITORIA INTERNA — tentativa ${tentativa}: ${erros.join("; ")}. Refaça integralmente o plano em JSON válido, mantendo a anamnese e a lista de exercícios permitidos. Corrija sequência semanal, volume, redundância, core e duração. Não explique e não mencione a auditoria.`;
}

export default async function handler(req, res) {
  const origem = req.headers.origin || "";
  res.setHeader("Access-Control-Allow-Origin", ORIGENS.includes(origem) ? origem : ORIGENS[0]);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: { message: "Method not allowed" } });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: { message: "Serviço de geração temporariamente indisponível." } });
  const jwt = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!jwt) return res.status(401).json({ error: { message: "Faça login para gerar seu plano." } });
  const uResp = await fetch(`${SUPA_URL}/auth/v1/user`, { headers: { apikey: SUPA_ANON, Authorization: `Bearer ${jwt}` } });
  if (!uResp.ok) return res.status(401).json({ error: { message: "Sua sessão expirou. Faça login novamente." } });

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
  if (!(q.ok && await q.json() === true)) return res.status(429).json({ error: { message: `Limite diário de ${quota} gerações atingido. Tente amanhã.` } });

  const body = req.body || {};
  if (!Array.isArray(body.messages) || !body.messages.length || body.messages.length > 4) return res.status(400).json({ error: { message: "Não foi possível processar os dados enviados." } });
  const texto = corpoTexto(body.messages);
  if (!MARCADORES.some(m => texto.includes(m))) return res.status(400).json({ error: { message: "Solicitação não reconhecida." } });

  let anexos = 0;
  for (const m of body.messages) {
    if (typeof m.content === "string") continue;
    if (!Array.isArray(m.content)) return res.status(400).json({ error: { message: "Não foi possível processar os dados enviados." } });
    for (const c of m.content) {
      if (c.type === "text") continue;
      const imagemOk = c.type === "image" && c.source?.type === "base64" && ["image/jpeg", "image/png", "image/webp"].includes(c.source?.media_type);
      const pdfOk = c.type === "document" && c.source?.type === "base64" && c.source?.media_type === "application/pdf";
      if ((!imagemOk && !pdfOk) || typeof c.source?.data !== "string" || c.source.data.length > 5_000_000) return res.status(400).json({ error: { message: "Um dos anexos é inválido ou muito grande." } });
      if (++anexos > 5) return res.status(400).json({ error: { message: "Envie no máximo cinco anexos." } });
    }
  }

  const treino = eGeracaoDeTreino(texto);
  const mensagensBase = prepararMensagens(body.messages, treino);
  const maxTokens = Math.min(Number(body.max_tokens) || 2000, 8192);

  try {
    if (!treino) {
      const result = await chamarAnthropic(apiKey, { model: "claude-sonnet-4-6", max_tokens: maxTokens, messages: mensagensBase });
      if (result.status >= 400) return res.status(result.status).json(result.data);
      return res.status(result.status).json(result.data);
    }

    let mensagensTentativa = mensagensBase;
    for (let tentativa = 1; tentativa <= MAX_TENTATIVAS_TREINO; tentativa++) {
      const result = await chamarAnthropic(apiKey, { model: "claude-sonnet-4-6", max_tokens: maxTokens, messages: mensagensTentativa });
      if (result.status >= 400) {
        if (tentativa === MAX_TENTATIVAS_TREINO) return res.status(503).json({ error: { message: "Não foi possível concluir seu plano agora. Tente novamente em alguns instantes." } });
        continue;
      }

      const resposta = textoResposta(result.data);
      const erros = validarPlano(resposta, texto);
      if (!erros.length) {
        res.setHeader("X-A-Body-Validation", "ACSM-2026-IUSCA-quality-v4");
        res.setHeader("X-A-Body-Generation-Attempts", String(tentativa));
        return res.status(result.status).json(result.data);
      }

      mensagensTentativa = [
        ...mensagensBase,
        { role: "assistant", content: resposta },
        { role: "user", content: mensagemCorrecao(erros, tentativa + 1) },
      ];
    }

    return res.status(503).json({ error: { message: "Não foi possível concluir seu plano agora. Tente novamente em alguns instantes." } });
  } catch {
    return res.status(503).json({ error: { message: "Não foi possível concluir seu plano agora. Tente novamente em alguns instantes." } });
  }
}
