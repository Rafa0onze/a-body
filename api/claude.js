// api/claude.js — Vercel Serverless Function
// Proxy seguro para a API da Anthropic: a chave fica no servidor (env var),
// nunca é exposta ao navegador do usuário.

// Rate limiting simples em memória (por instância). Para produção séria,
// migrar para Upstash Redis ou similar.
const hits = new Map();
const WINDOW_MS = 60 * 60 * 1000; // 1 hora
const MAX_PER_WINDOW = 10;        // 10 gerações/hora por IP

function rateLimited(ip) {
  const now = Date.now();
  const entry = hits.get(ip) || { count: 0, start: now };
  if (now - entry.start > WINDOW_MS) {
    hits.set(ip, { count: 1, start: now });
    return false;
  }
  entry.count++;
  hits.set(ip, entry);
  return entry.count > MAX_PER_WINDOW;
}

export default async function handler(req, res) {
  // CORS básico
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: { message: "Method not allowed" } });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: { message: "ANTHROPIC_API_KEY não configurada no servidor. Adicione em Vercel → Settings → Environment Variables." } });
  }

  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  if (rateLimited(ip)) {
    return res.status(429).json({ error: { message: "Limite de uso atingido. Tente novamente em 1 hora." } });
  }

  // Validação e limites do payload
  const body = req.body || {};
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return res.status(400).json({ error: { message: "Payload inválido" } });
  }

  // Forçar parâmetros seguros no servidor (cliente não controla modelo/custos)
  const safeBody = {
    model: "claude-sonnet-4-6",
    max_tokens: Math.min(Number(body.max_tokens) || 2000, 8192),
    messages: body.messages,
  };

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(safeBody),
    });
    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  } catch (err) {
    return res.status(502).json({ error: { message: "Falha ao contactar a API: " + err.message } });
  }
}
