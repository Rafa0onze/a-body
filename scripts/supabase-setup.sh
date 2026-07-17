#!/usr/bin/env bash
set -uo pipefail
API="https://api.supabase.com/v1"
AUTH="Authorization: Bearer $SUPABASE_TOKEN"
{
echo "## Diagnóstico Google OAuth"
echo '```'
REF=$(curl -s -H "$AUTH" "$API/projects" | jq -r '.[] | select(.name=="a-body") | .id' | head -1)
CFG=$(curl -s -H "$AUTH" "$API/projects/$REF/config/auth")
GID=$(echo "$CFG" | jq -r '.external_google_client_id // "VAZIO"')
echo "google_enabled: $(echo "$CFG" | jq -r '.external_google_enabled')"
echo "client_id (mascarado): ${GID:0:12}...${GID: -28}"
echo "tamanho do client_id: ${#GID}"
echo "site_url: $(echo "$CFG" | jq -r '.site_url')"
echo "uri_allow_list: $(echo "$CFG" | jq -r '.uri_allow_list')"
echo "--- redirect real do authorize ---"
LOC=$(curl -s -o /dev/null -w "%{redirect_url}" "https://$REF.supabase.co/auth/v1/authorize?provider=google&redirect_to=https://a-body.vercel.app")
echo "$LOC" | python3 -c "
import sys, urllib.parse as u
url = sys.stdin.read().strip()
if not url: print('SEM REDIRECT'); exit()
p = u.urlparse(url); q = u.parse_qs(p.query)
print('host:', p.netloc)
cid = q.get('client_id',['AUSENTE'])[0]
print('client_id no redirect:', (cid[:12]+'...'+cid[-28:]) if len(cid)>40 else cid)
print('redirect_uri:', q.get('redirect_uri',['AUSENTE'])[0])
print('scope:', q.get('scope',['AUSENTE'])[0][:60])"
echo '```'
} | tee /tmp/report.md
true
