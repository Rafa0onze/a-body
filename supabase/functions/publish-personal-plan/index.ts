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

  const secretRaw = Deno.env.get("SUPABASE_SECRET_KEYS");
  let adminKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (secretRaw) {
    try { adminKey = JSON.parse(secretRaw)?.default || adminKey; } catch {}
  }
  const admin = createClient(url, adminKey, {
    auth: { persistSession:false, autoRefreshToken:false },
  });

  const { data: aluno, error: alunoError } = await admin
    .from("alunos")
    .select("id,personal_id")
    .eq("id", alunoId)
    .eq("personal_id", user.id)
    .maybeSingle();

  if (alunoError) return json({ ok:false, error:"student_lookup_failed" }, 500);
  if (!aluno) return json({ ok:false, error:"forbidden" }, 403);

  const { data: activeRows, error: activeError } = await admin
    .from("treinos_alunos")
    .select("id")
    .eq("aluno_id", alunoId)
    .eq("ativo", true);

  if (activeError) return json({ ok:false, error:"active_lookup_failed" }, 500);
  const previousIds = (activeRows || []).map((r: {id:string}) => r.id);

  if (previousIds.length) {
    const off = await admin
      .from("treinos_alunos")
      .update({ ativo:false, atualizado_em:new Date().toISOString() })
      .in("id", previousIds);
    if (off.error) return json({ ok:false, error:"deactivate_failed" }, 500);
  }

  const insert = await admin
    .from("treinos_alunos")
    .insert({
      aluno_id: alunoId,
      personal_id: user.id,
      plano: plan,
      ativo: true,
      atualizado_em: new Date().toISOString(),
    })
    .select("id,atualizado_em")
    .single();

  if (insert.error) {
    if (previousIds.length) {
      await admin.from("treinos_alunos").update({ ativo:true }).in("id", previousIds);
    }
    return json({ ok:false, error:"publish_failed", detail:insert.error.message }, 500);
  }

  return json({
    ok:true,
    treino_id:insert.data.id,
    atualizado_em:insert.data.atualizado_em,
    planName:plan.planName,
  });
});
