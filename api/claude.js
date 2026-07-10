// api/claude.js — Vercel Serverless Function
// Proxy protegido para a API da Anthropic:
// - Chave da Anthropic fica no servidor (env var)
// - Requer usuário autenticado (JWT do Supabase)
// - Quota diária por usuário persistida no Postgres (consume_ia_quota)
// - Aceita apenas payloads de geração de treino / análise corporal

const SUPA_URL = process.env.VITE_SUPABASE_URL || "https://zvmriqxigpwuggyhpoun.supabase.co";
const SUPA_ANON = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2bXJpcXhpZ3B3dWdneWhwb3VuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NDMxMDAsImV4cCI6MjA5OTExOTEwMH0.HrnVWaVSaWkGUXRc8MXKjM2Vj2N0xN6wwp95y7zmjbQ";
const ORIGENS = ["https://a-body.vercel.app", "http://localhost:5173"];
const QUOTA_DIARIA = 20;

// Marcadores dos únicos usos legítimos deste proxy
const MARCADORES = ["personal trainer", "ANÁLISE CORPORAL", "Analise as fotos", "analise corporal"];

function corpoTexto(messages) {
  let t = "";
  for (const m of messages) {
    if (typeof m.content === "string") t += m.content + "\n";
    else if (Array.isArray(m.content)) for (const c of m.content) if (c.type === "text") t += (c.text||"") + "\n";
  }
  return t;
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

  // 1) Autenticação obrigatória (JWT do Supabase)
  const jwt = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!jwt) return res.status(401).json({ error: { message: "Faça login para usar a geração por IA." } });
  const uResp = await fetch(`${SUPA_URL}/auth/v1/user`, { headers: { apikey: SUPA_ANON, Authorization: `Bearer ${jwt}` } });
  if (!uResp.ok) return res.status(401).json({ error: { message: "Sessão inválida ou expirada. Faça login novamente." } });

  // 2) Quota diária por usuário (persistida no Postgres)
  const qResp = await fetch(`${SUPA_URL}/rest/v1/rpc/consume_ia_quota`, {
    method: "POST",
    headers: { apikey: SUPA_ANON, Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
    body: JSON.stringify({ limite: QUOTA_DIARIA }),
  });
  const permitido = qResp.ok ? await qResp.json() : false;
  if (permitido !== true) {
    return res.status(429).json({ error: { message: `Limite diário de ${QUOTA_DIARIA} usos de IA atingido. Tente amanhã.` } });
  }

  // 3) Validação do payload: apenas usos do A-Body
  const body = req.body || {};
  if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > 4) {
    return res.status(400).json({ error: { message: "Payload inválido" } });
  }
  const texto = corpoTexto(body.messages);
  if (!MARCADORES.some(m => texto.includes(m))) {
    return res.status(400).json({ error: { message: "Requisição não reconhecida" } });
  }

  // 4) Parâmetros forçados no servidor (cliente não controla modelo/custos)
  const safeBody = {
    model: "claude-sonnet-4-6",
    max_tokens: Math.min(Number(body.max_tokens) || 2000, 8192),
    messages: body.messages,
  };

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify(safeBody),
    });
    const data = await r.json();
    return res.status(r.status).json(data);
  } catch (e) {
    return res.status(502).json({ error: { message: "Falha ao contatar a IA: " + e.message } });
  }
}
