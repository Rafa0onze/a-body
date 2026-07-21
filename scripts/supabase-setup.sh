#!/usr/bin/env bash
# Setup automatizado do Supabase para o A-BODY
# Roda no GitHub Actions (que alcança api.supabase.com)
set -uo pipefail

API="https://api.supabase.com/v1"
AUTH="Authorization: Bearer $SUPABASE_TOKEN"
REPORT=/tmp/report.md

log() { echo "$1" | tee -a $REPORT; }

echo "## Setup Supabase — A-BODY" > $REPORT
echo '```' >> $REPORT

# ── 1. Organização ────────────────────────────────────────────────
ORG_ID=$(curl -s -H "$AUTH" "$API/organizations" | jq -r '.[0].id // empty')
if [ -z "$ORG_ID" ]; then log "ERRO: nenhuma organização encontrada (token inválido?)"; echo '```' >> $REPORT; exit 0; fi
log "org: $ORG_ID"

# ── 2. Projeto (reusa se já existir) ──────────────────────────────
REF=$(curl -s -H "$AUTH" "$API/projects" | jq -r '.[] | select(.name=="a-body") | .id' | head -1)
if [ -z "$REF" ]; then
  DB_PASS=$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)
  CREATE=$(curl -s -X POST -H "$AUTH" -H "Content-Type: application/json" "$API/projects" \
    -d "{\"name\":\"a-body\",\"organization_id\":\"$ORG_ID\",\"db_pass\":\"$DB_PASS\",\"region\":\"sa-east-1\"}")
  REF=$(echo "$CREATE" | jq -r '.id // empty')
  if [ -z "$REF" ]; then log "ERRO ao criar projeto: $(echo $CREATE | head -c 300)"; echo '```' >> $REPORT; exit 0; fi
  log "projeto criado: $REF (region sa-east-1)"
  log "obs: senha do banco gerada aleatoriamente — resetável no dashboard se precisar"
else
  log "projeto existente reutilizado: $REF"
fi

# ── 3. Aguardar ficar saudável ────────────────────────────────────
for i in $(seq 1 40); do
  STATUS=$(curl -s -H "$AUTH" "$API/projects/$REF" | jq -r '.status')
  [ "$STATUS" = "ACTIVE_HEALTHY" ] && break
  sleep 10
done
log "status: $STATUS"
if [ "$STATUS" != "ACTIVE_HEALTHY" ]; then log "ERRO: projeto não ficou saudável a tempo"; echo '```' >> $REPORT; exit 0; fi

# ── 4. Rodar SQL (tabela + RLS) ───────────────────────────────────
SQL=$(jq -Rs . < supabase-setup.sql)
SQLRES=$(curl -s -X POST -H "$AUTH" -H "Content-Type: application/json" \
  "$API/projects/$REF/database/query" -d "{\"query\":$SQL}")
log "sql: $(echo "$SQLRES" | head -c 200)"

# ── 5. Site URL do Auth ───────────────────────────────────────────
AUTHRES=$(curl -s -X PATCH -H "$AUTH" -H "Content-Type: application/json" \
  "$API/projects/$REF/config/auth" \
  -d '{"site_url":"https://a-body.vercel.app","uri_allow_list":"https://a-body.vercel.app"}')
log "auth site_url: $(echo "$AUTHRES" | jq -r '.site_url // "erro"')"

# ── 6. Anon key ───────────────────────────────────────────────────
ANON=$(curl -s -H "$AUTH" "$API/projects/$REF/api-keys" | jq -r '.[] | select(.name=="anon") | .api_key')
SUPA_URL="https://$REF.supabase.co"
log "url: $SUPA_URL"
log "anon key: ${ANON:0:20}... (pública por design)"

# ── 7. Env vars na Vercel ─────────────────────────────────────────
TEAM_ID=$(curl -s -H "Authorization: Bearer $VERCEL_TOKEN" "https://api.vercel.com/v2/teams" | jq -r '.teams[0].id')
for PAIR in "VITE_SUPABASE_URL|$SUPA_URL" "VITE_SUPABASE_ANON_KEY|$ANON"; do
  K="${PAIR%%|*}"; V="${PAIR#*|}"
  ENVRES=$(curl -s -X POST "https://api.vercel.com/v10/projects/a-body/env?teamId=$TEAM_ID&upsert=true" \
    -H "Authorization: Bearer $VERCEL_TOKEN" -H "Content-Type: application/json" \
    -d "{\"key\":\"$K\",\"value\":\"$V\",\"type\":\"encrypted\",\"target\":[\"production\",\"preview\"]}")
  log "vercel env $K: $(echo "$ENVRES" | jq -r 'if .error then .error.message else "ok" end')"
done

# ── 8. Health check do Auth ───────────────────────────────────────
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" -H "apikey: $ANON" "$SUPA_URL/auth/v1/health")
log "auth health: HTTP $HEALTH"

echo '```' >> $REPORT
echo "SETUP_OK=1" >> "$GITHUB_ENV" 2>/dev/null || true
