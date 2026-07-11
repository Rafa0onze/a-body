#!/usr/bin/env bash
# E2E: reproduz o upload de foto de perfil exatamente como o app faz
set -uo pipefail
API="https://api.supabase.com/v1"
AUTH="Authorization: Bearer $SUPABASE_TOKEN"
REPORT=/tmp/report.md
log() { echo "$1" | tee -a $REPORT; }
echo "## E2E upload perfis — A-BODY" > $REPORT
echo '```' >> $REPORT

REF=$(curl -s -H "$AUTH" "$API/projects" | jq -r '.[] | select(.name=="a-body") | .id' | head -1)
SUPA="https://$REF.supabase.co"
KEYS=$(curl -s -H "$AUTH" "$API/projects/$REF/api-keys")
SERVICE=$(echo "$KEYS" | jq -r '.[] | select(.name=="service_role") | .api_key' | head -1)
ANON=$(echo "$KEYS" | jq -r '.[] | select(.name=="anon") | .api_key' | head -1)
log "projeto: $REF | anon len: ${#ANON} | service len: ${#SERVICE}"

EMAIL="e2e-upload-$(date +%s)@teste.abody.local"
PASS="E2e-$(openssl rand -hex 8)"
U=$(curl -s -X POST "$SUPA/auth/v1/admin/users" -H "Authorization: Bearer $SERVICE" -H "apikey: $SERVICE" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\",\"email_confirm\":true}")
UID=$(echo "$U" | jq -r '.id // empty')
log "usuário de teste: ${UID:-FALHOU: $(echo $U | head -c 200)}"
[ -z "$UID" ] && { echo '```' >> $REPORT; exit 0; }

TOK=$(curl -s -X POST "$SUPA/auth/v1/token?grant_type=password" -H "apikey: $ANON" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" | jq -r '.access_token // empty')
log "login: token len ${#TOK}"

# jpeg 1x1 válido
printf '\xff\xd8\xff\xdb\x00\x43\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\x09\x09\x08\x0a\x0c\x14\x0d\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c\x20\x24\x2e\x27\x20\x22\x2c\x23\x1c\x1c\x28\x37\x29\x2c\x30\x31\x34\x34\x34\x1f\x27\x39\x3d\x38\x32\x3c\x2e\x33\x34\x32\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00\xff\xc4\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0a\x0b\xff\xc4\x00\xb5\x10\x00\x02\x01\x03\x03\x02\x04\x03\x05\x05\x04\x04\x00\x00\x01\x7d\x01\x02\x03\x00\x04\x11\x05\x12\x21\x31\x41\x06\x13\x51\x61\x07\x22\x71\x14\x32\x81\x91\xa1\x08\x23\x42\xb1\xc1\x15\x52\xd1\xf0\x24\x33\x62\x72\x82\x09\x0a\x16\x17\x18\x19\x1a\x25\x26\x27\x28\x29\x2a\x34\x35\x36\x37\x38\x39\x3a\x43\x44\x45\x46\x47\x48\x49\x4a\x53\x54\x55\x56\x57\x58\x59\x5a\x63\x64\x65\x66\x67\x68\x69\x6a\x73\x74\x75\x76\x77\x78\x79\x7a\x83\x84\x85\x86\x87\x88\x89\x8a\x92\x93\x94\x95\x96\x97\x98\x99\x9a\xa2\xa3\xa4\xa5\xa6\xa7\xa8\xa9\xaa\xb2\xb3\xb4\xb5\xb6\xb7\xb8\xb9\xba\xc2\xc3\xc4\xc5\xc6\xc7\xc8\xc9\xca\xd2\xd3\xd4\xd5\xd6\xd7\xd8\xd9\xda\xe1\xe2\xe3\xe4\xe5\xe6\xe7\xe8\xe9\xea\xf1\xf2\xf3\xf4\xf5\xf6\xf7\xf8\xf9\xfa\xff\xda\x00\x08\x01\x01\x00\x00\x3f\x00\xfb\xfe\x8a\xff\xd9' > /tmp/px.jpg
log "jpeg de teste: $(stat -c%s /tmp/px.jpg) bytes"

log ""
log "--- upload como o app: POST /storage/v1/object/perfis/{uid}/avatar_test.jpg ---"
R=$(curl -s -w "\nHTTP %{http_code}" -X POST "$SUPA/storage/v1/object/perfis/$UID/avatar_test.jpg" \
  -H "apikey: $ANON" -H "Authorization: Bearer $TOK" -H "Content-Type: image/jpeg" -H "x-upsert: true" \
  --data-binary @/tmp/px.jpg)
log "$R"

log ""
log "--- leitura pública da URL ---"
curl -s -o /dev/null -w "GET público: HTTP %{http_code}\n" "$SUPA/storage/v1/object/public/perfis/$UID/avatar_test.jpg" | tee -a $REPORT

log ""
log "--- limpeza ---"
curl -s -X DELETE "$SUPA/storage/v1/object/perfis/$UID/avatar_test.jpg" -H "apikey: $SERVICE" -H "Authorization: Bearer $SERVICE" -o /dev/null -w "delete obj: HTTP %{http_code}\n" | tee -a $REPORT
curl -s -X DELETE "$SUPA/auth/v1/admin/users/$UID" -H "apikey: $SERVICE" -H "Authorization: Bearer $SERVICE" -o /dev/null -w "delete user: HTTP %{http_code}\n" | tee -a $REPORT
echo '```' >> $REPORT
