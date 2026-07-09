#!/usr/bin/env bash
set -uo pipefail
API="https://api.supabase.com/v1"
AUTH="Authorization: Bearer $SUPABASE_TOKEN"
SRC_BASE="https://tprpfuycngzwzdxtuvlj.supabase.co/storage/v1/object/public/Exercicios/Untitled%20folder"

{
echo "## Setup Exercícios — migração para o projeto de produção"
echo '```'

REF=$(curl -s -H "$AUTH" "$API/projects" | jq -r '.[] | select(.name=="a-body") | .id' | head -1)
if [ -z "$REF" ] || [ "$REF" = "null" ]; then
  echo "ERRO: projeto 'a-body' não encontrado na conta do SUPABASE_TOKEN"
  echo "Projetos disponíveis:"
  curl -s -H "$AUTH" "$API/projects" | jq -r '.[] | "\(.name) (\(.id)) status=\(.status)"'
  echo '```'
  exit 0
fi
STATUS=$(curl -s -H "$AUTH" "$API/projects/$REF" | jq -r '.status')
echo "projeto: $REF | status: $STATUS"

SERVICE=$(curl -s -H "$AUTH" "$API/projects/$REF/api-keys" | jq -r '.[] | select(.name=="service_role") | .api_key')
SUPA="https://$REF.supabase.co"

echo "--- criando tabela (idempotente) ---"
SQL_CREATE=$(cat << 'EOSQL'
CREATE TABLE IF NOT EXISTS public.exercicios (
  id integer PRIMARY KEY,
  numero integer NOT NULL,
  nome text NOT NULL,
  grupo_muscular text NOT NULL,
  regiao_destaque text NOT NULL,
  categoria text NOT NULL,
  equipamento text NOT NULL,
  acessorio text NOT NULL DEFAULT '—',
  imagem_arquivo text NOT NULL,
  imagem_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_exercicios_grupo ON public.exercicios (grupo_muscular);
ALTER TABLE public.exercicios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Leitura pública de exercícios" ON public.exercicios;
CREATE POLICY "Leitura pública de exercícios" ON public.exercicios FOR SELECT TO anon, authenticated USING (true);
EOSQL
)
curl -s -X POST "$API/projects/$REF/database/query" -H "$AUTH" -H "Content-Type: application/json" \
  -d "$(jq -n --arg q "$SQL_CREATE" '{query:$q}')" | head -c 200; echo ""

echo "--- criando bucket público 'exercicios' ---"
curl -s -X POST "$SUPA/storage/v1/bucket" \
  -H "Authorization: Bearer $SERVICE" -H "apikey: $SERVICE" -H "Content-Type: application/json" \
  -d '{"id":"exercicios","name":"exercicios","public":true}' | jq -r '.name // .message // .error' 

echo "--- copiando 146 imagens (origem pública -> produção) ---"
OK=0; FAIL=0
while IFS= read -r arquivo; do
  TMP="/tmp/img"
  HTTP=$(curl -s -o "$TMP" -w "%{http_code}" "$SRC_BASE/$arquivo")
  if [ "$HTTP" != "200" ]; then FAIL=$((FAIL+1)); echo "download falhou: $arquivo ($HTTP)"; continue; fi
  case "$arquivo" in *.png) CT="image/png";; *) CT="image/jpeg";; esac
  UP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$SUPA/storage/v1/object/exercicios/$arquivo" \
    -H "Authorization: Bearer $SERVICE" -H "apikey: $SERVICE" -H "Content-Type: $CT" \
    -H "x-upsert: true" --data-binary @"$TMP")
  if [ "$UP" = "200" ]; then OK=$((OK+1)); else FAIL=$((FAIL+1)); echo "upload falhou: $arquivo ($UP)"; fi
done < <(jq -r '.[].arquivo | split("/")[-1]' scripts/exercicios.json)
echo "uploads ok: $OK | falhas: $FAIL"

echo "--- inserindo registros ---"
python3 - << 'EOPY' > /tmp/insert.sql
import json
items = json.load(open('scripts/exercicios.json'))
def esc(s): return s.replace("'","''")
vals = []
for it in items:
    arq = it['arquivo'].split('/')[-1]
    vals.append(f"({it['id']},{it['numero']},'{esc(it['nome'])}','{esc(it['grupoMuscular'])}','{it['regiaoDestaque']}','{it['categoria']}','{esc(it['equipamento'])}','{esc(it['acessorio'])}','{arq}')")
print("INSERT INTO public.exercicios (id,numero,nome,grupo_muscular,regiao_destaque,categoria,equipamento,acessorio,imagem_arquivo) VALUES\n"
      + ",\n".join(vals)
      + "\nON CONFLICT (id) DO UPDATE SET nome=EXCLUDED.nome, grupo_muscular=EXCLUDED.grupo_muscular, regiao_destaque=EXCLUDED.regiao_destaque, categoria=EXCLUDED.categoria, equipamento=EXCLUDED.equipamento, acessorio=EXCLUDED.acessorio, imagem_arquivo=EXCLUDED.imagem_arquivo;")
EOPY
curl -s -X POST "$API/projects/$REF/database/query" -H "$AUTH" -H "Content-Type: application/json" \
  -d "$(jq -n --rawfile q /tmp/insert.sql '{query:$q}')" | head -c 200; echo ""

echo "--- preenchendo imagem_url ---"
curl -s -X POST "$API/projects/$REF/database/query" -H "$AUTH" -H "Content-Type: application/json" \
  -d "$(jq -n --arg q "UPDATE public.exercicios SET imagem_url = 'https://$REF.supabase.co/storage/v1/object/public/exercicios/' || imagem_arquivo;" '{query:$q}')" | head -c 200; echo ""

echo "--- validação ---"
curl -s -X POST "$API/projects/$REF/database/query" -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"query":"SELECT count(*) AS total, count(imagem_url) AS com_url FROM public.exercicios;"}'
echo ""
echo '```'
} | tee /tmp/report.md
true
