# MyPhysics

Online πλατφόρμα Φυσικής: θεωρία, ασκήσεις, quiz, βαθμολογίες, προσομοιώσεις.
Οι χρήστες δημιουργούνται χειροκίνητα από το Appwrite Console· η εφαρμογή κάνει μόνο authentication.

## Stack

- **Next.js 16** (App Router, Server Actions, Turbopack)
- **Tailwind CSS v4** + **shadcn/ui** (Radix / Nova preset)
- **Appwrite Cloud** — Auth (email/password) + TablesDB
- Deploy: **Vercel**

## Ρύθμιση

1. `npm install`
2. Αντίγραψε το `.env.example` σε `.env.local` και συμπλήρωσε τις τιμές από το
   Appwrite Console (Overview → Project ID, Integrations → API Keys).
3. `npm run dev` → http://localhost:3000

### Appwrite — τι χρειάζεται στο Console

- **Web Platform**: Overview → Integrations → Add platform → Web App
  - hostname `localhost` (dev) και `*.vercel.app` (prod)
- **API Key** (server-only): scopes `sessions.write`, `users.read`,
  `databases.read`, `tables.read`, `rows.read`, `rows.write`
- **Auth → Security**: Users limit = ο ακριβής αριθμός μαθητών (φράζει το self-signup)
- **Auth → Users**: δημιουργία μαθητών + label `levelA` / `levelB` / `levelC` για την τάξη
- **Database `main`** με tables `chapters`, `sections` — **permissions κενά**
  (όλα τα reads περνούν από τον Next.js server με το API key)

## Δομή

| Path | Ρόλος |
| --- | --- |
| `src/lib/appwrite/config.ts` | env vars (σκάει αν λείπει κάτι) |
| `src/lib/appwrite/server.ts` | `createAdminClient()` (API key), `createSessionClient()` (cookie) |
| `src/lib/auth.ts` | `getUser()` — τρέχων χρήστης + τάξη από τα labels |
| `src/lib/data.ts` | queries στη βάση, φιλτραρισμένα ανά τάξη |
| `src/app/actions.ts` | server actions `login` / `logout` |
| `src/proxy.ts` | edge redirect βάσει session cookie |
| `src/app/(app)/` | προστατευμένες σελίδες (layout ελέγχει auth) |
| `src/app/login/` | σελίδα σύνδεσης |

## Deploy στο Vercel

1. Push σε GitHub, import το repo στο Vercel (auto-detect Next.js).
2. **Settings → Environment Variables**: πρόσθεσε όλες τις μεταβλητές του `.env.local`
   (και τις `NEXT_PUBLIC_*` και τις server-only) πριν το πρώτο build.
3. Μετά το πρώτο deploy, πρόσθεσε το domain του Vercel ως Web Platform στο Appwrite.
