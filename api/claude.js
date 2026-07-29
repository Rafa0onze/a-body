// api/claude.js — Vercel Serverless Function
// Proxy autenticado da Anthropic com validação científica dos treinos.

const SUPA_URL = process.env.VITE_SUPABASE_URL || "https://zvmriqxigpwuggyhpoun.supabase.co";
const SUPA_ANON = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXAiLCJyZWYiOiJ6dm1yaXF4aWdwd3VnZ3locG91biIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzgzNTQzMTAwLCJleHAiOjIwOTkxMTkxMDB9.HrnVWaVSaWkGUXRc8MXKjM2Vj2N0xN6wwp95y7zmjbQ";
const ORIGENS = ["https://a-body.vercel.app", "http://localhost:5173"];
const QUOTA_DIARIA = 20;
const QUOTA_PRO = 60;
const MARCADORES = ["personal trainer", "ANÁLISE CORPORAL", "Analise as fotos", "analise corporal"];

const REGRAS_CIENTIFICAS = `

PADRÃO CIENTÍFICO A-BODY — REGRAS OBRIGATÓRIAS:
1. A prioridade é obedecer ao objetivo já escolhido na anamnese. Não trate a duração como meta a ser preenchida com exercícios redundantes.
2. Não programe dois dias consecutivos com predominância de membros inferiores nem repita o mesmo grupo principal em dias consecutivos. Considere sobreposição peito/ombros/tríceps, costas/bíceps e quadríceps/glúteos/posteriores.
3. Distribua o volume semanal. Por sessão, grandes grupos devem ficar normalmente entre 8 e 14 séries diretas; pequenos grupos entre 4 e 8 séries diretas. Não ultrapasse 14 séries diretas de peito, costas, quadríceps, posteriores ou glúteos, nem 8 séries diretas de bíceps, tríceps ou panturrilhas. Deltoides podem chegar a 10 séries diretas quando forem o foco principal.
4. Considere volume indireto: puxadas e remadas já recrutam bíceps; supinos recrutam tríceps e deltoide anterior; desenvolvimentos recrutam tríceps; remadas e face pull recrutam deltoide posterior. Após costas pesadas, use normalmente no máximo 2 exercícios diretos de bíceps. Após peito/ombro pesados, use normalmente no máximo 2 exercícios diretos de tríceps.
5. Evite redundância. Em um mesmo treino, use no máximo 2 puxadas verticais e 2 remadas horizontais; no máximo 2 supinos/presses semelhantes; no máximo 2 variações equivalentes de agachamento/leg press; no máximo 2 isoladores do mesmo pequeno grupo. Não use três exercícios que cumpram essencialmente a mesma função.
6. Para costas ou peito, use normalmente no máximo 4 exercícios diretos por sessão. Para bíceps e tríceps, normalmente no máximo 2 exercícios diretos; 3 somente se forem prioridade explícita da anamnese e o volume total permanecer adequado.
7. Priorize exercícios multiarticulares e tecnicamente exigentes antes dos isoladores, salvo justificativa individual.
8. Inclua trabalho direto de core: em planos de 3 a 6 dias, ao menos 2 exercícios em 2 dias diferentes; em planos de 2 dias, ao menos 1 exercício. Compostos não substituem core direto.
9. A duração informada representa a sessão completa: aproximadamente 5 minutos de aquecimento e 10 a 15 minutos de aeróbico pós-treino. O restante é musculação. Se o treino de qualidade terminar antes, complete com core, mobilidade ou aeróbico — nunca com volume redundante.
10. Use entre 4 e 8 exercícios conforme duração, séries e descansos. Estime execução, descansos e 1 a 2 minutos de transição. A qualidade e a aderência ao objetivo têm prioridade sobre ocupar cada minuto.
11. Faça uma auditoria da semana inteira: volume por músculo, volume indireto, padrões repetidos, equilíbrio agonista/antagonista, frequência, recuperação, core, duração e aderência ao objetivo. Corrija qualquer falha antes de retornar o JSON.
`;

function corpoTexto(messages) {
  let texto = "";
  for (const m of messages || []) {
    if (typeof m.content === "string") texto += m.content + "\n";
    else if (Array.isArray(m.content)) for (const c of m.content) if (c.type === "text") texto += (c.text || "") + "\n";
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
    const trocar = t => String(t || "")
      .replace(/Max\s*5\s*exercícios\/dia\.?/gi, "Quantidade variável de 4 a 8 exercícios/dia conforme duração, objetivo e qualidade do programa.")
      .replace(/exatamente\s+5\s+exercícios/gi, "quantidade adequada de exercícios");
    if (typeof m.content === "string") m.content = trocar(m.content);
    else if (Array.isArray(m.content)) for (const c of m.content) if (c.type === "text") c.text = trocar(c.text);
  }
  const ultima = copia[copia.length - 1];
  if (typeof ultima.content === "string") ultima.content += REGRAS_CIENTIFICAS;
  else if (Array.isArray(ultima.content)) ultima.content.push({ type: "text", text: REGRAS_CIENTIFICAS });
  return copia;
}

function textoResposta(data) {
  return Array.isArray(data?.content) ? data.content.filter(x => x.type === "text").map(x => x.text || "").join("") : "";
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
  if (!plano || !Array.isArray(plano.weekDays) || !plano.weekDays.length) return ["JSON ou estrutura weekDays inválida"];
  const erros = [];
  const alvo = minutosSolicitados(textoPedido);
  const maxEx = limiteExercicios(alvo);
  const volumeSemanal = {};

  for (let i = 1; i < plano.weekDays.length; i++) {
    const ant = gruposDoDia(plano.weekDays[i - 1]);
    const atu = gruposDoDia(plano.weekDays[i]);
    if (ant.has("lower") && atu.has("lower")) erros.push(`dias ${i} e ${i + 1} têm membros inferiores consecutivos`);
    if (ant.has("push") && atu.has("push")) erros.push(`dias ${i} e ${i + 1} repetem predominância de empurrar`);
    if (ant.has("pull") && atu.has("pull")) erros.push(`dias ${i} e ${i + 1} repetem predominância de puxar`);
  }

  let exerciciosCore = 0;
  const diasCore = new Set();

  for (const [i, dia] of plano.weekDays.entries()) {
    const exs = Array.isArray(dia.exercises) ? dia.exercises : [];
    if (!exs.length) erros.push(`dia ${i + 1} sem exercícios`);
    if (exs.length > maxEx) erros.push(`dia ${i + 1} excede ${maxEx} exercícios para ${alvo || "a duração escolhida"}`);

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

    if (seriesTotais > 32) erros.push(`dia ${i + 1} concentra volume excessivo (${seriesTotais} séries)`);
    for (const g of ["peito", "costas", "quadriceps", "posterior", "gluteos"]) if ((volume[g] || 0) > 14) erros.push(`dia ${i + 1} excede 14 séries diretas de ${g} (${volume[g]})`);
    for (const g of ["biceps", "triceps", "panturrilha"]) if ((volume[g] || 0) > 8) erros.push(`dia ${i + 1} excede 8 séries diretas de ${g} (${volume[g]})`);
    if ((volume.ombro || 0) > 10) erros.push(`dia ${i + 1} excede 10 séries diretas de ombro (${volume.ombro})`);

    if ((exerciciosGrupo.costas || 0) > 4) erros.push(`dia ${i + 1} tem mais de 4 exercícios diretos de costas`);
    if ((exerciciosGrupo.peito || 0) > 4) erros.push(`dia ${i + 1} tem mais de 4 exercícios diretos de peito`);
    if ((exerciciosGrupo.biceps || 0) > 2 && (volume.costas || 0) >= 8) erros.push(`dia ${i + 1} tem mais de 2 exercícios de bíceps após volume alto de costas`);
    if ((exerciciosGrupo.triceps || 0) > 2 && ((volume.peito || 0) + (volume.ombro || 0)) >= 8) erros.push(`dia ${i + 1} tem mais de 2 exercícios de tríceps após volume alto de empurrar`);

    if ((contagemPadrao.puxada_vertical || 0) > 2) erros.push(`dia ${i + 1} repete mais de 2 puxadas verticais`);
    if ((contagemPadrao.remada_horizontal || 0) > 2) erros.push(`dia ${i + 1} repete mais de 2 remadas horizontais`);
    if ((contagemPadrao.press_peito || 0) > 2) erros.push(`dia ${i + 1} repete mais de 2 presses de peito semelhantes`);
    if ((contagemPadrao.dominancia_joelho || 0) > 3) erros.push(`dia ${i + 1} concentra exercícios redundantes de dominância de joelho`);
    if ((contagemPadrao.isolador_biceps || 0) > 2 && (volume.costas || 0) >= 8) erros.push(`dia ${i + 1} tem isoladores redundantes de bíceps`);
    if ((contagemPadrao.isolador_triceps || 0) > 2 && ((volume.peito || 0) + (volume.ombro || 0)) >= 8) erros.push(`dia ${i + 1} tem isoladores redundantes de tríceps`);

    if ((volume.core || 0) > 0) { exerciciosCore += exerciciosGrupo.core || 0; diasCore.add(i); }

    if (alvo) {
      const estimado = estimarMinutosDia(dia);
      const minimo = Math.max(30, alvo - 20);
      const maximo = alvo + 10;
      if (estimado < minimo && exs.length < maxEx) erros.push(`dia ${i + 1} está curto: estimado ${estimado} min para meta de ${alvo} min`);
      if (estimado > maximo) erros.push(`dia ${i + 1} está longo: estimado ${estimado} min para meta de ${alvo} min`);
    }
  }

  const minimoCore = plano.weekDays.length >= 3 ? 2 : 1;
  const minimoDiasCore = plano.weekDays.length >= 3 ? 2 : 1;
  if (exerciciosCore < minimoCore) erros.push(`plano tem ${exerciciosCore} exercício(s) direto(s) de core; mínimo ${minimoCore}`);
  if (diasCore.size < minimoDiasCore) erros.push(`core precisa estar distribuído em ${minimoDiasCore} dia(s) diferente(s)`);

  // Auditoria semanal conservadora: evita concentrar volume absurdo mesmo distribuído.
  for (const g of ["peito", "costas", "quadriceps", "posterior", "gluteos"]) if ((volumeSemanal[g] || 0) > 28) erros.push(`volume semanal excessivo de ${g} (${volumeSemanal[g]} séries diretas)`);
  for (const g of ["biceps", "triceps", "ombro"]) if ((volumeSemanal[g] || 0) > 20) erros.push(`volume semanal excessivo de ${g} (${volumeSemanal[g]} séries diretas)`);

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

export default async function handler(req, res) {
  const origem = req.headers.origin || "";
  res.setHeader("Access-Control-Allow-Origin", ORIGENS.includes(origem) ? origem : ORIGENS[0]);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: { message: "Method not allowed" } });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: { message: "ANTHROPIC_API_KEY não configurada no servidor." } });
  const jwt = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!jwt) return res.status(401).json({ error: { message: "Faça login para usar a geração por IA." } });

  const uResp = await fetch(`${SUPA_URL}/auth/v1/user`, { headers: { apikey: SUPA_ANON, Authorization: `Bearer ${jwt}` } });
  if (!uResp.ok) return res.status(401).json({ error: { message: "Sessão inválida ou expirada. Faça login novamente." } });

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
  if (!(q.ok && await q.json() === true)) return res.status(429).json({ error: { message: `Limite diário de ${quota} usos de IA atingido. Tente amanhã.` } });

  const body = req.body || {};
  if (!Array.isArray(body.messages) || !body.messages.length || body.messages.length > 4) return res.status(400).json({ error: { message: "Payload inválido" } });
  const texto = corpoTexto(body.messages);
  if (!MARCADORES.some(m => texto.includes(m))) return res.status(400).json({ error: { message: "Requisição não reconhecida" } });

  let anexos = 0;
  for (const m of body.messages) {
    if (typeof m.content === "string") continue;
    if (!Array.isArray(m.content)) return res.status(400).json({ error: { message: "Payload inválido" } });
    for (const c of m.content) {
      if (c.type === "text") continue;
      const imagemOk = c.type === "image" && c.source?.type === "base64" && ["image/jpeg", "image/png", "image/webp"].includes(c.source?.media_type);
      const pdfOk = c.type === "document" && c.source?.type === "base64" && c.source?.media_type === "application/pdf";
      if ((!imagemOk && !pdfOk) || typeof c.source?.data !== "string" || c.source.data.length > 5_000_000) return res.status(400).json({ error: { message: "Anexo inválido ou acima do limite" } });
      if (++anexos > 5) return res.status(400).json({ error: { message: "Excesso de anexos na requisição" } });
    }
  }

  const treino = eGeracaoDeTreino(texto);
  const mensagens = prepararMensagens(body.messages, treino);
  const safeBody = { model: "claude-sonnet-4-6", max_tokens: Math.min(Number(body.max_tokens) || 2000, 8192), messages: mensagens };

  try {
    let result = await chamarAnthropic(apiKey, safeBody);
    if (result.status >= 400) return res.status(result.status).json(result.data);
    if (treino) {
      let erros = validarPlano(textoResposta(result.data), texto);
      if (erros.length) {
        const correcao = `A resposta falhou na auditoria científica automática: ${erros.join("; ")}. Gere novamente o MESMO plano em JSON válido. Obedeça ao objetivo da anamnese, reduza redundâncias, respeite limites por músculo e considere volume indireto. A duração inclui aquecimento e aeróbico; não preencha tempo com exercícios repetidos. Não explique.`;
        result = await chamarAnthropic(apiKey, { ...safeBody, messages: [...mensagens, { role: "assistant", content: textoResposta(result.data) }, { role: "user", content: correcao }] });
        if (result.status >= 400) return res.status(result.status).json(result.data);
        erros = validarPlano(textoResposta(result.data), texto);
        if (erros.length) return res.status(422).json({ error: { message: "O treino não passou na auditoria científica de volume, redundância e duração. Gere novamente.", validation: erros } });
      }
    }
    res.setHeader("X-A-Body-Validation", "ACSM-2026-IUSCA-quality-v3");
    return res.status(result.status).json(result.data);
  } catch (e) {
    return res.status(502).json({ error: { message: "Falha ao contatar a IA: " + e.message } });
  }
}
