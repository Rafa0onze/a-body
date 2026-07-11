#!/usr/bin/env bash
# Reparo: remover policies legadas do storage e revalidar upload
set -uo pipefail
API="https://api.supabase.com/v1"
AUTH="Authorization: Bearer $SUPABASE_TOKEN"
REPORT=/tmp/report.md
log() { echo "$1" | tee -a $REPORT; }
echo "## Reparo storage legado — A-BODY" > $REPORT
echo '```' >> $REPORT

REF=$(curl -s -H "$AUTH" "$API/projects" | jq -r '.[] | select(.name=="a-body") | .id' | head -1)
SUPA="https://$REF.supabase.co"
KEYS=$(curl -s -H "$AUTH" "$API/projects/$REF/api-keys")
SERVICE=$(echo "$KEYS" | jq -r '.[] | select(.name=="service_role") | .api_key' | head -1)
ANON=$(echo "$KEYS" | jq -r '.[] | select(.name=="anon") | .api_key' | head -1)
q() { curl -s -X POST "$API/projects/$REF/database/query" -H "$AUTH" -H "Content-Type: application/json" -d "$(jq -n --arg q "$1" '{query:$q}')"; }

log "--- confirmação: policies legadas já removidas ---"
q "SELECT c.relname, c.relkind FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='profiles';" | tee -a $REPORT
q "SELECT policyname, cmd, qual FROM pg_policies WHERE schemaname='public' AND tablename='profiles';" | tee -a $REPORT

log ""
log "--- removendo policies legadas do storage (bucket 'documentos' antigo) ---"
q "DROP POLICY IF EXISTS docs_storage_own ON storage.objects; DROP POLICY IF EXISTS docs_storage_personal ON storage.objects; SELECT 'legadas removidas' AS r;" | tee -a $REPORT

log ""
log "--- revalidação: upload com token de usuário ---"
EMAIL="e2e-fix-$(date +%s)@teste.abody.local"
PASS="E2e-$(openssl rand -hex 8)"
U=$(curl -s -X POST "$SUPA/auth/v1/admin/users" -H "Authorization: Bearer $SERVICE" -H "apikey: $SERVICE" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\",\"email_confirm\":true}")
GRANT=$(curl -s -X POST "$SUPA/auth/v1/token?grant_type=password" -H "apikey: $ANON" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}")
TOK=$(echo "$GRANT" | jq -r '.access_token // empty')
log "grant raw (300c): $(echo "$GRANT" | head -c 300)"
# uid à prova de formato: claim sub do próprio JWT
PAY=$(echo "$TOK" | cut -d. -f2 | tr '_-' '/+' )
PAD=$(( (4 - ${#PAY} % 4) % 4 )); PAY="$PAY$(printf '=%.0s' $(seq 1 $PAD) 2>/dev/null)"
USR_ID=$(echo "$PAY" | base64 -d 2>/dev/null | jq -r '.sub // empty')
log "usuário (sub do JWT): $USR_ID"
printf '\xff\xd8\xff\xdb\x00\x43\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\x09\x09\x08\x0a\x0c\x14\x0d\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c\x20\x24\x2e\x27\x20\x22\x2c\x23\x1c\x1c\x28\x37\x29\x2c\x30\x31\x34\x34\x34\x1f\x27\x39\x3d\x38\x32\x3c\x2e\x33\x34\x32\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00\xff\xda\x00\x08\x01\x01\x00\x00\x3f\x00\xfb\xfe\x8a\xff\xd9' > /tmp/px.jpg
for B in perfis fotos-corporais documentos-saude; do
  R=$(curl -s -w " | HTTP %{http_code}" -X POST "$SUPA/storage/v1/object/$B/$USR_ID/diag.jpg" \
    -H "apikey: $ANON" -H "Authorization: Bearer $TOK" -H "Content-Type: image/jpeg" --data-binary @/tmp/px.jpg)
  log "$B: $R"
done
log ""
log "--- leitura pública do perfis ---"
curl -s -o /dev/null -w "GET público: HTTP %{http_code}\n" "$SUPA/storage/v1/object/public/perfis/$USR_ID/diag.jpg" | tee -a $REPORT

log "--- limpeza ---"
for B in perfis fotos-corporais documentos-saude; do
  curl -s -X DELETE "$SUPA/storage/v1/object/$B/$USR_ID/diag.jpg" -H "apikey: $SERVICE" -H "Authorization: Bearer $SERVICE" -o /dev/null
done
curl -s -X DELETE "$SUPA/auth/v1/admin/users/$USR_ID" -H "apikey: $SERVICE" -H "Authorization: Bearer $SERVICE" -o /dev/null -w "delete user: HTTP %{http_code}\n" | tee -a $REPORT
echo '```' >> $REPORT
