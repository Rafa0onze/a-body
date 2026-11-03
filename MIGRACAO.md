# Migração A-Body → Cloudflare (modo solo)

Pages (site + Functions) · D1 (dados) · R2 (fotos) · Access (login com Google) · OpenAI via proxy.

## 1. Criar no painel da Cloudflare
1. **Storage & databases → D1:** criar o banco `abody`. **R2:** criar o bucket `abody-files`.
2. **Workers & Pages → Create → Pages → Connect to Git:** repositório `a-body`, branch `cloudflare-solo`.
   Build command `npm run build`, output `dist`.
3. **Pages → Settings → Bindings:** D1 `DB` → `abody` · R2 `FILES` → `abody-files`.
4. **Pages → Settings → Compatibility flags:** `nodejs_compat` (data de compatibilidade ≥ 2025-04-01).
5. **Zero Trust → Access → Applications → Self-hosted:** domínio do projeto `*.pages.dev` (produção e previews),
   política *Allow* só para o seu e-mail. Anote o **Application Audience (AUD) tag** e o **team domain** (`xxxx.cloudflareaccess.com`).

## 2. Variáveis do Pages (Production)
| Nome | Valor |
|---|---|
| `VITE_SOLO_MODE` | `1` |
| `VITE_SOLO_USER_ID` | `a40adc21-11df-41d8-ba22-8176847035a2` |
| `VITE_SUPABASE_URL` | `/sb` |
| `VITE_SUPABASE_ANON_KEY` | `solo` |
| `OWNER_ID` | `a40adc21-11df-41d8-ba22-8176847035a2` |
| `OWNER_EMAIL` | seu e-mail do Google (o mesmo da política do Access) |
| `ACCESS_TEAM_DOMAIN` | `xxxx.cloudflareaccess.com` |
| `ACCESS_AUD` | AUD tag do aplicativo no Access |
| `OPENAI_API_KEY` | chave **nova** (tipo Secret) |
| `OPENAI_MODEL` | o modelo que você usa hoje |
| `ALLOW_IMPORT` | `1` (**apenas durante a importação**) |
| `AI_DAILY_QUOTA` | opcional (padrão: cota do plano PRO do código) |

## 3. Importar os dados (uma vez)
Abra `https://SEU-PROJETO.pages.dev/admin/importar.html`, envie `abody-import.json` e depois o `.zip` do Storage.
Em seguida **apague `ALLOW_IMPORT`** e faça um novo deploy.

## 4. Backup
`GET /sb/admin/export` (logado) devolve seus dados em JSON e a lista de arquivos do R2.
D1 Time Travel guarda 7 dias no plano gratuito.
