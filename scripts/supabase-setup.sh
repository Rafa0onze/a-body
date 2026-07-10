#!/usr/bin/env bash
set -uo pipefail
API="https://api.supabase.com/v1"
AUTH="Authorization: Bearer $SUPABASE_TOKEN"
{
echo "## Correção — remada-fechada-maquina"
echo '```'
REF=$(curl -s -H "$AUTH" "$API/projects" | jq -r '.[] | select(.name=="a-body") | .id' | head -1)
SERVICE=$(curl -s -H "$AUTH" "$API/projects/$REF/api-keys" | jq -r '.[] | select(.name=="service_role") | .api_key')
SUPA="https://$REF.supabase.co"
pip install pillow --quiet 2>/dev/null || pip install pillow --break-system-packages --quiet
curl -s -o /tmp/orig "$SUPA/storage/v1/object/public/exercicios/remada-fechada-maquina.jpg"
python3 - << 'EOPY'
from PIL import Image, ImageFile
ImageFile.LOAD_TRUNCATED_IMAGES = True
img = Image.open('/tmp/orig'); img.load()
img = img.convert('RGB')
if img.width > 700:
    img = img.resize((700, int(img.height*700/img.width)), Image.LANCZOS)
img.save('/tmp/conv.webp','WEBP',quality=80,method=6)
print('convertido:', img.size)
EOPY
if [ $? -eq 0 ]; then
  UP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$SUPA/storage/v1/object/exercicios/remada-fechada-maquina.webp" \
    -H "Authorization: Bearer $SERVICE" -H "apikey: $SERVICE" -H "Content-Type: image/webp" \
    -H "x-upsert: true" --data-binary @/tmp/conv.webp)
  echo "upload: $UP"
else
  echo "conversão falhou de novo — repontando URL para o .jpg original"
  curl -s -X POST "$API/projects/$REF/database/query" -H "$AUTH" -H "Content-Type: application/json" \
    -d '{"query":"UPDATE public.exercicios SET imagem_url = replace(imagem_url, chr(46)||chr(119)||chr(101)||chr(98)||chr(112), chr(46)||chr(106)||chr(112)||chr(103)) WHERE imagem_arquivo = chr(114)||chr(101)||chr(109)||chr(97)||chr(100)||chr(97)||chr(45)||chr(102)||chr(101)||chr(99)||chr(104)||chr(97)||chr(100)||chr(97)||chr(45)||chr(109)||chr(97)||chr(113)||chr(117)||chr(105)||chr(110)||chr(97)||chr(46)||chr(106)||chr(112)||chr(103);"}'
fi
echo '```'
} | tee /tmp/report.md
true
