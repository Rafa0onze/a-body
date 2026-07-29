// api/claude.js — geração estruturada e validação interna de treinos

export const config = { maxDuration: 60 };

const SUPA_URL = process.env.VITE_SUPABASE_URL || "https://zvmriqxigpwuggyhpoun.supabase.co";
const SUPA_ANON = process.env.VITE_SUPABASE_ANON_KEY || "";
const ORIGENS = ["https://a-body.vercel.app", "http://localhost:5173"];
const QUOTA_DIARIA = 20;
const QUOTA_PRO = 60;
const MARCADORES = ["personal trainer", "ANÁLISE CORPORAL", "Analise as fotos", "analise corporal"];

const REGRAS_BASE = `
PADRÃO CIENTÍFICO A-BODY — REGRAS OBRIGATÓRIAS:
1. Obedeça ao objetivo, nível, limitações, equipamentos e disponibilidade informados na anamnese.
2. A duração informada é da sessão completa: cerca de 5 min de aquecimento, musculação e 10–15 min de aeróbico pós-treino.
3. Não use exercícios redundantes apenas para preencher tempo.
4. Grandes grupos: normalmente 8–14 séries diretas por sessão. Pequenos grupos: 4–8. Ombros: até 10 quando forem prioridade.
5. Em uma sessão, no máximo 4 exercícios diretos para peito ou costas; normalmente 2 para bíceps ou tríceps quando já houver alto volume indireto.
6. No máximo 2 puxadas verticais, 2 remadas horizontais, 2 presses semelhantes e 2 isoladores equivalentes para o mesmo pequeno grupo.
7. Considere volume indireto de bíceps em puxadas/remadas e de tríceps/ombro em supinos e desenvolvimentos.
8. Inclua core direto: em planos de 3–6 dias, ao menos 2 exercícios distribuídos em 2 dias; em planos de 2 dias, ao menos 1.
9. Evite repetir o mesmo grupo predominante em dias consecutivos e não programe dois dias predominantes de pernas em sequência.
10. Use somente exercícios da lista disponibilizada e copie os nomes literalmente.
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

function anexarTexto(messages, textoExtra) {
  const copia = JSON.parse(JSON.stringify(messages));
  const ultima = copia[copia.length - 1];
  if (typeof ultima.content === "string") ultima.content += "\n\n" + textoExtra;
  else if (Array.isArray(ultima.content)) ultima.content.push({ type: "text", text: textoExtra });
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
  return null;
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
  const cardio = (Number(dia?.postCardio?.minMinutes || 10) + Number(dia?.postCardio?.maxMinutes || 15)) / 2;
  return Math.round(segundos / 60 + 5 + cardio);
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

function gruposPredominantes(dia) {
  const t = { lower: 0, push: 0, pull: 0 };
  for (const ex of dia?.exercises || []) {
    const s = Number(ex.sets) || 0;
    const { grupos } = classificar(ex);
    if (["quadriceps", "posterior", "gluteos"].some(g => grupos.has(g))) t.lower += s;
    if (["peito", "ombro", "triceps"].some(g => grupos.has(g))) t.push += s;
    if (["costas", "biceps"].some(g => grupos.has(g))) t.pull += s;
  }
  const out = new Set();
  const max = Math.max(t.lower, t.push, t.pull);
  if (max > 0) for (const [g, v] of Object.entries(t)) if (v === max || v >= max * 0.85) out.add(g);
  return out;
}

function validarPlano(textoPlano, textoPedido) {
  const plano = extrairJSON(textoPlano);
  if (!plano || !Array.isArray(plano.weekDays) || !plano.weekDays.length) return ["estrutura inválida"];

  const erros = [];
  const alvo = minutosSolicitados(textoPedido);
  const maxEx = limiteExercicios(alvo);
  const volumeSemanal = {};
  let exerciciosCore = 0;
  const diasCore = new Set();

  for (let i = 1; i < plano.weekDays.length; i++) {
    const ant = gruposPredominantes(plano.weekDays[i - 1]);
    const atu = gruposPredominantes(plano.weekDays[i]);
    if (ant.has("lower") && atu.has("lower")) erros.push(`dias ${i} e ${i + 1}: pernas consecutivas`);
  }

  for (const [i, dia] of plano.weekDays.entries()) {
    const exs = Array.isArray(dia.exercises) ? dia.exercises : [];
    if (!exs.length) erros.push(`dia ${i + 1}: sem exercícios`);
    if (exs.length > maxEx) erros.push(`dia ${i + 1}: exercícios acima do limite`);

    const volume = {};
    const padroes = {};
    const qtdGrupo = {};
    let seriesTotais = 0;

    for (const ex of exs) {
      const s = Number(ex.sets) || 0;
      seriesTotais += s;
      const c = classificar(ex);
      for (const g of c.grupos) {
        volume[g] = (volume[g] || 0) + s;
        volumeSemanal[g] = (volumeSemanal[g] || 0) + s;
        qtdGrupo[g] = (qtdGrupo[g] || 0) + 1;
      }
      for (const p of c.padroes) padroes[p] = (padroes[p] || 0) + 1;
    }

    if (seriesTotais > 30) erros.push(`dia ${i + 1}: séries totais excessivas`);
    for (const g of ["peito", "costas", "quadriceps", "posterior", "gluteos"]) if ((volume[g] || 0) > 14) erros.push(`dia ${i + 1}: volume excessivo de ${g}`);
    for (const g of ["biceps", "triceps", "panturrilha"]) if ((volume[g] || 0) > 8) erros.push(`dia ${i + 1}: volume excessivo de ${g}`);
    if ((volume.ombro || 0) > 10) erros.push(`dia ${i + 1}: volume excessivo de ombro`);
    if ((qtdGrupo.costas || 0) > 4 || (qtdGrupo.peito || 0) > 4) erros.push(`dia ${i + 1}: exercícios redundantes de grupo grande`);
    if ((qtdGrupo.biceps || 0) > 2 && (volume.costas || 0) >= 8) erros.push(`dia ${i + 1}: bíceps redundante após costas`);
    if ((qtdGrupo.triceps || 0) > 2 && ((volume.peito || 0) + (volume.ombro || 0)) >= 8) erros.push(`dia ${i + 1}: tríceps redundante após empurrar`);
    for (const p of ["puxada_vertical", "remada_horizontal", "press_peito", "isolador_biceps", "isolador_triceps"]) if ((padroes[p] || 0) > 2) erros.push(`dia ${i + 1}: padrão redundante ${p}`);

    if ((volume.core || 0) > 0) { exerciciosCore += qtdGrupo.core || 0; diasCore.add(i); }

    if (alvo) {
      const estimado = estimarMinutosDia(dia);
      if (estimado > alvo + 12) erros.push(`dia ${i + 1}: duração excessiva`);
      if (estimado < Math.max(30, alvo - 25) && exs.length < maxEx) erros.push(`dia ${i + 1}: duração insuficiente`);
    }
  }

  const minimoCore = plano.weekDays.length >= 3 ? 2 : 1;
  const minimoDiasCore = plano.weekDays.length >= 3 ? 2 : 1;
  if (exerciciosCore < minimoCore || diasCore.size < minimoDiasCore) erros.push("core insuficiente ou mal distribuído");
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

async function executarEtapa(apiKey, messages, maxTokens = 2500) {
  return chamarAnthropic(apiKey, { model: "claude-sonnet-4-6", max_tokens: maxTokens, messages });
}

async function gerarTreinoEmEtapas(apiKey, mensagensOriginais, textoOriginal) {
  const contextoCurto = textoOriginal.slice(0, 14000);

  const diagnosticoPrompt = `Você é a etapa 1 de um sistema de prescrição de treino. Analise a anamnese, a análise corporal por fotos e documentos fornecidos. NÃO escolha exercícios e NÃO monte dias de treino. Retorne somente JSON válido neste formato:
{"objetivoPrincipal":"...","objetivosSecundarios":["..."],"prioridadesMusculares":[{"grupo":"...","prioridade":1,"motivo":"..."}],"pontosDeManutencao":["..."],"restricoes":["..."],"nivel":"...","necessidadesPrincipais":["..."]}
Priorize no máximo 3 necessidades principais. Seja conservador com inferências visuais.\n\nDADOS:\n${contextoCurto}`;
  const dResp = await executarEtapa(apiKey, [{ role: "user", content: diagnosticoPrompt }], 1800);
  if (dResp.status >= 400) throw new Error("diagnóstico indisponível");
  const diagnostico = extrairJSON(textoResposta(dResp.data));
  if (!diagnostico) throw new Error("diagnóstico inválido");

  const estrategiaPrompt = `Você é a etapa 2 de um sistema de prescrição. Com base no diagnóstico e na anamnese abaixo, defina a divisão semanal e distribua séries por grupo muscular. NÃO escolha exercícios. Retorne somente JSON válido:
{"split":"...","dias":[{"id":"d1","label":"A","foco":["..."],"seriesPorGrupo":{"costas":10},"core":false,"cardioMin":10}],"volumeSemanal":{"costas":14},"justificativaCurta":"..."}
Regras: exatamente o número de dias solicitado; recuperação adequada; prioridades recebem maior volume sem exceder limites; core em pelo menos 2 dias quando houver 3 ou mais dias; a duração inclui aquecimento e aeróbico. ${REGRAS_BASE}\nDIAGNÓSTICO:\n${JSON.stringify(diagnostico)}\nANAMNESE:\n${contextoCurto}`;
  const eResp = await executarEtapa(apiKey, [{ role: "user", content: estrategiaPrompt }], 2200);
  if (eResp.status >= 400) throw new Error("estratégia indisponível");
  const estrategia = extrairJSON(textoResposta(eResp.data));
  if (!estrategia) throw new Error("estratégia inválida");

  const montagemPrompt = `Você é a etapa 3 e final. Monte o plano usando obrigatoriamente o DIAGNÓSTICO e a ESTRATÉGIA aprovados abaixo. Escolha somente exercícios existentes na lista fornecida nas mensagens anteriores e copie seus nomes literalmente. Preserve exatamente o formato JSON solicitado originalmente pelo aplicativo. Não acrescente campos fora do formato. Não explique.\n\nDIAGNÓSTICO APROVADO:\n${JSON.stringify(diagnostico)}\n\nESTRATÉGIA APROVADA:\n${JSON.stringify(estrategia)}\n\n${REGRAS_BASE}`;
  const mensagensMontagem = anexarTexto(mensagensOriginais, montagemPrompt);
  let finalResp = await executarEtapa(apiKey, mensagensMontagem, 8192);
  if (finalResp.status >= 400) throw new Error("montagem indisponível");

  let erros = validarPlano(textoResposta(finalResp.data), textoOriginal);
  for (let tentativa = 0; erros.length && tentativa < 2; tentativa++) {
    const reparo = `Corrija internamente o plano anterior e retorne somente o JSON final no mesmo formato. Não altere diagnóstico nem estratégia. Falhas detectadas: ${erros.join("; ")}. Não explique.`;
    finalResp = await executarEtapa(apiKey, [
      ...mensagensMontagem,
      { role: "assistant", content: textoResposta(finalResp.data) },
      { role: "user", content: reparo },
    ], 8192);
    if (finalResp.status >= 400) throw new Error("correção indisponível");
    erros = validarPlano(textoResposta(finalResp.data), textoOriginal);
  }

  if (erros.length) throw new Error("não foi possível concluir um plano válido");
  return finalResp;
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
  if (!apiKey) return res.status(500).json({ error: { message: "Serviço de IA indisponível." } });
  const jwt = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!jwt) return res.status(401).json({ error: { message: "Faça login para gerar seu plano." } });

  const uResp = await fetch(`${SUPA_URL}/auth/v1/user`, { headers: { apikey: SUPA_ANON, Authorization: `Bearer ${jwt}` } });
  if (!uResp.ok) return res.status(401).json({ error: { message: "Sessão expirada. Faça login novamente." } });

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
  if (!(q.ok && await q.json() === true)) return res.status(429).json({ error: { message: "Limite diário de geração atingido. Tente novamente amanhã." } });

  const body = req.body || {};
  if (!Array.isArray(body.messages) || !body.messages.length || body.messages.length > 4) return res.status(400).json({ error: { message: "Não foi possível processar os dados enviados." } });
  const texto = corpoTexto(body.messages);
  if (!MARCADORES.some(m => texto.includes(m))) return res.status(400).json({ error: { message: "Solicitação não reconhecida." } });

  let anexos = 0;
  for (const m of body.messages) {
    if (typeof m.content === "string") continue;
    if (!Array.isArray(m.content)) return res.status(400).json({ error: { message: "Dados inválidos." } });
    for (const c of m.content) {
      if (c.type === "text") continue;
      const imagemOk = c.type === "image" && c.source?.type === "base64" && ["image/jpeg", "image/png", "image/webp"].includes(c.source?.media_type);
      const pdfOk = c.type === "document" && c.source?.type === "base64" && c.source?.media_type === "application/pdf";
      if ((!imagemOk && !pdfOk) || typeof c.source?.data !== "string" || c.source.data.length > 5_000_000) return res.status(400).json({ error: { message: "Um anexo não pôde ser processado." } });
      if (++anexos > 5) return res.status(400).json({ error: { message: "Envie no máximo cinco anexos." } });
    }
  }

  try {
    const treino = eGeracaoDeTreino(texto);
    let result;
    if (treino) result = await gerarTreinoEmEtapas(apiKey, body.messages, texto);
    else result = await executarEtapa(apiKey, body.messages, Math.min(Number(body.max_tokens) || 2000, 8192));

    if (result.status >= 400) return res.status(result.status).json({ error: { message: "Não foi possível concluir agora. Tente novamente em instantes." } });
    res.setHeader("X-A-Body-Validation", treino ? "staged-diagnosis-strategy-plan-v1" : "analysis-v1");
    return res.status(200).json(result.data);
  } catch (e) {
    console.error("A-Body generation:", e.message);
    return res.status(503).json({ error: { message: "Não foi possível concluir seu plano agora. Tente novamente em instantes." } });
  }
}
