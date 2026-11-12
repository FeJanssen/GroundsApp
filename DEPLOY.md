# Deployment auf AWS

**Architektur:**
- **Frontend:** Expo Web → statischer Export → **AWS Amplify Hosting** (Build aus Git)
- **Backend:** FastAPI → **AWS Lambda** (Mangum) + API Gateway (HTTP API) via **AWS SAM**
- **Datenbank:** Supabase (bleibt wie gehabt)

---

## 1. Backend deployen (Lambda)

Voraussetzung: [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) + [SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html) installiert und `aws configure` ausgeführt.

```bash
cd backend

# Build (Container-Build, damit native Pakete wie bcrypt für Linux/arm64 kompiliert werden)
sam build --use-container

# Erstes Deployment (interaktiv, Werte aus backend/.env übernehmen)
sam deploy --guided \
  --stack-name jkb-grounds-api \
  --parameter-overrides \
    SupabaseUrl=https://jobalnmworofphavtxuv.supabase.co \
    SupabaseKey=<SUPABASE_KEY aus backend/.env> \
    StripeSecretKey=<STRIPE_SECRET_KEY aus backend/.env> \
    AppUrl=http://localhost:8082
```

Am Ende gibt SAM die **ApiUrl** aus, z.B.
`https://abc123.execute-api.eu-central-1.amazonaws.com` – das ist die Backend-URL.

> **Hinweis:** `AppUrl` zeigt zunächst auf localhost. Nach Schritt 2 (Amplify-Domain bekannt)
> einmal neu deployen mit `AppUrl=https://main.dXXXX.amplifyapp.com`, damit die
> Stripe-Redirects (Checkout success/cancel) auf die Live-App zeigen.

Updates später einfach mit:
```bash
sam build --use-container && sam deploy
```

## 2. Frontend deployen (Amplify Hosting via Git)

1. **Repo zu GitHub pushen** (falls noch nicht geschehen):
   ```bash
   cd /Users/FJMarketing/Desktop/Grounds
   git init && git add -A && git commit -m "JKB Grounds"
   gh repo create jkb-grounds --private --source=. --push
   # oder manuell auf github.com anlegen und:
   # git remote add origin git@github.com:<user>/jkb-grounds.git && git push -u origin main
   ```

2. **AWS Console → Amplify → „Create new app" → GitHub** → Repo `jkb-grounds`, Branch `main` wählen.

3. Amplify erkennt das **Monorepo**: Als App-Root `app` angeben.
   Die Build-Konfiguration kommt automatisch aus `amplify.yml` im Repo-Root.

4. **Umgebungsvariable** setzen (App settings → Environment variables):
   | Key | Value |
   |---|---|
   | `EXPO_PUBLIC_API_URL` | ApiUrl aus Schritt 1 (ohne Slash am Ende) |

5. **Rewrite-Regel für SPA-Routing** (App settings → Rewrites and redirects):
   | Source | Target | Type |
   |---|---|---|
   | `</^[^.]+$\|\.(?!(css\|gif\|ico\|jpg\|js\|png\|txt\|svg\|woff\|woff2\|ttf\|map\|json\|webp)$)([^.]+$)/>` | `/index.html` | `200 (Rewrite)` |

   (Nötig, damit dynamische Routen wie `/venue/xyz` oder `/user/xyz` beim direkten Aufruf funktionieren.)

6. **Deploy** – Amplify baut bei jedem `git push` automatisch neu.

## 3. Nacharbeiten

- **Stripe-Redirects:** Backend neu deployen mit der echten Amplify-URL:
  ```bash
  cd backend && sam deploy --parameter-overrides AppUrl=https://main.dXXXX.amplifyapp.com \
    SupabaseUrl=... SupabaseKey=... StripeSecretKey=...
  ```
- **Stripe Live-Keys:** Für Produktion `STRIPE_SECRET_KEY` auf den Live-Key wechseln
  und die Connect-Onboarding-Flows mit echten Daten testen.
- **CORS einschränken (optional):** In `backend/main.py` `allow_origins` auf die
  Amplify-Domain begrenzen.
- **Eigene Domain (optional):** Amplify → Domain management → Custom Domain verbinden.

## Lokale Entwicklung (unverändert)

```bash
# Backend
cd backend && ../.venv/bin/python -m uvicorn main:app --port 8000

# Frontend
cd app && npx expo start --web --port 8082
```
