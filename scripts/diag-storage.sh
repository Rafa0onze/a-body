#!/usr/bin/env bash
# Diagnóstico + reparo do storage do A-BODY (buckets perfis/documentos-saude e policies)
set -uo pipefail

API="https://api.supabase.com/v1"
AUTH="Authorization: Bearer $SUPABASE_TOKEN"
REPORT=/tmp/report.md

log() { echo "$1" | tee -a $REPORT; }
echo "## Diagnóstico de Storage — A-BODY" > $REPORT
echo '```' >> $REPORT

REF=$(curl -s -H "$AUTH" "$API/projects" | jq -r '.[] | select(.name=="a-body") | .id' | head -1)
[ -z "$REF" ] && { log "ERRO: projeto a-body não encontrado"; echo '```' >> $REPORT; exit 0; }
log "projeto: $REF"

SUPA="https://$REF.supabase.co"
SERVICE=$(curl -s -H "$AUTH" "$API/projects/$REF/api-keys" | jq -r '.[] | select(.name=="service_role") | .api_key' | head -1)
[ -z "$SERVICE" ] && { log "ERRO: service_role key não obtida"; echo '```' >> $REPORT; exit 0; }

q() { curl -s -X POST "$API/projects/$REF/database/query" -H "$AUTH" -H "Content-Type: application/json" -d "$(jq -n --arg q "$1" '{query:$q}')"; }

log ""
log "--- buckets existentes ---"
q "SELECT id, public, file_size_limit, allowed_mime_types FROM storage.buckets ORDER BY id;" | tee -a $REPORT
log ""
log "--- policies em storage.objects ---"
q "SELECT policyname, cmd FROM pg_policies WHERE schemaname='storage' AND tablename='objects' ORDER BY policyname;" | tee -a $REPORT

log ""
log "--- reparo: criar buckets se faltarem ---"
curl -s -X POST "$SUPA/storage/v1/bucket" -H "Authorization: Bearer $SERVICE" -H "apikey: $SERVICE" -H "Content-Type: application/json" \
  -d '{"id":"perfis","name":"perfis","public":true,"file_size_limit":2097152,"allowed_mime_types":["image/jpeg","image/webp","image/png"]}' | jq -c '.' | tee -a $REPORT
curl -s -X POST "$SUPA/storage/v1/bucket" -H "Authorization: Bearer $SERVICE" -H "apikey: $SERVICE" -H "Content-Type: application/json" \
  -d '{"id":"documentos-saude","name":"documentos-saude","public":false,"file_size_limit":10485760,"allowed_mime_types":["application/pdf","image/jpeg","image/png","image/webp"]}' | jq -c '.' | tee -a $REPORT

log ""
log "--- reparo: ajustar limite do bucket perfis para 2MB (se já existia com 1MB) ---"
curl -s -X PUT "$SUPA/storage/v1/bucket/perfis" -H "Authorization: Bearer $SERVICE" -H "apikey: $SERVICE" -H "Content-Type: application/json" \
  -d '{"public":true,"file_size_limit":2097152,"allowed_mime_types":["image/jpeg","image/webp","image/png"]}' | jq -c '.' | tee -a $REPORT

log ""
log "--- reparo: reaplicar policies de storage (idempotente) ---"
SQL2=$(cat << 'EOSQL'
DROP POLICY IF EXISTS perfis_proprio_all ON storage.objects;
CREATE POLICY perfis_proprio_all ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'perfis' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'perfis' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS perfis_leitura_publica ON storage.objects;
CREATE POLICY perfis_leitura_publica ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'perfis');
DROP POLICY IF EXISTS docs_saude_proprio_all ON storage.objects;
CREATE POLICY docs_saude_proprio_all ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'documentos-saude' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'documentos-saude' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS docs_saude_personal_select ON storage.objects;
CREATE POLICY docs_saude_personal_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documentos-saude' AND EXISTS (
    SELECT 1 FROM public.documentos_saude d JOIN public.alunos a ON a.id = d.aluno_id
    WHERE d.path = storage.objects.name AND a.personal_id = auth.uid()));
SELECT 'políticas de storage reaplicadas' AS resultado;
EOSQL
)
q "$SQL2" | tee -a $REPORT

log ""
log "--- verificação final ---"
q "SELECT id, public, file_size_limit FROM storage.buckets ORDER BY id;" | tee -a $REPORT
q "SELECT policyname FROM pg_policies WHERE schemaname='storage' AND tablename='objects' ORDER BY policyname;" | tee -a $REPORT

echo '```' >> $REPORT
