#!/usr/bin/env bash
set -uo pipefail
API="https://api.supabase.com/v1"
AUTH="Authorization: Bearer $SUPABASE_TOKEN"
{
echo "## Checagem pós-reset do banco"
echo '```'
REF=$(curl -s -H "$AUTH" "$API/projects" | jq -r '.[] | select(.name=="a-body") | .id' | head -1)
curl -s -X POST "$API/projects/$REF/database/query" -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"query":"SELECT (SELECT count(*) FROM public.exercicios) AS exercicios, (SELECT count(*) FROM public.exercicios WHERE imagem_url IS NOT NULL) AS com_imagem, (SELECT count(*) FROM public.sugestoes_exercicios) AS sugestoes, (SELECT count(*) FROM public.eventos) AS eventos, (SELECT count(*) FROM public.user_data) AS user_data, (SELECT count(*) FROM auth.users) AS usuarios, (SELECT count(*) FROM storage.objects WHERE bucket_id = chr(101)||chr(120)||chr(101)||chr(114)||chr(99)||chr(105)||chr(99)||chr(105)||chr(111)||chr(115)) AS imgs_bucket;"}'
echo ""
echo '```'
} | tee /tmp/report.md
true
