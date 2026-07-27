// api/claude.js — Vercel Serverless Function
// Proxy protegido para a API da Anthropic:
// - Chave da Anthropic fica no servidor (env var)
// - Requer usuário autenticado (JWT do Supabase)
// - Quota diária por usuário persistida no Postgres (consume_ia_quota)
// - Aceita apenas payloads de geração de treino / análise corporal

const SUPA_URL = process.env.VITE_SUPABASE_URL || "https://zvmriqxigpwuggyhpoun.supabase.co";
const SUPA_ANON = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXAiLCJyZWYiOiJ6dm1yaXF4aWdwd3VnZ3locG91biIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzgzNTQzMTAwLCJleHAiOjIwOTkxMTkxMDB9.HrnVWaVSaWkGUXRc8MXKjM2Vj2N0xN6wwp95y7zmjbQ";
const ORIGENS = ["https://a-body.vercel.app", "http://localhost:5173"];
const QUOTA_DIARIA = 20;
const QUOTA_PRO = 60;

const MARCADORES = ["personal trainer", "ANÁLISE CORPORAL", "Analise as fotos", "analise corporal"];

// Base científica apresentada ao usuário e aplicada a toda geração de treino.
// Atualização principal: ACSM Position Stand 2026 (DOI 10.1249/MSS.0000000000003897)
// Complemento: IUSCA Position Stand 2021 (DOI 10.47206/ijsc.v1i1.81)
const REGRAS_CIENTIFICAS = `

PADRÃO CIENTÍFICO A-BODY — REGRAS OBRIGATÓRIAS DE GERAÇÃO E VALIDAÇÃO:
1. Não programe dois dias consecutivos com predominância de membros inferiores. Quadríceps, posteriores e glúteos compartilham fadiga local e sistêmica; distribua-os com ao menos um dia sem treino predominante de pernas entre eles.
2. Não repita o mesmo grupo muscular principal em dias consecutivos. Considere também sobreposição relevante: peito/ombros/tríceps; costas/bíceps; quadríceps/glúteos/posteriores.
3. Use a frequência para distribuir o volume semanal. Para hipertrofia, prefira trabalhar os grandes grupos em pelo menos duas exposições semanais quando a disponibilidade permitir, sem sacrificar recuperação.
4. Evite concentrar volume excessivo de um grupo em uma única sessão. Como padrão conservador, use até 10 séries diretas por músculo por sessão e ajuste o total semanal ao nível, objetivo e tolerância do aluno.
5. Não exija falha muscular em todas as séries. Prescreva predominantemente esforço próximo da falha, preservando técnica; use falha com parcimônia, sobretudo em exercícios multiarticulares e usuários iniciantes.
6. Priorize exercícios multiarticulares e tecnicamente exigentes antes de isoladores, salvo quando houver justificativa explícita de prioridade, reabilitação ou pré-exaustão planejada pelo profissional.
7. Respeite lesões, limitações, condições médicas, experiência, equipamentos e duração informados. Em risco ou informação insuficiente, escolha a opção mais conservadora e sinalize necessidade de avaliação profissional.
8. Garanta equilíbrio semanal dos padrões: empurrar e puxar; dominância de joelho e de quadril; trabalho unilateral e de core quando compatíveis com o objetivo.
9. O plano deve ser individualizável e sustentável. Consistência, progressão e aderência têm prioridade sobre complexidade desnecessária.
10. Antes de responder, faça uma auditoria silenciosa de sequência, recuperação, volume, sobreposição muscular, duração e segurança. Se alguma regra crítica falhar, corrija o plano antes de retornar o JSON.
`;

function corpoTexto(messages) {
  let t = "";
  for (const m of messages) {
    if (typeof m.content === "string") t += m.content + "\n";
    else if (Array.isArray(m.content)) for (const c of m.content) if (c.type === "text") t += (c.text||"") + "\n";
  }
  return t;
}

function anexarRegras(messages) {
  const copia = JSON.parse(JSON.stringify(messages));
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

function gruposDoDia(dia) {
  const txt = `${dia?.label||""} ${dia?.sub||""} ${(dia?.exercises||[]).map(e=>e.name).join(" ")}`.toLowerCase();
  const g = new Set();
  if (/agach|leg press|extensora|afundo|avanço|búlgar|quadr[ií]ceps|perna/.test(txt)) g.add("lower");
  if (/terra|stiff|romeno|flexora|nordic|hip thrust|ponte|gl[uú]te|posterior/.test(txt)) g.add("lower");
  if (/supino|peito|crucifixo|peck|cross.?over|flex[aã]o/.test(txt)) g.add("push");
  if (/desenvolvimento|ombro|eleva[cç][aã]o lateral/.test(txt)) g.add("push");
  if (/tr[ií]ceps|mergulho/.test(txt)) g.add("push");
  if (/puxada|barra fixa|remada|costas|face pull/.test(txt)) g.add("pull");
  if (/rosca|b[ií]ceps/.test(txt)) g.add("pull");
  return g;
}

function validarPlano(texto) {
  const plano = extrairJSON(texto);
  if (!plano || !Array.isArray(plano.weekDays) || !plano.weekDays.length) return ["JSON ou estrutura weekDays inválida"];
  const erros = [];
  for (let i = 1; i < plano.weekDays.length; i++) {
    const ant = gruposDoDia(plano.weekDays[i-1]);
    const atu = gruposDoDia(plano.weekDays[i]);
    if (ant.has("lower") && atu.has("lower")) erros.push(`dias ${i} e ${i+1} têm membros inferiores consecutivos`);
    if (ant.has("push") && atu.has("push")) erros.push(`dias ${i} e ${i+1} repetem predominância de empurrar`);
    if (ant.has("pull") && atu.has("pull")) erros.push(`dias ${i} e ${i+1} repetem predominância de puxar`);
  }
  for (const [i, dia] of plano.weekDays.entries()) {
    if (!Array.isArray(dia.exercises) || dia.exercises.length === 0) erros.push(`dia ${i+1} sem exercícios`);
    if ((dia.exercises||[]).length > 5) erros.push(`dia ${i+1} excede 5 exercícios`);
    const series = (dia.exercises||[]).reduce((s,e)=>s+(Number(e.sets)||0),0);
    if (series > 25) erros.push(`dia ${i+1} concentra volume excessivo (${series} séries)`);
  }
  return erros;
}

async function chamarAnthropic(apiKey, safeBody) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify(safeBody),
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
    const pResp = await fetch(`${SUPA_URL}/rest/v1/profissionais?select=user_id&limit=1`, { headers: { apikey: SUPA_ANON, Authorization: `Bearer ${jwt}` } });
    if (pResp.ok && (await pResp.json()).length > 0) quota = QUOTA_PRO;
  } catch {}

  const qResp = await fetch(`${SUPA_URL}/rest/v1/rpc/consume_ia_quota`, {
    method: "POST",
    headers: { apikey: SUPA_ANON, Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
    body: JSON.stringify({ limite: quota }),
  });
  const permitido = qResp.ok ? await qResp.json() : false;
  if (permitido !== true) return res.status(429).json({ error: { message: `Limite diário de ${quota} usos de IA atingido. Tente amanhã.` } });

  const body = req.body || {};
  if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > 4) return res.status(400).json({ error: { message: "Payload inválido" } });
  const texto = corpoTexto(body.messages);
  if (!MARCADORES.some(m => texto.includes(m))) return res.status(400).json({ error: { message: "Requisição não reconhecida" } });

  const MIMES_IMG = ["image/jpeg", "image/png", "image/webp"];
  const MAX_B64_BLOCO = 5_000_000;
  const MAX_BLOCOS_BIN = 5;
  let blocosBin = 0;
  for (const m of body.messages) {
    if (typeof m.content === "string") continue;
    if (!Array.isArray(m.content)) return res.status(400).json({ error: { message: "Payload inválido" } });
    for (const c of m.content) {
      if (c.type === "text") continue;
      if (c.type === "image") {
        if (c.source?.type !== "base64" || !MIMES_IMG.includes(c.source?.media_type) || typeof c.source?.data !== "string" || c.source.data.length > MAX_B64_BLOCO) return res.status(400).json({ error: { message: "Imagem inválida ou acima do limite" } });
        blocosBin++;
      } else if (c.type === "document") {
        if (c.source?.type !== "base64" || c.source?.media_type !== "application/pdf" || typeof c.source?.data !== "string" || c.source.data.length > MAX_B64_BLOCO) return res.status(400).json({ error: { message: "Documento inválido: apenas PDF até o limite de tamanho" } });
        blocosBin++;
      } else return res.status(400).json({ error: { message: "Tipo de bloco não permitido" } });
      if (blocosBin > MAX_BLOCOS_BIN) return res.status(400).json({ error: { message: "Excesso de anexos na requisição" } });
    }
  }

  const messagesComRegras = anexarRegras(body.messages);
  const safeBody = { model: "claude-sonnet-4-6", max_tokens: Math.min(Number(body.max_tokens) || 2000, 8192), messages: messagesComRegras };

  try {
    let result = await chamarAnthropic(apiKey, safeBody);
    if (result.status >= 400) return res.status(result.status).json(result.data);

    const erros = validarPlano(textoResposta(result.data));
    if (erros.length) {
      const correcao = `A resposta anterior falhou na validação científica automática: ${erros.join("; ")}. Gere novamente o MESMO plano em JSON válido, corrigindo todos os erros e obedecendo integralmente ao PADRÃO CIENTÍFICO A-BODY. Não explique.`;
      const retryBody = {
        ...safeBody,
        messages: [...messagesComRegras, { role: "assistant", content: textoResposta(result.data) }, { role: "user", content: correcao }],
      };
      result = await chamarAnthropic(apiKey, retryBody);
      if (result.status >= 400) return res.status(result.status).json(result.data);
      const errosRetry = validarPlano(textoResposta(result.data));
      if (errosRetry.length) return res.status(422).json({ error: { message: "O treino não passou na validação científica automática. Gere novamente.", validation: errosRetry } });
    }

    res.setHeader("X-A-Body-Validation", "ACSM-2026-IUSCA-2021");
    return res.status(result.status).json(result.data);
  } catch (e) {
    return res.status(502).json({ error: { message: "Falha ao contatar a IA: " + e.message } });
  }
}
