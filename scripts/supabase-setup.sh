#!/usr/bin/env bash
set -uo pipefail
API="https://api.supabase.com/v1"
AUTH="Authorization: Bearer $SUPABASE_TOKEN"
{
echo "## Setup B2B — schema do módulo personal trainer"
echo '```'
REF=$(curl -s -H "$AUTH" "$API/projects" | jq -r '.[] | select(.name=="a-body") | .id' | head -1)
SERVICE=$(curl -s -H "$AUTH" "$API/projects/$REF/api-keys" | jq -r '.[] | select(.name=="service_role") | .api_key')
SUPA="https://$REF.supabase.co"

SQL=$(cat << 'EOSQL'
-- PERFIS
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'aluno' CHECK (tipo IN ('aluno','personal')),
  nome text,
  foto_url text,
  personal_id uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS profiles_sel ON public.profiles;
CREATE POLICY profiles_sel ON public.profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR personal_id = auth.uid()
         OR user_id = (SELECT p.personal_id FROM public.profiles p WHERE p.user_id = auth.uid()));
DROP POLICY IF EXISTS profiles_ins ON public.profiles;
CREATE POLICY profiles_ins ON public.profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS profiles_upd ON public.profiles;
CREATE POLICY profiles_upd ON public.profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND (personal_id IS NULL OR personal_id <> user_id));

-- CONVITES
CREATE TABLE IF NOT EXISTS public.convites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  personal_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  email text NOT NULL,
  aluno_nome text,
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16),'hex'),
  usado boolean NOT NULL DEFAULT false,
  criado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.convites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS convites_all ON public.convites;
CREATE POLICY convites_all ON public.convites FOR ALL TO authenticated
  USING (personal_id = auth.uid()) WITH CHECK (personal_id = auth.uid());

CREATE OR REPLACE FUNCTION public.aceitar_convite(p_token text, p_nome text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c record; pnome text;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('ok', false, 'erro', 'não autenticado'); END IF;
  SELECT * INTO c FROM public.convites WHERE token = p_token AND usado = false AND criado_em > now() - interval '30 days';
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'erro', 'convite inválido ou expirado'); END IF;
  INSERT INTO public.profiles (user_id, tipo, nome, personal_id)
  VALUES (auth.uid(), 'aluno', COALESCE(p_nome, c.aluno_nome), c.personal_id)
  ON CONFLICT (user_id) DO UPDATE SET personal_id = c.personal_id, nome = COALESCE(public.profiles.nome, EXCLUDED.nome);
  UPDATE public.convites SET usado = true WHERE id = c.id;
  SELECT nome INTO pnome FROM public.profiles WHERE user_id = c.personal_id;
  RETURN jsonb_build_object('ok', true, 'personal_nome', pnome);
END; $$;
REVOKE ALL ON FUNCTION public.aceitar_convite(text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.aceitar_convite(text, text) TO authenticated;

-- AGENDA SEMANAL
CREATE TABLE IF NOT EXISTS public.agenda (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  personal_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  aluno_id uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  aluno_nome text,
  dia_semana int NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  hora text NOT NULL,
  local text,
  tipo text NOT NULL DEFAULT 'presencial' CHECK (tipo IN ('presencial','independente')),
  criado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.agenda ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS agenda_personal ON public.agenda;
CREATE POLICY agenda_personal ON public.agenda FOR ALL TO authenticated
  USING (personal_id = auth.uid()) WITH CHECK (personal_id = auth.uid());
DROP POLICY IF EXISTS agenda_aluno ON public.agenda;
CREATE POLICY agenda_aluno ON public.agenda FOR SELECT TO authenticated USING (aluno_id = auth.uid());

-- TREINOS DOS ALUNOS
CREATE TABLE IF NOT EXISTS public.treinos_alunos (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  personal_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  aluno_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE UNIQUE,
  plan jsonb NOT NULL,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.treinos_alunos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS treinos_personal ON public.treinos_alunos;
CREATE POLICY treinos_personal ON public.treinos_alunos FOR ALL TO authenticated
  USING (personal_id = auth.uid()) WITH CHECK (personal_id = auth.uid());
DROP POLICY IF EXISTS treinos_aluno ON public.treinos_alunos;
CREATE POLICY treinos_aluno ON public.treinos_alunos FOR SELECT TO authenticated USING (aluno_id = auth.uid());

-- MENSAGENS ALUNO <-> PERSONAL
CREATE TABLE IF NOT EXISTS public.mensagens (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  aluno_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  personal_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  autor text NOT NULL CHECK (autor IN ('aluno','personal')),
  contexto text,
  texto text NOT NULL CHECK (char_length(texto) BETWEEN 1 AND 1000),
  lida boolean NOT NULL DEFAULT false,
  criado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mensagens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS msg_sel ON public.mensagens;
CREATE POLICY msg_sel ON public.mensagens FOR SELECT TO authenticated
  USING (aluno_id = auth.uid() OR personal_id = auth.uid());
DROP POLICY IF EXISTS msg_ins ON public.mensagens;
CREATE POLICY msg_ins ON public.mensagens FOR INSERT TO authenticated
  WITH CHECK ((autor = 'aluno' AND aluno_id = auth.uid()) OR (autor = 'personal' AND personal_id = auth.uid()));
DROP POLICY IF EXISTS msg_upd ON public.mensagens;
CREATE POLICY msg_upd ON public.mensagens FOR UPDATE TO authenticated
  USING (aluno_id = auth.uid() OR personal_id = auth.uid());

-- DOCUMENTOS (metadados)
CREATE TABLE IF NOT EXISTS public.documentos (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  nome text NOT NULL,
  path text NOT NULL,
  mime text NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS docs_own ON public.documentos;
CREATE POLICY docs_own ON public.documentos FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS docs_personal ON public.documentos;
CREATE POLICY docs_personal ON public.documentos FOR SELECT TO authenticated
  USING (user_id IN (SELECT p.user_id FROM public.profiles p WHERE p.personal_id = auth.uid()));

-- STORAGE: fotos de perfil dos personals (público) e documentos (privado)
DROP POLICY IF EXISTS perfil_fotos_ins ON storage.objects;
CREATE POLICY perfil_fotos_ins ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'perfil-fotos' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS perfil_fotos_upd ON storage.objects;
CREATE POLICY perfil_fotos_upd ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'perfil-fotos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS docs_storage_own ON storage.objects;
CREATE POLICY docs_storage_own ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'documentos' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'documentos' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS docs_storage_personal ON storage.objects;
CREATE POLICY docs_storage_personal ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documentos' AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id::text = (storage.foldername(name))[1] AND p.personal_id = auth.uid()));
EOSQL
)
curl -s -X POST "$API/projects/$REF/database/query" -H "$AUTH" -H "Content-Type: application/json" \
  -d "$(jq -n --arg q "$SQL" '{query:$q}')" | head -c 300; echo ""

echo "--- buckets ---"
curl -s -X POST "$SUPA/storage/v1/bucket" -H "Authorization: Bearer $SERVICE" -H "apikey: $SERVICE" -H "Content-Type: application/json" \
  -d '{"id":"perfil-fotos","name":"perfil-fotos","public":true,"file_size_limit":1048576,"allowed_mime_types":["image/jpeg","image/webp","image/png"]}' | jq -r '.name // .message'
curl -s -X POST "$SUPA/storage/v1/bucket" -H "Authorization: Bearer $SERVICE" -H "apikey: $SERVICE" -H "Content-Type: application/json" \
  -d '{"id":"documentos","name":"documentos","public":false,"file_size_limit":5242880,"allowed_mime_types":["application/pdf","image/jpeg","image/webp","image/png"]}' | jq -r '.name // .message'

curl -s -X POST "$API/projects/$REF/database/query" -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"query":"SELECT table_name FROM information_schema.tables WHERE table_schema=chr(112)||chr(117)||chr(98)||chr(108)||chr(105)||chr(99) ORDER BY 1;"}'
echo ""
echo '```'
} | tee /tmp/report.md
true
