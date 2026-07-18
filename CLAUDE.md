# Sprout - Frontend Context

Next.js + TypeScript app for Sprout, an APIConf Lagos x Monnify Developer Challenge
hackathon project. Read `../Sprout_PRD_v2.0.docx` and
`../Sprout_Claude_Code_Build_Plan_v2.md` before starting any phase - this file is
the summary, those are the source of truth. The backend (`../backend`) should be
running locally alongside this app from phase 5 onward.

## Stack

Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, Zustand, TanStack React
Query, Axios (JWT interceptor), React Hook Form + Zod resolvers.

shadcn components use the `base-nova` style on top of `@base-ui/react` (not radix).
Keep it that way - the harmony-admin reference app uses radix/new-york, but we do
NOT port its components; only its design tokens (below).

## Design system (ported from harmony-admin)

- Typeface: **Poppins** (`--font-poppins` → `--font-sans`/`--font-heading`), wired
  in `src/app/layout.tsx`.
- Palette: shadcn neutral base (shared with harmony) + a Sprout brand accent
  token `--brand` / `--color-brand` - green `oklch(0.58 0.16 150)` (light) /
  `oklch(0.62 0.16 150)` (dark). The token structure was ported from harmony's
  red accent, then recoloured green for the Sprout brand. Use `bg-brand` /
  `text-brand-foreground` for the primary brand colour.
- Charts: harmony's colourful `--chart-1..5` palette (light + dark).
- Icons: **lucide-react** (matches harmony's icon library). Harmony's hand-rolled
  brand icons (Chowdeck, logos, etc.) are intentionally NOT ported.
- All tokens live in `src/app/globals.css`.

## Core mechanic - pin this

A merchant isn't Active until BVN/NIN verification and sub-account creation both
succeed on the backend (phase 2). Invoice creation must be gated behind Active
status - don't let the UI imply it's available earlier.

## Two fee layers - keep distinct (PRD §7.3)

Same as backend: Monnify's own transaction fee vs Sprout's platform commission. Any
split shown in the UI should make clear which layer it's describing.

## Two analytics audiences, one component (PRD §7.5–§7.6)

Sprout-onboarded merchants and merchants who connect their own existing Monnify
account both see the same analytics view, sourced from different backend data via
Phase 4's shared endpoint. Build one component parameterised by context, not two.

## Current phase

Phase 5 (frontend foundation) **complete and verified in the browser** against the
live backend (register → dashboard, refresh persistence, logout redirect, login).

- **Three separate chromes** (no shared layout): `(auth)` centered card,
  `(app)` dashboard shell (sidebar + topbar + `AuthGuard`), and `/pay` public
  invoice layout for buyers.
- **Schemas**: every backend request/response shape is mirrored in
  `src/lib/schemas/` (zero `any`) and used for BOTH react-hook-form validation
  (zodResolver) and React Query response parsing (`schema.parse`).
- **Session**: Zustand store (`src/store/auth.ts`) with `persist` → localStorage
  key `sprout-auth`; `hydrated` flag gates the AuthGuard so refreshes don't
  bounce to /login. Axios reads the token via `getState()`; a 401 clears the
  session and the guard redirects.
- **API routing**: same-origin `/api/*` is proxied to the backend by
  `next.config.ts` rewrites (backend has no CORS - keep it that way).
- Base UI note: `Button render={<Link/>}` needs `nativeButton={false}`.

Phase 6 (verification + invoice UI) is **complete and verified in-browser**:
- `/verify`: BVN/NIN capture; pending / failed / verified states visibly
  distinct; failed shows the stored backend reason and allows retry.
- `/invoices` (list + status badges), `/invoices/new` (form then in-place
  confirmation with virtual account + checkout URL + settlement split),
  `/invoices/[id]` (detail; payment + commission once paid).
- Gating: non-Active merchants get a locked state and /invoices/new redirects;
  the backend 403 backs this up.
- Nav highlights the active path; Invoices enabled on desktop + mobile bars.
- Shared helpers: `src/lib/format.ts` (naira, dates, status styles).

Next: Phase 7 - public invoice payment page (/pay/[reference]).
