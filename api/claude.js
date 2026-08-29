// Compatibilidade para clientes antigos. A implementação usa OpenAI Responses API.
// A rota principal está em /api/openai.
import { SCIENCE_VERSIONS, scientificContext, validateScientificMetadata } from "./science.js";

const SUPA_URL = process.env.VITE_SUPABASE_URL || "https://zvmriqxigpwuggyhpoun.supabase.co";
const SUPA_ANON = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXAiLCJyZWYiOiJ6dm1yaXF4aWdwd3VnZ3locG91biIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzgzNTQzMTAwLCJleHAiOjIwOTkxMTkxMDB9.HrnVWaVSaWkGUXRc8MXKjM2Vj2N0xN6wwp95y7zmjbQ";
const ORIGENS = ["https://a-body.vercel.app", "http://localhost:5173"];
const QUOTA_DIARIA = 20;
const QUOTA_PRO = 60;
// Marcadores explícitos emitidos pelo app. Os antigos ficam por compatibilidade
// com bundles em cache durante o rollout.
const MARCADORES = ["A-BODY:ANALISE_CORPORAL", "A-BODY:PLANO_TREINO", "personal trainer", "ANÁLISE CORPORAL", "Analise as fotos", "analise corporal"];

const REGRAS_CIENTIFICAS = `

A versão e as metas definidas no PROTOCOLO CIENTÍFICO VERSIONADO ao final da solicitação prevalecem sobre qualquer exemplo JSON anterior.

PADRÃO CIENTÍFICO A-BODY — REGRAS OBRIGATÓRIAS:
1. Não programe dois dias consecutivos com predominância de membros inferiores.
2. Não repita o mesmo grupo muscular principal em dias consecutivos. Considere as sobreposições peito/ombros/tríceps, costas/bíceps e quadríceps/glúteos/posteriores.
3. Distribua o volume semanal e evite mais de 10 séries diretas para um mesmo músculo na mesma sessão.
4. Priorize exercícios multiarticulares e tecnicamente exigentes antes dos isoladores, salvo justificativa individual.
5. Respeite experiência, equipamentos, lesões, limitações, condições médicas e duração informada.
6. Inclua trabalho direto de core: em planos de 3 a 6 dias, ao menos 2 exercícios em 2 dias diferentes; em planos de 2 dias, ao menos 1 exercício. Compostos não substituem esse trabalho.
7. A DURAÇÃO INFORMADA REPRESENTA A SESSÃO COMPLETA: reserve aproximadamente 5 minutos para aquecimento e 10 a 15 minutos para o aeróbico pós-treino. Preencha o restante com musculação.
8. NÃO USE LIMITE FIXO DE 5 EXERCÍCIOS. Ajuste entre 4 e 8 exercícios por sessão conforme duração, número de séries e descansos. Treinos de 75 a 90 minutos geralmente precisam de 6 a 8 exercícios, salvo quando houver muitas séries ou descansos longos.
9. Estime o tempo de musculação considerando execução das séries, descansos prescritos e cerca de 1 a 2 minutos de transição entre exercícios. Não entregue um treino significativamente mais curto que o solicitado.
10. Antes de responder, audite sequência, recuperação, volume, core, duração total e segurança. Corrija qualquer falha antes de retornar o JSON.
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

const ESQUEMA_TREINO = {
  type: "object", additionalProperties: false,
  required: ["planName", "planDescription", "evidenceVersion", "progressionStrategy", "safetyNotes", "requiresMedicalClearance", "weeklyPrescription", "weekDays"],
  properties: {
    planName: { type: "string" }, planDescription: { type: "string" },
    evidenceVersion: { type:"string", enum:Object.values(SCIENCE_VERSIONS) },
    progressionStrategy: { type:"string" },
    safetyNotes: { type:"array", items:{type:"string"} },
    requiresMedicalClearance: { type:"boolean" },
    weeklyPrescription: { type:"object", additionalProperties:false,
      required:["aerobicMinutesTarget","aerobicMinutesUpper","strengthDaysTarget","flexibilityDaysTarget","intensityMethod","sedentaryGuidance","notes"],
      properties:{
        aerobicMinutesTarget:{type:"integer",minimum:0,maximum:600}, aerobicMinutesUpper:{type:"integer",minimum:0,maximum:600},
        strengthDaysTarget:{type:"integer",minimum:0,maximum:7}, flexibilityDaysTarget:{type:"integer",minimum:0,maximum:7},
        intensityMethod:{type:"string"}, sedentaryGuidance:{type:"string"}, notes:{type:"array",items:{type:"string"}}
      }
    },
    weekDays: { type: "array", minItems: 1, maxItems: 7, items: {
      type: "object", additionalProperties: false,
      required: ["id", "label", "sub", "exercises", "mobility", "postCardio"],
      properties: {
        id:{type:"string"}, label:{type:"string"}, sub:{type:"string"},
        exercises:{type:"array",minItems:1,maxItems:8,items:{type:"object",additionalProperties:false,required:["id","name","sets","reps","rest","rir","progressionRule","isometric","isoSeconds"],properties:{id:{type:"string"},name:{type:"string"},sets:{type:"integer",minimum:1,maximum:10},reps:{type:"string"},rest:{type:"integer",minimum:0,maximum:600},rir:{type:"integer",minimum:0,maximum:5},progressionRule:{type:"string"},isometric:{type:"boolean"},isoSeconds:{type:["integer","null"],minimum:1,maximum:3600}}}},
        mobility:{type:"array",maxItems:2,items:{type:"object",additionalProperties:false,required:["name","duration"],properties:{name:{type:"string"},duration:{type:"string"}}}},
        postCardio:{type:"object",additionalProperties:false,required:["text","minMinutes","maxMinutes","intensity"],properties:{text:{type:"string"},minMinutes:{type:"integer",minimum:0,maximum:120},maxMinutes:{type:"integer",minimum:0,maximum:120},intensity:{type:"string"}}}
      }
    }}
  }
};

const GRUPOS_CORPORAIS = ["peito","costas","ombros","bracos","quadriceps","posteriores","gluteos","panturrilhas","core"];
const ESQUEMA_ANALISE = {
  type:"object", additionalProperties:false,
  required:["notasPorGrupo","prioridades","manutencao","restricoesMovimento","postura","assimetrias","distribuicaoGordura","achadosDocumentos","objetivoVsLeitura","strongPoints","weakPoints","postureNotes","muscleImbalances","overallAnalysis","comparison"],
  properties:{
    notasPorGrupo:{type:"object",additionalProperties:false,required:GRUPOS_CORPORAIS,properties:Object.fromEntries(GRUPOS_CORPORAIS.map(g=>[g,{type:"integer",minimum:1,maximum:5}]))},
    prioridades:{type:"array",maxItems:3,items:{type:"object",additionalProperties:false,required:["grupo","nota","motivo"],properties:{grupo:{type:"string",enum:GRUPOS_CORPORAIS},nota:{type:"integer",minimum:1,maximum:5},motivo:{type:"string"}}}},
    manutencao:{type:"array",items:{type:"string",enum:GRUPOS_CORPORAIS}},
    restricoesMovimento:{type:"array",items:{type:"string"}},
    postura:{type:"array",items:{type:"object",additionalProperties:false,required:["achado","implicacao"],properties:{achado:{type:"string"},implicacao:{type:"string"}}}},
    assimetrias:{type:"array",items:{type:"string"}}, distribuicaoGordura:{type:"string"}, achadosDocumentos:{type:"array",items:{type:"string"}}, objetivoVsLeitura:{type:"string"},
    strongPoints:{type:"array",items:{type:"string"}}, weakPoints:{type:"array",items:{type:"string"}}, postureNotes:{type:"array",items:{type:"string"}}, muscleImbalances:{type:"array",items:{type:"string"}}, overallAnalysis:{type:"string"},
    comparison:{anyOf:[{type:"null"},{type:"object",additionalProperties:false,required:["improvements","attentionPoints","summary"],properties:{improvements:{type:"array",items:{type:"string"}},attentionPoints:{type:"array",items:{type:"string"}},summary:{type:"string"}}}]}
  }
};

function formatoEstruturado(treino, texto = "") {
  if (treino) return { type:"json_schema", name:"abody_workout_plan", strict:true, schema:ESQUEMA_TREINO };
  if (texto.includes("A-BODY:ANALISE_CORPORAL")) return { type:"json_schema", name:"abody_body_analysis", strict:true, schema:ESQUEMA_ANALISE };
  return null;
}

function prepararMensagens(messages, treino) {
  const copia = JSON.parse(JSON.stringify(messages));
  if (!treino) return copia;
  for (const m of copia) {
    if (typeof m.content === "string") {
      m.content = m.content.replace(/Max\s*5\s*exercícios\/dia\.?/gi, "Quantidade variável de 4 a 8 exercícios/dia conforme a duração total solicitada.");
    } else if (Array.isArray(m.content)) {
      for (const c of m.content) if (c.type === "text") {
        c.text = String(c.text || "").replace(/Max\s*5\s*exercícios\/dia\.?/gi, "Quantidade variável de 4 a 8 exercícios/dia conforme a duração total solicitada.");
      }
    }
  }
  const ultima = copia[copia.length - 1];
  const contexto = REGRAS_CIENTIFICAS + scientificContext(corpoTexto(copia));
  if (typeof ultima.content === "string") ultima.content += contexto;
  else if (Array.isArray(ultima.content)) ultima.content.push({ type: "text", text: contexto });
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
  const cardio = Number(dia?.postCardio?.minMinutes || 10) + Number(dia?.postCardio?.maxMinutes || 15);
  const cardioMedio = cardio / 2;
  return Math.round((segundos / 60) + 5 + cardioMedio);
}

function gruposDoDia(dia) {
  const txt = `${dia?.label || ""} ${dia?.sub || ""} ${(dia?.exercises || []).map(e => e.name).join(" ")}`.toLowerCase();
  const g = new Set();
  if (/agach|leg press|extensora|afundo|avanço|búlgar|quadr[ií]ceps|perna|terra|stiff|romeno|flexora|nordic|hip thrust|ponte|gl[uú]te|posterior/.test(txt)) g.add("lower");
  if (/supino|peito|crucifixo|peck|cross.?over|flex[aã]o|desenvolvimento|ombro|eleva[cç][aã]o lateral|tr[ií]ceps|mergulho/.test(txt)) g.add("push");
  if (/puxada|barra fixa|remada|costas|face pull|rosca|b[ií]ceps/.test(txt)) g.add("pull");
  return g;
}

function eCore(ex) {
  return /abdom|abd[oô]men|core|prancha|pallof|dead bug|bird.?dog|roda|eleva[cç][aã]o de pernas|leg raise/i.test(String(ex?.name || ""));
}

function validarPlano(textoRespostaIA, textoPedido) {
  const plano = extrairJSON(textoRespostaIA);
  if (!plano || !Array.isArray(plano.weekDays) || !plano.weekDays.length) return ["JSON ou estrutura weekDays inválida"];
  const erros = validateScientificMetadata(plano, textoPedido);
  const alvo = minutosSolicitados(textoPedido);
  const maxEx = limiteExercicios(alvo);

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
    if (exs.length > maxEx) erros.push(`dia ${i + 1} excede o limite de ${maxEx} exercícios para ${alvo || "a"} minutos`);
    const series = exs.reduce((s, e) => s + (Number(e.sets) || 0), 0);
    if (series > 32) erros.push(`dia ${i + 1} concentra volume excessivo (${series} séries)`);
    const core = exs.filter(eCore);
    if (core.length) { exerciciosCore += core.length; diasCore.add(i); }

    if (alvo) {
      const estimado = estimarMinutosDia(dia);
      const minimo = Math.max(30, alvo - 15);
      const maximo = alvo + 10;
      if (estimado < minimo) erros.push(`dia ${i + 1} está curto: estimado ${estimado} min para meta de ${alvo} min`);
      if (estimado > maximo) erros.push(`dia ${i + 1} está longo: estimado ${estimado} min para meta de ${alvo} min`);
    }
  }

  const minimoCore = plano.weekDays.length >= 3 ? 2 : 1;
  const minimoDiasCore = plano.weekDays.length >= 3 ? 2 : 1;
  if (exerciciosCore < minimoCore) erros.push(`plano tem ${exerciciosCore} exercício(s) direto(s) de core; mínimo ${minimoCore}`);
  if (diasCore.size < minimoDiasCore) erros.push(`core precisa estar distribuído em ${minimoDiasCore} dia(s) diferente(s)`);
  return erros;
}

function conteudoOpenAI(content) {
  if (typeof content === "string") return [{ type: "input_text", text: content }];
  return (content || []).map(item => {
    if (item.type === "text") return { type: "input_text", text: item.text || "" };
    if (item.type === "image") {
      return {
        type: "input_image",
        image_url: `data:${item.source.media_type};base64,${item.source.data}`,
        detail: "high",
      };
    }
    return {
      type: "input_file",
      filename: item.source.filename || "documento.pdf",
      file_data: `data:${item.source.media_type};base64,${item.source.data}`,
    };
  });
}

function respostaCompativelOpenAI(data) {
  const texto = (data?.output || [])
    .flatMap(item => Array.isArray(item.content) ? item.content : [])
    .filter(item => item.type === "output_text")
    .map(item => item.text || "")
    .join("");
  return { id: data?.id, model: data?.model, content: [{ type: "text", text: texto }], usage: data?.usage };
}

function errosCriticosPlano(erros) {
  return (erros || []).filter(erro => !/curto|longo|consecutiv|predominância|core|volume excessivo|concentra volume|séries/i.test(erro));
}

function categoriasValidacao(erros) {
  return [...new Set((erros || []).map(erro => {
    if (/curto|longo|minutos/i.test(erro)) return "duration";
    if (/consecutiv|predominância/i.test(erro)) return "recovery";
    if (/core/i.test(erro)) return "core";
    if (/volume|séries/i.test(erro)) return "volume";
    if (/requiresMedicalClearance/i.test(erro)) return "medical_clearance";
    if (/RIR/i.test(erro)) return "rir";
    if (/evidenceVersion|weeklyPrescription/i.test(erro)) return "scientific_metadata";
    return "structure";
  }))];
}

export function conteudoAssistantOpenAI(texto) {
  return [{ type: "output_text", text: String(texto || "") }];
}

async function chamarOpenAI(apiKey, body) {
  const r = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  return { status: r.status, data: r.ok ? respostaCompativelOpenAI(data) : data };
}

function erroPublicoOpenAI(status) {
  if (status === 429) return { status: 503, code: "AI_CAPACITY", message: "A geração está temporariamente indisponível. Tente novamente em alguns minutos." };
  if (status === 401 || status === 403) return { status: 503, code: "AI_CONFIGURATION", message: "O serviço de geração está temporariamente indisponível." };
  if (status >= 500) return { status: 503, code: "AI_UNAVAILABLE", message: "A geração está temporariamente indisponível. Tente novamente." };
  return { status: 422, code: "AI_REQUEST_REJECTED", message: "Não foi possível processar os dados enviados. Revise os anexos e tente novamente." };
}

function registrarEvento(requestId, stage, fields = {}) {
  console.log(JSON.stringify({ service:"abody-ai", requestId, stage, ...fields }));
}

async function quotaRpc(jwt, nome, body) {
  const r = await fetch(`${SUPA_URL}/rest/v1/rpc/${nome}`, {
    method: "POST",
    headers: { apikey: SUPA_ANON, Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { ok:r.ok, data:await r.json().catch(()=>null) };
}

export default async function handler(req, res) {
  const requestId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const inicio = Date.now();
  res.setHeader("X-Request-Id", requestId);
  const origem = req.headers.origin || "";
  if (ORIGENS.includes(origem)) res.setHeader("Access-Control-Allow-Origin", origem);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: { message: "Method not allowed" } });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: { code:"AI_CONFIGURATION", message: "O serviço de geração está temporariamente indisponível.", requestId } });
  const jwt = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!jwt) return res.status(401).json({ error: { message: "Faça login para usar a geração por IA." } });

  const uResp = await fetch(`${SUPA_URL}/auth/v1/user`, { headers: { apikey: SUPA_ANON, Authorization: `Bearer ${jwt}` } });
  if (!uResp.ok) return res.status(401).json({ error: { message: "Sessão inválida ou expirada. Faça login novamente." } });

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
  let quota = QUOTA_DIARIA;
  try {
    const p = await fetch(`${SUPA_URL}/rest/v1/profissionais?select=user_id&limit=1`, { headers: { apikey: SUPA_ANON, Authorization: `Bearer ${jwt}` } });
    if (p.ok && (await p.json()).length) quota = QUOTA_PRO;
  } catch {}
  let reserva;
  try { reserva = await quotaRpc(jwt, "reserve_ia_quota", { limite:quota }); }
  catch { reserva = { ok:false, data:null }; }
  if (!reserva.ok || !reserva.data) {
    registrarEvento(requestId, "quota_rejected", { durationMs:Date.now()-inicio });
    return res.status(reserva.ok ? 429 : 503).json({ error: {
      code:reserva.ok ? "DAILY_QUOTA_REACHED" : "AI_CONFIGURATION",
      message:reserva.ok ? `Limite diário de ${quota} usos de IA atingido. Tente novamente amanhã.` : "O serviço de geração está temporariamente indisponível.",
      requestId,
    } });
  }
  const reservaId = reserva.data;
  const cancelarReserva = async () => {
    try { await quotaRpc(jwt, "cancel_ia_quota", { reserva_id:reservaId }); } catch {}
  };
  const mensagens = prepararMensagens(body.messages, treino);
  const formato = formatoEstruturado(treino, texto);
  const safeBody = {
    model: process.env.OPENAI_MODEL || "gpt-5.6",
    max_output_tokens: Math.min(Number(body.max_tokens) || 2000, 8192),
    // Structured Outputs e o validador local já fazem a fiscalização pesada.
    // Esforço baixo reduz drasticamente o tempo de espera no telefone.
    reasoning: { effort: "low" },
    text: { verbosity: "low", ...(formato ? { format: formato } : {}) },
    input: mensagens.map(m => ({ role: m.role, content: conteudoOpenAI(m.content) })),
  };

  try {
    registrarEvento(requestId, "openai_started", { treino, anexos });
    let result = await chamarOpenAI(apiKey, safeBody);
    if (result.status >= 400) {
      await cancelarReserva();
      const publico = erroPublicoOpenAI(result.status);
      registrarEvento(requestId, "openai_failed", { upstreamStatus:result.status, durationMs:Date.now()-inicio });
      return res.status(publico.status).json({ error:{ ...publico, requestId } });
    }
    if (treino) {
      let erros = validarPlano(textoResposta(result.data), texto);
      let criticos = errosCriticosPlano(erros);
      if (erros.length && !criticos.length) {
        // Duração estimada, distribuição de core e recuperação são alertas de
        // qualidade baseados em heurísticas. Não devem descartar um JSON
        // estruturalmente válido nem disparar uma segunda geração de minutos.
        registrarEvento(requestId, "validation_warning", { categories:categoriasValidacao(erros), errorCount:erros.length });
      } else if (criticos.length) {
        const correcao = `A resposta falhou na validação automática: ${erros.join("; ")}. Gere novamente o MESMO plano em JSON válido, corrigindo tudo. A duração informada inclui 5 min de aquecimento e 10–15 min de aeróbico; ajuste a musculação para completar o restante. Use de 4 a 8 exercícios conforme necessário. Não explique.`;
        result = await chamarOpenAI(apiKey, {
          ...safeBody,
          input: [
            ...safeBody.input,
            // No Responses API, conteúdo histórico do assistant precisa usar
            // output_text; input_text é aceito apenas em mensagens de entrada.
            { role: "assistant", content: conteudoAssistantOpenAI(textoResposta(result.data)) },
            { role: "user", content: [{ type: "input_text", text: correcao }] },
          ],
        });
        if (result.status >= 400) {
          await cancelarReserva();
          const publico = erroPublicoOpenAI(result.status);
          registrarEvento(requestId, "openai_retry_failed", { upstreamStatus:result.status, durationMs:Date.now()-inicio });
          return res.status(publico.status).json({ error:{ ...publico, requestId } });
        }
        erros = validarPlano(textoResposta(result.data), texto);
        criticos = errosCriticosPlano(erros);
        if (criticos.length) {
          await cancelarReserva();
          registrarEvento(requestId, "validation_failed", { categories:categoriasValidacao(criticos), errorCount:criticos.length, durationMs:Date.now()-inicio });
          return res.status(422).json({ error: { code:"PLAN_VALIDATION_FAILED", message: "O treino não passou na validação de duração e segurança. Tente gerar novamente; esta tentativa não consumiu sua cota.", requestId } });
        }
        if (erros.length) registrarEvento(requestId, "validation_warning", { categories:categoriasValidacao(erros), errorCount:erros.length });
      }
    }
    const confirmacao = await quotaRpc(jwt, "confirm_ia_quota", { reserva_id:reservaId });
    if (!confirmacao.ok || confirmacao.data !== true) throw new Error("quota confirmation failed");
    res.setHeader("X-A-Body-Validation", "ACSM-2026-IUSCA-duration-v2");
    registrarEvento(requestId, "completed", { treino, durationMs:Date.now()-inicio });
    return res.status(result.status).json(result.data);
  } catch (e) {
    await cancelarReserva();
    registrarEvento(requestId, "unexpected_failure", { errorName:e?.name || "Error", durationMs:Date.now()-inicio });
    return res.status(502).json({ error: { code:"AI_NETWORK_ERROR", message: "Não foi possível concluir a geração. Verifique sua conexão e tente novamente.", requestId } });
  }
}

export { corpoTexto, eGeracaoDeTreino, extrairJSON, validarPlano, errosCriticosPlano, conteudoOpenAI, formatoEstruturado, erroPublicoOpenAI };
