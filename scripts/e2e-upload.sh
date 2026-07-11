#!/usr/bin/env bash
# Migração: tabela avaliacoes_alunos (avaliação corporal do aluno pelo personal)
set -uo pipefail
API="https://api.supabase.com/v1"
AUTH="Authorization: Bearer $SUPABASE_TOKEN"
REPORT=/tmp/report.md
log() { echo "$1" | tee -a $REPORT; }
echo "## Migração avaliacoes_alunos — A-BODY" > $REPORT
echo '```' >> $REPORT
REF=$(curl -s -H "$AUTH" "$API/projects" | jq -r '.[] | select(.name=="a-body") | .id' | head -1)
q() { curl -s -X POST "$API/projects/$REF/database/query" -H "$AUTH" -H "Content-Type: application/json" -d "$(jq -n --arg q "$1" '{query:$q}')"; }

SQL=$(cat << 'EOSQL'
CREATE TABLE IF NOT EXISTS public.avaliacoes_alunos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  personal_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dados jsonb NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_aval_aluno ON public.avaliacoes_alunos (aluno_id, criado_em);
ALTER TABLE public.avaliacoes_alunos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS aval_do_personal ON public.avaliacoes_alunos;
CREATE POLICY aval_do_personal ON public.avaliacoes_alunos FOR ALL TO authenticated
  USING (personal_id = auth.uid())
  WITH CHECK (personal_id = auth.uid() AND EXISTS (SELECT 1 FROM public.alunos a WHERE a.id = avaliacoes_alunos.aluno_id AND a.personal_id = auth.uid()));
DROP POLICY IF EXISTS aval_do_aluno_select ON public.avaliacoes_alunos;
CREATE POLICY aval_do_aluno_select ON public.avaliacoes_alunos FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.alunos a WHERE a.id = avaliacoes_alunos.aluno_id AND a.user_id = auth.uid()));
SELECT 'avaliacoes_alunos criada' AS resultado;
EOSQL
)
q "$SQL" | tee -a $REPORT
echo '```' >> $REPORT
