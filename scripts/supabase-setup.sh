#!/usr/bin/env bash
set -uo pipefail
API="https://api.supabase.com/v1"
AUTH="Authorization: Bearer $SUPABASE_TOKEN"
{
echo "## Setup — quota de IA, telemetria e otimização de imagens"
echo '```'
REF=$(curl -s -H "$AUTH" "$API/projects" | jq -r '.[] | select(.name=="a-body") | .id' | head -1)
echo "projeto: $REF"
SERVICE=$(curl -s -H "$AUTH" "$API/projects/$REF/api-keys" | jq -r '.[] | select(.name=="service_role") | .api_key')
SUPA="https://$REF.supabase.co"

echo "--- quota de IA (tabela + função) ---"
SQL1=$(cat << 'EOSQL'
CREATE TABLE IF NOT EXISTS public.ia_usage (
  user_id uuid NOT NULL,
  dia date NOT NULL DEFAULT current_date,
  count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, dia)
);
ALTER TABLE public.ia_usage ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.consume_ia_quota(limite integer DEFAULT 20)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE atual integer;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  INSERT INTO public.ia_usage (user_id, dia, count) VALUES (auth.uid(), current_date, 1)
  ON CONFLICT (user_id, dia) DO UPDATE SET count = ia_usage.count + 1
  RETURNING count INTO atual;
  RETURN atual <= limite;
END; $$;
REVOKE ALL ON FUNCTION public.consume_ia_quota(integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.consume_ia_quota(integer) TO authenticated;

CREATE TABLE IF NOT EXISTS public.eventos (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  anon_id text,
  user_id uuid,
  evento text NOT NULL CHECK (char_length(evento) <= 60),
  props jsonb,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_eventos_evento ON public.eventos (evento, criado_em);
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Inserção pública de eventos" ON public.eventos;
CREATE POLICY "Inserção pública de eventos" ON public.eventos
  FOR INSERT TO anon, authenticated WITH CHECK (true);
EOSQL
)
curl -s -X POST "$API/projects/$REF/database/query" -H "$AUTH" -H "Content-Type: application/json" \
  -d "$(jq -n --arg q "$SQL1" '{query:$q}')" | head -c 200; echo ""

echo "--- convertendo imagens para WebP ---"
pip install pillow --quiet 2>/dev/null || pip install pillow --break-system-packages --quiet
LISTA=$(curl -s -X POST "$SUPA/storage/v1/object/list/exercicios" \
  -H "Authorization: Bearer $SERVICE" -H "apikey: $SERVICE" -H "Content-Type: application/json" \
  -d '{"prefix":"","limit":300}' | jq -r '.[].name | select(test("\\.(png|jpg|jpeg)$"))')
OK=0; FAIL=0; ANTES=0; DEPOIS=0
for arquivo in $LISTA; do
  curl -s -o /tmp/orig "$SUPA/storage/v1/object/public/exercicios/$arquivo"
  T_ANTES=$(stat -c%s /tmp/orig)
  python3 - "$arquivo" << 'EOPY'
import sys
from PIL import Image
arq = sys.argv[1]
img = Image.open('/tmp/orig').convert('RGB')
if img.width > 700:
    img = img.resize((700, int(img.height*700/img.width)), Image.LANCZOS)
img.save('/tmp/conv.webp', 'WEBP', quality=80, method=6)
EOPY
  if [ $? -ne 0 ]; then FAIL=$((FAIL+1)); echo "conversão falhou: $arquivo"; continue; fi
  T_DEPOIS=$(stat -c%s /tmp/conv.webp)
  NOVO="${arquivo%.*}.webp"
  UP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$SUPA/storage/v1/object/exercicios/$NOVO" \
    -H "Authorization: Bearer $SERVICE" -H "apikey: $SERVICE" -H "Content-Type: image/webp" \
    -H "x-upsert: true" --data-binary @/tmp/conv.webp)
  if [ "$UP" = "200" ]; then OK=$((OK+1)); ANTES=$((ANTES+T_ANTES)); DEPOIS=$((DEPOIS+T_DEPOIS));
  else FAIL=$((FAIL+1)); echo "upload falhou: $NOVO ($UP)"; fi
done
echo "webp ok: $OK | falhas: $FAIL | ${ANTES} bytes -> ${DEPOIS} bytes"

echo "--- atualizando imagem_url para .webp ---"
curl -s -X POST "$API/projects/$REF/database/query" -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"query":"UPDATE public.exercicios SET imagem_url = replace(replace(imagem_url, chr(46)||chr(112)||chr(110)||chr(103), chr(46)||chr(119)||chr(101)||chr(98)||chr(112)), chr(46)||chr(106)||chr(112)||chr(103), chr(46)||chr(119)||chr(101)||chr(98)||chr(112)) WHERE imagem_url IS NOT NULL; SELECT count(*) FILTER (WHERE imagem_url LIKE chr(37)||chr(46)||chr(119)||chr(101)||chr(98)||chr(112)) AS webp, count(*) AS total FROM public.exercicios;"}'
echo ""
echo '```'
} | tee /tmp/report.md
true
