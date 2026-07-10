#!/usr/bin/env bash
set -uo pipefail
API="https://api.supabase.com/v1"
AUTH="Authorization: Bearer $SUPABASE_TOKEN"
{
echo "## Padronização visual — reprocessamento das 146 ilustrações"
echo '```'
REF=$(curl -s -H "$AUTH" "$API/projects" | jq -r '.[] | select(.name=="a-body") | .id' | head -1)
SERVICE=$(curl -s -H "$AUTH" "$API/projects/$REF/api-keys" | jq -r '.[] | select(.name=="service_role") | .api_key')
SUPA="https://$REF.supabase.co"
pip install pillow --quiet 2>/dev/null || pip install pillow --break-system-packages --quiet

LISTA=$(curl -s -X POST "$SUPA/storage/v1/object/list/exercicios" \
  -H "Authorization: Bearer $SERVICE" -H "apikey: $SERVICE" -H "Content-Type: application/json" \
  -d '{"prefix":"","limit":400}' | jq -r '.[].name | select(test("\\.(png|jpg|jpeg)$"))')
OK=0; FAIL=0
for arquivo in $LISTA; do
  curl -s -o /tmp/orig "$SUPA/storage/v1/object/public/exercicios/$arquivo"
  python3 - << 'EOPY'
from PIL import Image, ImageDraw, ImageChops, ImageFile
ImageFile.LOAD_TRUNCATED_IMAGES = True
import statistics

img = Image.open('/tmp/orig'); img.load()

# 1) Alfa composto sobre BRANCO (corrige o bug do fundo preto)
if img.mode in ('RGBA','LA') or (img.mode=='P' and 'transparency' in img.info):
    img = img.convert('RGBA')
    base = Image.new('RGBA', img.size, (255,255,255,255))
    img = Image.alpha_composite(base, img).convert('RGB')
else:
    img = img.convert('RGB')

# 2) Cor de fundo pela mediana da borda
W,H = img.size
px = img.load()
borda = []
for x in range(0,W,max(1,W//80)): borda += [px[x,0], px[x,H-1]]
for y in range(0,H,max(1,H//80)): borda += [px[0,y], px[W-1,y]]
med = tuple(int(statistics.median(c[i] for c in borda)) for i in range(3))

# 3) Fundo não-branco -> flood-fill a partir das bordas
if not all(v > 235 for v in med):
    seeds = [(0,0),(W-1,0),(0,H-1),(W-1,H-1),(W//2,0),(W//2,H-1),(0,H//2),(W-1,H//2)]
    for s in seeds:
        try:
            if sum(abs(px[s][i]-med[i]) for i in range(3)) < 120:
                ImageDraw.floodfill(img, s, (255,255,255), thresh=60)
        except Exception: pass
    px = img.load()

# 4) Recorte do conteúdo (diferença vs branco) + margem
diff = ImageChops.difference(img, Image.new('RGB', img.size, (255,255,255))).convert('L').point(lambda p: 255 if p>18 else 0)
bbox = diff.getbbox()
if bbox:
    mx = int((bbox[2]-bbox[0])*0.04)+2; my = int((bbox[3]-bbox[1])*0.04)+2
    img = img.crop((max(0,bbox[0]-mx), max(0,bbox[1]-my), min(W,bbox[2]+mx), min(H,bbox[3]+my)))

# 5) Canvas padrão 4:3 (960x720) com conteúdo centralizado
CW,CH = 960,720
esc = min((CW*0.92)/img.width, (CH*0.92)/img.height)
img = img.resize((max(1,int(img.width*esc)), max(1,int(img.height*esc))), Image.LANCZOS)
canvas = Image.new('RGB',(CW,CH),(255,255,255))
canvas.paste(img, ((CW-img.width)//2,(CH-img.height)//2))
canvas.save('/tmp/conv.webp','WEBP',quality=82,method=6)
EOPY
  if [ $? -ne 0 ]; then FAIL=$((FAIL+1)); echo "falhou: $arquivo"; continue; fi
  NOVO="${arquivo%.*}.webp"
  UP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$SUPA/storage/v1/object/exercicios/$NOVO" \
    -H "Authorization: Bearer $SERVICE" -H "apikey: $SERVICE" -H "Content-Type: image/webp" \
    -H "x-upsert: true" --data-binary @/tmp/conv.webp)
  if [ "$UP" = "200" ]; then OK=$((OK+1)); else FAIL=$((FAIL+1)); echo "upload falhou: $NOVO ($UP)"; fi
done
echo "padronizadas: $OK | falhas: $FAIL"

echo "--- garantindo imagem_url em .webp para todas ---"
curl -s -X POST "$API/projects/$REF/database/query" -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"query":"UPDATE public.exercicios SET imagem_url = replace(imagem_url, chr(46)||chr(106)||chr(112)||chr(103), chr(46)||chr(119)||chr(101)||chr(98)||chr(112)) WHERE imagem_url LIKE chr(37)||chr(46)||chr(106)||chr(112)||chr(103); SELECT count(*) FILTER (WHERE imagem_url LIKE chr(37)||chr(46)||chr(119)||chr(101)||chr(98)||chr(112)) AS webp, count(*) AS total FROM public.exercicios;"}'
echo ""
echo '```'
} | tee /tmp/report.md
true
