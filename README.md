# A-BODY — Personal AI Trainer 💪

App de treino com IA: anamnese completa, análise corporal por foto, plano personalizado gerado pelo Claude, cronômetros de série/descanso/isométrico, e relatório de evolução.

## ⚠️ Pré-requisito: API Key da Anthropic

Fora do claude.ai, o app precisa da **sua** API key:
1. Acesse https://console.anthropic.com → API Keys → Create Key
2. No app, toque no ⚙️ na tela inicial e cole a chave
3. A chave fica salva **apenas no seu dispositivo** (localStorage)

## Opção 1 — Instalar como PWA (mais rápido, sem Android Studio)

```bash
npm install
npm run build
```
Hospede a pasta `dist/` (Vercel: `npx vercel dist --prod`). Abra a URL no Chrome do Android → menu ⋮ → **"Adicionar à tela inicial"**. O app instala com ícone e abre em tela cheia.

## Opção 2 — APK nativo via Capacitor (requer Android Studio)

```bash
npm install
npm run android:add        # cria a pasta android/ (só na primeira vez)
npm run android:sync       # build web + sincroniza com o projeto Android
npm run android:open       # abre no Android Studio
```

No Android Studio: **Build → Build Bundle(s)/APK(s) → Build APK(s)**.
O APK fica em `android/app/build/outputs/apk/debug/app-debug.apk` — transfira para o celular e instale (habilite "fontes desconhecidas").

Com o celular conectado via USB (depuração ativada), pode usar direto:
```bash
npm run android:run
```

## Estrutura

```
├── src/App.jsx          # App completo (anamnese, IA, treino, timers, relatórios)
├── src/main.jsx         # Entry point React
├── index.html
├── public/manifest.json # PWA manifest
├── public/icon-*.png    # Ícones
├── capacitor.config.json
└── vite.config.js
```

## Dados

Tudo é salvo localmente via `localStorage`:
- `abody:plan` — plano de treino ativo
- `abody:history` — histórico de sessões (pesos, tempos, comparativos)
- `abody:apikey` — sua API key

Para backup/sync em nuvem futuramente, os pontos de integração estão nas funções `loadStorage`/`saveStorage` (src/App.jsx) — basta trocar por chamadas ao Supabase.

## Custos de API

Cada geração de plano usa ~3k tokens (≈ US$ 0,05 com Sonnet). Análise corporal com 3 fotos: ~5k tokens (≈ US$ 0,08). Uso pessoal fica em centavos por mês.
