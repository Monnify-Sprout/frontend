# Sprout — Frontend

Next.js (App Router) + TypeScript web app for **Sprout** (APIConf Lagos × Monnify
Developer Challenge). Sprout holds a single Monnify master contract and onboards each
merchant — verified personally by **BVN or NIN** — as a **sub-account** under that
contract. This app is the merchant dashboard: onboarding/verification, invoices,
reusable payment links, categories, revenue streams, a public buyer-facing pay page,
and a unified analytics view.

> **This is one of two repositories.** The API lives in a separate repo:
> **[Monnify-Sprout/backend](https://github.com/Monnify-Sprout/backend)**. This app
> proxies `/api/*` to that backend, so **both must be running** — the API on `:4000`
> and this app on `:3000`. This README is self-contained: follow it to get the whole
> stack running locally.

---

## Stack

Next.js (App Router), Tailwind CSS, shadcn/ui (`base-nova` on `@base-ui/react`),
Zustand, TanStack React Query, Axios (JWT interceptor in `src/lib/api.ts`), React Hook
Form + Zod resolvers.

| Repo | What it is | Stack | Port |
| --- | --- | --- | --- |
| **frontend** (this repo) | Web app | Next.js + TypeScript | `3000` |
| [backend](https://github.com/Monnify-Sprout/backend) | REST API | Express + TypeScript, Postgres via `pg` | `4000` |

---

## 1. Prerequisites

- **Node.js ≥ 20** and npm — check with `node -v`.
- **Git**.
- The **backend running on `:4000`** — this app calls it for every request. Set it up
  first (step 2); a **Supabase** database and (optionally) Monnify sandbox credentials
  are needed there, not here.

This repo holds **no secrets** — its only variable is the backend's public URL.

---

## 2. Start the backend first (the other repo)

The app is just a shell without the API. Clone and run
**[Monnify-Sprout/backend](https://github.com/Monnify-Sprout/backend)** — the short
version:

```bash
# in a separate folder
git clone git@github.com:Monnify-Sprout/backend.git
cd backend
npm install
cp .env.example .env         # set SUPABASE_DB_URL; keep MONNIFY_VERIFICATION_MODE=mock
npm run migrate              # create the schema in your Supabase DB
npm run seed                 # (recommended) demo merchant demo@sprout.test + sample data
npm run dev                  # http://localhost:4000
```

Full backend setup — Supabase connection string, env variables, generating secrets —
lives in that repo's README. Confirm it's up:

```bash
curl http://localhost:4000/health   # → {"status":"ok",...}
```

Leave the backend running and continue below.

---

## 3. Clone and install this app

```bash
git clone git@github.com:Monnify-Sprout/frontend.git
cd frontend
npm install
cp .env.example .env.local
```

`.env.local` needs only:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

(already the default). API calls to `/api/*` are proxied to the backend by
`next.config.ts`, so the browser talks same-origin — no CORS needed. To point at a
non-local backend, override the proxy target with `API_PROXY_TARGET`.

---

## 4. Run the app

```bash
npm run dev        # http://localhost:3000
```

> **Port 3000 already in use?** Run it elsewhere:
> ```bash
> npm run dev -- -p 3001     # then open http://localhost:3001
> ```

Open **http://localhost:3000**. Register a new merchant, or — if you seeded the
backend — sign in as **`demo@sprout.test`** to see invoices, analytics, payment links,
and streams populated.

---

## 5. Verify the full flow

With both servers running:

1. Register or sign in.
2. Complete verification on `/verify` (BVN/NIN + settlement account). In the backend's
   `mock` mode this succeeds instantly — a BVN/NIN ending in `0000` deliberately fails,
   for testing the error path — and the merchant becomes **Active**.
3. Create an invoice, open the public pay page, and view analytics.

An easy end-to-end confidence check is running `npm run smoke` in the backend repo.

---

## App structure

- **Three chromes:** `(auth)` centered card, `(app)` dashboard shell (sidebar + topbar
  + `AuthGuard`), and public `/pay/[reference]` + `/link/[slug]` layouts for buyers.
- **Session:** Zustand store (`src/store/auth.ts`) persisted to `localStorage`
  (`sprout-auth`); a `hydrated` flag gates the guard so refreshes don't bounce to
  `/login`. A 401 clears the session and redirects.
- **Schemas:** every backend request/response shape is mirrored in `src/lib/schemas/`
  and used for both form validation (zodResolver) and React Query response parsing.
- **API routing:** same-origin `/api/*` is proxied to the backend by `next.config.ts`
  rewrites (the backend has no CORS — keep it that way).
- **Design system:** Poppins typeface, shadcn neutral base + a Sprout green `--brand`
  accent, lucide-react icons; all tokens in `src/app/globals.css`.

Core mechanic to keep in mind: a merchant isn't **Active** until BVN/NIN verification
and sub-account creation both succeed on the backend — invoice/link creation is gated
behind Active status in the UI and enforced by a backend 403.

---

## Commands

```bash
npm run dev            # dev server (port 3000)
npm run build          # production build
npm start              # serve the production build
npm run lint           # ESLint
npm run format         # Prettier (write)
npm run format:check   # Prettier (check only)
```

---

## Troubleshooting

- **App loads but every API call fails / 404s** — the backend isn't running on `:4000`,
  or `NEXT_PUBLIC_API_BASE_URL` / the `next.config.ts` proxy target don't point at it.
  Confirm `curl http://localhost:4000/health` works.
- **Bounced to `/login` on refresh** — expected briefly during hydration; a persistent
  bounce means the stored token was cleared by a 401 (re-login).
- **Port 3000 already in use** — run `npm run dev -- -p 3001`.
- **Node version errors** — this app requires Node ≥ 20 (`node -v`).

---

## Further reading

- [`CLAUDE.md`](CLAUDE.md) — app structure, design system, and the phase-by-phase build
  log.
- Backend repo: **[Monnify-Sprout/backend](https://github.com/Monnify-Sprout/backend)**.
