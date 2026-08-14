#!/usr/bin/env bash
set -euo pipefail
API="https://api.supabase.com/v1"
REF="zvmriqxigpwuggyhpoun"
AUTH="Authorization: Bearer $SUPABASE_TOKEN"
SQL=$(jq -Rs . < supabase-security-hardening.sql)
curl --fail --silent --show-error -X POST "$API/projects/$REF/database/query" \
  -H "$AUTH" -H 'Content-Type: application/json' -d "{\"query\":$SQL}" | jq .

VERIFY="select jsonb_build_object(
 'tables_without_rls',(select coalesce(jsonb_agg(c.relname),'[]'::jsonb) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity),
 'delete_rpc',to_regprocedure('public.delete_my_account()') is not null,
 'legacy_message_policies',(select count(*) from pg_policies where schemaname='public' and tablename='mensagens' and policyname in ('msg_ins','msg_sel','msg_upd')),
 'private_health_buckets',(select bool_and(not public) from storage.buckets where id in ('fotos-corporais','documentos-saude','documentos'))
) as security_status;"
PAYLOAD=$(jq -n --arg query "$VERIFY" '{query:$query}')
curl --fail --silent --show-error -X POST "$API/projects/$REF/database/query" \
  -H "$AUTH" -H 'Content-Type: application/json' -d "$PAYLOAD" | jq .
