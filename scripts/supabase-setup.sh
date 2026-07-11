#!/usr/bin/env bash
set -uo pipefail
API="https://api.supabase.com/v1"
AUTH="Authorization: Bearer $SUPABASE_TOKEN"
{
echo "## B2B Bloco 1 — fundação de dados"
echo '```'
REF=$(curl -s -H "$AUTH" "$API/projects" | jq -r '.[] | select(.name=="a-body") | .id' | head -1)
SERVICE=$(curl -s -H "$AUTH" "$API/projects/$REF/api-keys" | jq -r '.[] | select(.name=="service_role") | .api_key')
SUPA="https://$REF.supabase.co"

echo "--- schema atual da tabela convites (se existir) ---"
curl -s -X POST "$API/projects/$REF/database/query" -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"query":"SELECT column_name FROM information_schema.columns WHERE table_schema = chr(112)||chr(117)||chr(98)||chr(108)||chr(105)||chr(99) AND table_name = chr(99)||chr(111)||chr(110)||chr(118)||chr(105)||chr(116)||chr(101)||chr(115);"}'
echo ""

SQL=$(cat << 'EOSQL'
-- tabela convites legada (sem aluno_id) é de uma versão antiga: remover com segurança
DO $mig$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='convites')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='convites' AND column_name='aluno_id')
  THEN DROP TABLE public.convites CASCADE; END IF;
END $mig$;

-- ===== PROFISSIONAIS =====
CREATE TABLE IF NOT EXISTS public.profissionais (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL CHECK (char_length(nome) BETWEEN 2 AND 80),
  foto_url text,
  criado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profissionais ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS prof_proprio ON public.profissionais;
CREATE POLICY prof_proprio ON public.profissionais FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
-- ===== ALUNOS =====
CREATE TABLE IF NOT EXISTS public.alunos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  personal_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  nome text NOT NULL CHECK (char_length(nome) BETWEEN 2 AND 80),
  email text NOT NULL CHECK (email ~* '^[^@]+@[^@]+\.[^@]+$'),
  status text NOT NULL DEFAULT 'convidado' CHECK (status IN ('convidado','ativo','inativo')),
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_alunos_personal ON public.alunos (personal_id);
CREATE INDEX IF NOT EXISTS idx_alunos_user ON public.alunos (user_id);
ALTER TABLE public.alunos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS alunos_do_personal ON public.alunos;
CREATE POLICY alunos_do_personal ON public.alunos FOR ALL TO authenticated
  USING (personal_id = auth.uid()) WITH CHECK (personal_id = auth.uid());
DROP POLICY IF EXISTS aluno_se_ve ON public.alunos;
CREATE POLICY aluno_se_ve ON public.alunos FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS prof_visto_por_alunos ON public.profissionais;
CREATE POLICY prof_visto_por_alunos ON public.profissionais FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.alunos a WHERE a.personal_id = profissionais.user_id AND a.user_id = auth.uid()));


-- ===== CONVITES =====
CREATE TABLE IF NOT EXISTS public.convites (
  token uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  expira_em timestamptz NOT NULL DEFAULT now() + interval '7 days',
  usado_em timestamptz
);
ALTER TABLE public.convites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS convites_do_personal ON public.convites;
CREATE POLICY convites_do_personal ON public.convites FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.alunos a WHERE a.id = convites.aluno_id AND a.personal_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.alunos a WHERE a.id = convites.aluno_id AND a.personal_id = auth.uid()));

-- ativação segura do convite pelo aluno recém-cadastrado
CREATE OR REPLACE FUNCTION public.ativar_convite(p_token uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_aluno alunos%ROWTYPE; v_conv convites%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('ok', false, 'erro', 'não autenticado'); END IF;
  SELECT * INTO v_conv FROM convites WHERE token = p_token AND usado_em IS NULL AND expira_em > now();
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'erro', 'convite inválido ou expirado'); END IF;
  UPDATE alunos SET user_id = auth.uid(), status = 'ativo' WHERE id = v_conv.aluno_id RETURNING * INTO v_aluno;
  UPDATE convites SET usado_em = now() WHERE token = p_token;
  RETURN jsonb_build_object('ok', true, 'aluno_id', v_aluno.id, 'personal_id', v_aluno.personal_id, 'nome', v_aluno.nome);
END; $$;
REVOKE ALL ON FUNCTION public.ativar_convite(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.ativar_convite(uuid) TO authenticated;

-- ===== AULAS =====
CREATE TABLE IF NOT EXISTS public.aulas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  personal_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  aluno_id uuid REFERENCES public.alunos(id) ON DELETE SET NULL,
  dia_semana int CHECK (dia_semana BETWEEN 1 AND 7),
  data date,
  hora time NOT NULL,
  duracao_min int NOT NULL DEFAULT 60 CHECK (duracao_min BETWEEN 15 AND 240),
  local text,
  tipo text NOT NULL DEFAULT 'presencial' CHECK (tipo IN ('presencial','independente')),
  criado_em timestamptz NOT NULL DEFAULT now(),
  CHECK (dia_semana IS NOT NULL OR data IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_aulas_personal ON public.aulas (personal_id);
ALTER TABLE public.aulas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS aulas_do_personal ON public.aulas;
CREATE POLICY aulas_do_personal ON public.aulas FOR ALL TO authenticated
  USING (personal_id = auth.uid()) WITH CHECK (personal_id = auth.uid());
DROP POLICY IF EXISTS aulas_do_aluno ON public.aulas;
CREATE POLICY aulas_do_aluno ON public.aulas FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.alunos a WHERE a.id = aulas.aluno_id AND a.user_id = auth.uid()));

-- ===== TREINOS DOS ALUNOS =====
CREATE TABLE IF NOT EXISTS public.treinos_alunos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  personal_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plano jsonb NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_treinos_aluno ON public.treinos_alunos (aluno_id, ativo);
ALTER TABLE public.treinos_alunos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS treinos_do_personal ON public.treinos_alunos;
CREATE POLICY treinos_do_personal ON public.treinos_alunos FOR ALL TO authenticated
  USING (personal_id = auth.uid()) WITH CHECK (personal_id = auth.uid());
DROP POLICY IF EXISTS treinos_do_aluno ON public.treinos_alunos;
CREATE POLICY treinos_do_aluno ON public.treinos_alunos FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.alunos a WHERE a.id = treinos_alunos.aluno_id AND a.user_id = auth.uid()));

-- ===== EXERCÍCIOS PERSONALIZADOS DO PERSONAL =====
CREATE TABLE IF NOT EXISTS public.exercicios_custom (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  personal_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL CHECK (char_length(nome) BETWEEN 2 AND 120),
  grupo_muscular text,
  usa_cronometro boolean NOT NULL DEFAULT false,
  tempo_seg int CHECK (tempo_seg BETWEEN 5 AND 3600),
  observacoes text CHECK (char_length(observacoes) <= 500),
  criado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.exercicios_custom ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS excustom_do_personal ON public.exercicios_custom;
CREATE POLICY excustom_do_personal ON public.exercicios_custom FOR ALL TO authenticated
  USING (personal_id = auth.uid()) WITH CHECK (personal_id = auth.uid());
DROP POLICY IF EXISTS excustom_visto_por_alunos ON public.exercicios_custom;
CREATE POLICY excustom_visto_por_alunos ON public.exercicios_custom FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.alunos a WHERE a.personal_id = exercicios_custom.personal_id AND a.user_id = auth.uid()));

-- ===== MENSAGENS ALUNO <-> PERSONAL =====
CREATE TABLE IF NOT EXISTS public.mensagens (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  autor text NOT NULL CHECK (autor IN ('aluno','personal')),
  contexto jsonb,
  texto text NOT NULL CHECK (char_length(texto) BETWEEN 1 AND 2000),
  lida boolean NOT NULL DEFAULT false,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_msgs_aluno ON public.mensagens (aluno_id, criado_em);
ALTER TABLE public.mensagens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS msgs_personal ON public.mensagens;
CREATE POLICY msgs_personal ON public.mensagens FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.alunos a WHERE a.id = mensagens.aluno_id AND a.personal_id = auth.uid()))
  WITH CHECK (autor = 'personal' AND EXISTS (SELECT 1 FROM public.alunos a WHERE a.id = mensagens.aluno_id AND a.personal_id = auth.uid()));
DROP POLICY IF EXISTS msgs_aluno_select ON public.mensagens;
CREATE POLICY msgs_aluno_select ON public.mensagens FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.alunos a WHERE a.id = mensagens.aluno_id AND a.user_id = auth.uid()));
DROP POLICY IF EXISTS msgs_aluno_insert ON public.mensagens;
CREATE POLICY msgs_aluno_insert ON public.mensagens FOR INSERT TO authenticated
  WITH CHECK (autor = 'aluno' AND EXISTS (SELECT 1 FROM public.alunos a WHERE a.id = mensagens.aluno_id AND a.user_id = auth.uid()));

-- ===== DOCUMENTOS DE SAÚDE =====
CREATE TABLE IF NOT EXISTS public.documentos_saude (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dono_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  aluno_id uuid REFERENCES public.alunos(id) ON DELETE CASCADE,
  path text NOT NULL,
  tipo text CHECK (tipo IN ('bioimpedancia','exame','outro')),
  criado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.documentos_saude ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS docs_do_dono ON public.documentos_saude;
CREATE POLICY docs_do_dono ON public.documentos_saude FOR ALL TO authenticated
  USING (dono_user_id = auth.uid()) WITH CHECK (dono_user_id = auth.uid());
DROP POLICY IF EXISTS docs_do_personal ON public.documentos_saude;
CREATE POLICY docs_do_personal ON public.documentos_saude FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.alunos a WHERE a.id = documentos_saude.aluno_id AND a.personal_id = auth.uid()));

SELECT 'tabelas B2B criadas' AS resultado;
EOSQL
)
curl -s -X POST "$API/projects/$REF/database/query" -H "$AUTH" -H "Content-Type: application/json" \
  -d "$(jq -n --arg q "$SQL" '{query:$q}')" | head -c 300; echo ""

echo "--- buckets: fotos de perfil (público) e documentos (privado) ---"
curl -s -X POST "$SUPA/storage/v1/bucket" -H "Authorization: Bearer $SERVICE" -H "apikey: $SERVICE" -H "Content-Type: application/json" \
  -d '{"id":"perfis","name":"perfis","public":true,"file_size_limit":1048576,"allowed_mime_types":["image/jpeg","image/webp","image/png"]}' | jq -r '.name // .message'
curl -s -X POST "$SUPA/storage/v1/bucket" -H "Authorization: Bearer $SERVICE" -H "apikey: $SERVICE" -H "Content-Type: application/json" \
  -d '{"id":"documentos-saude","name":"documentos-saude","public":false,"file_size_limit":10485760,"allowed_mime_types":["application/pdf","image/jpeg","image/png","image/webp"]}' | jq -r '.name // .message'

SQL2=$(cat << 'EOSQL'
DROP POLICY IF EXISTS perfis_proprio_all ON storage.objects;
CREATE POLICY perfis_proprio_all ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'perfis' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'perfis' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS docs_saude_proprio_all ON storage.objects;
CREATE POLICY docs_saude_proprio_all ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'documentos-saude' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'documentos-saude' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS docs_saude_personal_select ON storage.objects;
CREATE POLICY docs_saude_personal_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documentos-saude' AND EXISTS (
    SELECT 1 FROM public.documentos_saude d JOIN public.alunos a ON a.id = d.aluno_id
    WHERE d.path = storage.objects.name AND a.personal_id = auth.uid()));
SELECT 'políticas de storage ok' AS resultado;
EOSQL
)
curl -s -X POST "$API/projects/$REF/database/query" -H "$AUTH" -H "Content-Type: application/json" \
  -d "$(jq -n --arg q "$SQL2" '{query:$q}')" | head -c 300; echo ""
echo '```'
} | tee /tmp/report.md
true
