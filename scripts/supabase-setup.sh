#!/usr/bin/env bash
set -uo pipefail
API="https://api.supabase.com/v1"
AUTH="Authorization: Bearer $SUPABASE_TOKEN"
{
echo "## Melhorias B2B — tabela de check-ins (adesão)"
echo '```'
REF=$(curl -s -H "$AUTH" "$API/projects" | jq -r '.[] | select(.name=="a-body") | .id' | head -1)
SQL=$(cat << 'EOSQL'
CREATE TABLE IF NOT EXISTS public.checkins (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  data date NOT NULL DEFAULT current_date,
  treino_label text,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_checkins_aluno ON public.checkins (aluno_id, data);
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS checkins_aluno_insert ON public.checkins;
CREATE POLICY checkins_aluno_insert ON public.checkins FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.alunos a WHERE a.id = checkins.aluno_id AND a.user_id = auth.uid()));
DROP POLICY IF EXISTS checkins_aluno_select ON public.checkins;
CREATE POLICY checkins_aluno_select ON public.checkins FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.alunos a WHERE a.id = checkins.aluno_id AND a.user_id = auth.uid()));
DROP POLICY IF EXISTS checkins_personal_select ON public.checkins;
CREATE POLICY checkins_personal_select ON public.checkins FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.alunos a WHERE a.id = checkins.aluno_id AND a.personal_id = auth.uid()));
SELECT 'checkins ok' AS r;
EOSQL
)
curl -s -X POST "$API/projects/$REF/database/query" -H "$AUTH" -H "Content-Type: application/json" \
  -d "$(jq -n --arg q "$SQL" '{query:$q}')" | head -c 200; echo ""
echo '```'
} | tee /tmp/report.md
true
