# JKB Grounds – Marktplatz App 🎾

Buchungs-Marktplatz für Tennis-, Padel- & Fußballplätze, Friseurtermine u. v. m. – im modernen Playtomic-Stil.

## Stack
| Teil | Technologie |
|---|---|
| Frontend (Web + iOS + Android) | React Native + **Expo** (Expo Router, TypeScript) |
| Backend | **Python FastAPI** |
| Datenbank | Aktuell Mock-Daten → später **Supabase** (Vorbereitung in `backend/db.py`) |
| Auth | Login/Registrierung-UI mit „Mit Apple" / „Mit Google" (später Supabase Auth OAuth) |

## Struktur
```
app/        Expo-App
  app/           Screens (Expo Router)
    login.tsx        Login & Registrierung (Apple/Google/E-Mail)
    (tabs)/          Entdecken, Buchungen, Profil
    venue/[id].tsx   Detailseite mit Datums- & Slot-Auswahl
  src/
    data/mock.ts     Testdaten
    state/           App-State (User, Buchungen)
    api/client.ts    API-Client fürs Backend
    theme.ts         Design-Tokens
backend/    FastAPI
  main.py          REST-API (Venues, Slots, Buchungen)
  data.py          Testdaten
  db.py            Supabase-Client (vorbereitet)
```

## Starten

### Frontend
```sh
cd app
npm install
npx expo start        # w = Web, i = iOS Simulator, a = Android
```

### Backend
```sh
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload    # http://localhost:8000/docs
```

## Nächste Schritte
- [ ] Supabase-Projekt anlegen, Tabellen `venues`, `slots`, `bookings`, `profiles`
- [ ] Supabase Auth mit Apple & Google OAuth (echtes Sign-in statt Demo)
- [ ] Screens von Mock-Daten auf `src/api/client.ts` umstellen
- [ ] Zahlungen (z. B. Stripe)
- [ ] EAS Build für App Store / Play Store
