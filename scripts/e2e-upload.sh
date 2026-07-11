#!/usr/bin/env bash
# Diagnóstico profundo do schema storage
set -uo pipefail
API="https://api.supabase.com/v1"
AUTH="Authorization: Bearer $SUPABASE_TOKEN"
REPORT=/tmp/report.md
log() { echo "$1" | tee -a $REPORT; }
echo "## Diagnóstico profundo storage — A-BODY" > $REPORT
echo '```' >> $REPORT

REF=$(curl -s -H "$AUTH" "$API/projects" | jq -r '.[] | select(.name=="a-body") | .id' | head -1)
SUPA="https://$REF.supabase.co"
KEYS=$(curl -s -H "$AUTH" "$API/projects/$REF/api-keys")
SERVICE=$(echo "$KEYS" | jq -r '.[] | select(.name=="service_role") | .api_key' | head -1)
ANON=$(echo "$KEYS" | jq -r '.[] | select(.name=="anon") | .api_key' | head -1)

q() { curl -s -X POST "$API/projects/$REF/database/query" -H "$AUTH" -H "Content-Type: application/json" -d "$(jq -n --arg q "$1" '{query:$q}')"; }

log "--- últimas migrações do storage ---"
q "SELECT id, name, executed_at FROM storage.migrations ORDER BY id DESC LIMIT 6;" | tee -a $REPORT
log ""
log "--- colunas de storage.objects ---"
q "SELECT column_name FROM information_schema.columns WHERE table_schema='storage' AND table_name='objects' ORDER BY ordinal_position;" | tee -a $REPORT
log ""
log "--- policies completas (qual) em storage.objects ---"
q "SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE schemaname='storage' AND tablename='objects' ORDER BY policyname;" | tee -a $REPORT
log ""
log "--- triggers em storage.objects ---"
q "SELECT tgname, pg_get_triggerdef(t.oid) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='storage' AND c.relname='objects' AND NOT tgisinternal;" | tee -a $REPORT
log ""
log "--- INSERT direto em storage.objects (como postgres, para achar o erro real) ---"
q "INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('perfis','00000000-0000-0000-0000-000000000001/diag.jpg', NULL) RETURNING id;" | tee -a $REPORT
q "DELETE FROM storage.objects WHERE bucket_id='perfis' AND name='00000000-0000-0000-0000-000000000001/diag.jpg';" | tee -a $REPORT
log ""
log "--- upload em outro bucket (fotos-corporais) p/ ver se o problema é global ---"
EMAIL="e2e-diag-$(date +%s)@teste.abody.local"
PASS="E2e-$(openssl rand -hex 8)"
U=$(curl -s -X POST "$SUPA/auth/v1/admin/users" -H "Authorization: Bearer $SERVICE" -H "apikey: $SERVICE" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\",\"email_confirm\":true}")
log "admin create (raw, 300c): $(echo "$U" | head -c 300)"
UID=$(echo "$U" | jq -r '.id // empty')
TOK=$(curl -s -X POST "$SUPA/auth/v1/token?grant_type=password" -H "apikey: $ANON" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" | jq -r '.access_token // empty')
printf '\xff\xd8\xff\xdb\x00\x43\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\x09\x09\x08\x0a\x0c\x14\x0d\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c\x20\x24\x2e\x27\x20\x22\x2c\x23\x1c\x1c\x28\x37\x29\x2c\x30\x31\x34\x34\x34\x1f\x27\x39\x3d\x38\x32\x3c\x2e\x33\x34\x32\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00\xff\xda\x00\x08\x01\x01\x00\x00\x3f\x00\xfb\xfe\x8a\xff\xd9' > /tmp/px.jpg
for B in perfis fotos-corporais; do
  R=$(curl -s -w " | HTTP %{http_code}" -X POST "$SUPA/storage/v1/object/$B/$UID/diag.jpg" \
    -H "apikey: $ANON" -H "Authorization: Bearer $TOK" -H "Content-Type: image/jpeg" --data-binary @/tmp/px.jpg)
  log "$B: $R"
done
curl -s -X DELETE "$SUPA/auth/v1/admin/users/$UID" -H "apikey: $SERVICE" -H "Authorization: Bearer $SERVICE" -o /dev/null
echo '```' >> $REPORT
