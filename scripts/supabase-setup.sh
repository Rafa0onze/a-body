#!/usr/bin/env bash
set -uo pipefail
API="https://api.supabase.com/v1"
AUTH="Authorization: Bearer $SUPABASE_TOKEN"
{
echo "## Setup — armazenamento privado de fotos corporais (LGPD)"
echo '```'
REF=$(curl -s -H "$AUTH" "$API/projects" | jq -r '.[] | select(.name=="a-body") | .id' | head -1)
SERVICE=$(curl -s -H "$AUTH" "$API/projects/$REF/api-keys" | jq -r '.[] | select(.name=="service_role") | .api_key')
SUPA="https://$REF.supabase.co"

echo "--- bucket privado ---"
curl -s -X POST "$SUPA/storage/v1/bucket" \
  -H "Authorization: Bearer $SERVICE" -H "apikey: $SERVICE" -H "Content-Type: application/json" \
  -d '{"id":"fotos-corporais","name":"fotos-corporais","public":false,"file_size_limit":2097152,"allowed_mime_types":["image/jpeg","image/webp","image/png"]}' | jq -r '.name // .message // .error'

echo "--- políticas RLS (cada usuário só acessa a própria pasta) ---"
SQL=$(cat << 'EOSQL'
DROP POLICY IF EXISTS "fotos_corporais_insert_proprio" ON storage.objects;
CREATE POLICY "fotos_corporais_insert_proprio" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'fotos-corporais' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "fotos_corporais_select_proprio" ON storage.objects;
CREATE POLICY "fotos_corporais_select_proprio" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'fotos-corporais' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "fotos_corporais_delete_proprio" ON storage.objects;
CREATE POLICY "fotos_corporais_delete_proprio" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'fotos-corporais' AND (storage.foldername(name))[1] = auth.uid()::text);
EOSQL
)
curl -s -X POST "$API/projects/$REF/database/query" -H "$AUTH" -H "Content-Type: application/json" \
  -d "$(jq -n --arg q "$SQL" '{query:$q}')" | head -c 200; echo ""
echo '```'
} | tee /tmp/report.md
true
