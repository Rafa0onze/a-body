#!/usr/bin/env bash
set -uo pipefail
API="https://api.supabase.com/v1"
AUTH="Authorization: Bearer $SUPABASE_TOKEN"
{
echo "## Setup — tabela de sugestões de exercícios"
echo '```'
REF=$(curl -s -H "$AUTH" "$API/projects" | jq -r '.[] | select(.name=="a-body") | .id' | head -1)
echo "projeto: $REF"
SQL=$(cat << 'EOSQL'
CREATE TABLE IF NOT EXISTS public.sugestoes_exercicios (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome text NOT NULL CHECK (char_length(nome) BETWEEN 2 AND 120),
  criado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sugestoes_exercicios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Inserção pública de sugestões" ON public.sugestoes_exercicios;
CREATE POLICY "Inserção pública de sugestões" ON public.sugestoes_exercicios
  FOR INSERT TO anon, authenticated WITH CHECK (true);
EOSQL
)
curl -s -X POST "$API/projects/$REF/database/query" -H "$AUTH" -H "Content-Type: application/json" \
  -d "$(jq -n --arg q "$SQL" '{query:$q}')" | head -c 300; echo ""
curl -s -X POST "$API/projects/$REF/database/query" -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"query":"SELECT count(*) FROM public.sugestoes_exercicios;"}'
echo ""
echo '```'
} | tee /tmp/report.md
true
