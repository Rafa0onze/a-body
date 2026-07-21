#!/usr/bin/env bash
set -uo pipefail
API="https://api.supabase.com/v1"
AUTH="Authorization: Bearer $SUPABASE_TOKEN"
{
echo "## Retrato dos cadastros"
echo '```'
REF=$(curl -s -H "$AUTH" "$API/projects" | jq -r '.[] | select(.name=="a-body") | .id' | head -1)
Q() { curl -s -X POST "$API/projects/$REF/database/query" -H "$AUTH" -H "Content-Type: application/json" -d "$(jq -n --arg q "$1" '{query:$q}')"; }
echo "--- usuários (auth) ---"
Q "SELECT email, to_char(created_at, 'DD/MM HH24:MI') AS criado, to_char(last_sign_in_at, 'DD/MM HH24:MI') AS ultimo_login, CASE WHEN raw_app_meta_data->>'provider' = 'google' THEN 'google' ELSE 'email' END AS via FROM auth.users ORDER BY created_at;"
echo ""
echo "--- profissionais ---"
Q "SELECT p.nome, u.email FROM public.profissionais p JOIN auth.users u ON u.id = p.user_id;"
echo ""
echo "--- alunos e convites ---"
Q "SELECT a.nome, a.email, a.status, (SELECT count(*) FROM public.convites c WHERE c.aluno_id = a.id AND c.usado_em IS NOT NULL) AS convites_usados FROM public.alunos a ORDER BY a.criado_em;"
echo ""
echo "--- atividade ---"
Q "SELECT (SELECT count(*) FROM public.checkins) AS checkins, (SELECT count(*) FROM public.mensagens) AS mensagens, (SELECT count(*) FROM public.treinos_alunos WHERE ativo) AS treinos_ativos, (SELECT count(*) FROM public.eventos) AS eventos;"
echo ""
echo '```'
} | tee /tmp/report.md
true
