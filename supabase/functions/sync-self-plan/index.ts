import { createClient } from "npm:@supabase/supabase-js@2";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ ok:false, error:"method_not_allowed" }, 405);

  const authorization = req.headers.get("authorization") || "";
  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return json({ ok:false, error:"missing_authorization" }, 401);
  }

  const token = authorization.slice(7).trim();
  const url = Deno.env.get("SUPABASE_URL")!;

  const publishableRaw = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  let publicKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  if (publishableRaw) {
    try { publicKey = JSON.parse(publishableRaw)?.default || publicKey; } catch {}
  }

  const userClient = createClient(url, publicKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession:false, autoRefreshToken:false },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user) return json({ ok:false, error:"invalid_session" }, 401);

  let body: { upgrade_plan?: any };
  try { body = await req.json(); } catch { body = {}; }

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
    .select("id,personal_id,status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (alunoError) return json({ ok:false, error:"student_lookup_failed" }, 500);
  if (!aluno || aluno.status === "inativo") return json({ ok:true, linked:false, plan:null });

  const { data: ativos, error: activeError } = await admin
    .from("treinos_alunos")
    .select("id,plano,atualizado_em")
    .eq("aluno_id", aluno.id)
    .eq("ativo", true)
    .order("atualizado_em", { ascending:false })
    .limit(2);

  if (activeError) return json({ ok:false, error:"active_lookup_failed" }, 500);

  let active = ativos?.[0] || null;
  const upgrade = body?.upgrade_plan;
  const legacyNames = new Set(["Hipertrofia & Definição 5x", "Hipertrofia 5x — foco tronco"]);

  if (active && upgrade && typeof upgrade === "object" && Array.isArray(upgrade.weekDays)
      && upgrade.weekDays.length >= 1 && upgrade.weekDays.length <= 7
      && legacyNames.has(active.plano?.planName)
      && active.plano?.presetVersion !== upgrade.presetVersion) {

    const previousIds = (ativos || []).map((r:any)=>r.id);
    if (previousIds.length) {
      const off = await admin.from("treinos_alunos")
        .update({ ativo:false, atualizado_em:new Date().toISOString() })
        .in("id", previousIds);
      if (off.error) return json({ ok:false, error:"deactivate_failed" }, 500);
    }

    const ins = await admin.from("treinos_alunos").insert({
      aluno_id: aluno.id,
      personal_id: aluno.personal_id,
      plano: upgrade,
      ativo: true,
      atualizado_em: new Date().toISOString(),
    }).select("id,plano,atualizado_em").single();

    if (ins.error) {
      if (previousIds.length) await admin.from("treinos_alunos").update({ ativo:true }).in("id", previousIds);
      return json({ ok:false, error:"upgrade_failed" }, 500);
    }
    active = ins.data;
  }

  return json({
    ok:true,
    linked:true,
    aluno_id:aluno.id,
    treino:active,
  });
});
