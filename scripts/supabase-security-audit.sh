#!/usr/bin/env bash
set -euo pipefail

API="https://api.supabase.com/v1"
AUTH="Authorization: Bearer $SUPABASE_TOKEN"
# Falhar cedo quando o segredo estiver ausente ou expirado.
test -n "${SUPABASE_TOKEN:-}"
REF=$(curl --fail --silent --show-error -H "$AUTH" "$API/projects" | jq -r '.[] | select(.name=="a-body") | .id' | head -1)
test -n "$REF"

read -r -d '' QUERY <<'SQL' || true
select jsonb_build_object(
  'tables', (select jsonb_agg(jsonb_build_object(
    'table', c.table_name,
    'rls', cls.relrowsecurity,
    'columns', (select jsonb_agg(jsonb_build_object('name', c2.column_name, 'type', c2.data_type) order by c2.ordinal_position)
      from information_schema.columns c2 where c2.table_schema='public' and c2.table_name=c.table_name)
  ) order by c.table_name) from information_schema.tables c
    join pg_class cls on cls.relname=c.table_name
    join pg_namespace ns on ns.oid=cls.relnamespace and ns.nspname='public'
    where c.table_schema='public' and c.table_type='BASE TABLE'),
  'policies', (select coalesce(jsonb_agg(jsonb_build_object('table',tablename,'name',policyname,'command',cmd,'roles',roles,'using',qual,'check',with_check) order by tablename,policyname),'[]'::jsonb)
    from pg_policies where schemaname in ('public','storage')),
  'buckets', (select coalesce(jsonb_agg(jsonb_build_object('id',id,'public',public,'limit',file_size_limit,'mimes',allowed_mime_types) order by id),'[]'::jsonb) from storage.buckets),
  'foreign_keys', (select coalesce(jsonb_agg(jsonb_build_object('table',tc.table_name,'column',kcu.column_name,'target_table',ccu.table_name,'target_column',ccu.column_name,'delete_rule',rc.delete_rule)),'[]'::jsonb)
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu on tc.constraint_name=kcu.constraint_name and tc.constraint_schema=kcu.constraint_schema
    join information_schema.constraint_column_usage ccu on ccu.constraint_name=tc.constraint_name and ccu.constraint_schema=tc.constraint_schema
    join information_schema.referential_constraints rc on rc.constraint_name=tc.constraint_name and rc.constraint_schema=tc.constraint_schema
    where tc.constraint_type='FOREIGN KEY' and tc.table_schema='public')
) as audit;
SQL

PAYLOAD=$(jq -n --arg query "$QUERY" '{query:$query}')
curl --fail --silent --show-error -X POST "$API/projects/$REF/database/query" \
  -H "$AUTH" -H 'Content-Type: application/json' -d "$PAYLOAD" | jq .
