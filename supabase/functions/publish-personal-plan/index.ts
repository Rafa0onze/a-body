import { createClient } from "npm:@supabase/supabase-js@2";

type Plan = {
  planName?: string;
  weekDays?: Array<{ exercises?: unknown[] }>;
  [key: string]: unknown;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function validPlan(plan: Plan) {
  if (!plan || typeof plan !== "object") return "Plano ausente.";
  if (!String(plan.planName || "").trim()) return "Plano sem nome.";
  if (!Array.isArray(plan.weekDays) || plan.weekDays.length < 1 || plan.weekDays.length > 7) {
    return "weekDays inválido.";
  }
  for (const day of plan.weekDays) {
    if (!Array.isArray(day?.exercises) || day.exercises.length < 1) return "Dia sem exercícios.";
  }
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ ok:false, error:"method_not_allowed" }, 405);

  const authorization = req.headers.get("authorization") || "";
  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return json({ ok:false, error:"missing_authorization" }, 401);
  }

  const token = authorization.slice(7).trim();
  const publishableRaw = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  let publicKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  if (publishableRaw) {
    try { publicKey = JSON.parse(publishableRaw)?.default || publicKey; } catch {}
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const userClient = createClient(url, publicKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession:false, autoRefreshToken:false },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user) return json({ ok:false, error:"invalid_session" }, 401);

  let body: { aluno_id?: string; plano?: Plan; treino_origem?: string | null };
  try { body = await req.json(); } catch { return json({ ok:false, error:"invalid_json" }, 400); }

  const alunoId = String(body.aluno_id || "");
  const plan = body.plano || {};
  const planError = validPlan(plan);
  if (!alunoId) return json({ ok:false, error:"missing_student" }, 400);
  if (planError) return json({ ok:false, error:"invalid_plan", detail:planError }, 400);

  const { data: published, error: publishError } = await userClient.rpc('publicar_treino_aluno', {
    p_aluno_id: alunoId,
    p_plano: plan,
    p_treino_origem: body.treino_origem || null,
  });
  if (publishError) return json({ ok:false, error:'publish_failed' }, publishError.code==='42501'?403:publishError.code==='40001'?409:500);
  const saved = Array.isArray(published) ? published[0] : published;
  if (!saved?.id) return json({ ok:false, error:'publish_not_confirmed' }, 500);
  return json({ok:true,treino_id:saved.id,atualizado_em:saved.atualizado_em,planName:plan.planName});
});