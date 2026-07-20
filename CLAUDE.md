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

Phase 7 (public payment page) is **complete and verified in-browser**:
- `/pay/[reference]` (public chrome, no session): amount, business name,
  description, due date, virtual account + copy, "Pay with card" checkout link.
- Status comes ONLY from polling `GET /api/public/invoices/:reference` every 4s
  while pending (`publicInvoiceResponseSchema` mirror) - redirect params are
  never trusted. `refetchIntervalInBackground: true` and
  `refetchOnWindowFocus: true` are load-bearing: buyers background the tab for
  their banking app, and React Query pauses interval refetches on hidden tabs
  by default.
- Terminal states verified: paid (flips live on webhook, channels withdrawn by
  the backend), expired (server-side lazy expiry), cancelled, not-found.

Pre-Phase-8 refinements (verified in-browser): the new-invoice form splits
`item` (required) from `notes` (optional) and identifies the buyer by any one of
social handle / name / phone / email (name optional). The social-handle field
leads the Buyer section full-width with a platform picker (Instagram / WhatsApp /
Facebook / Snapchat / Other-typed) whose choice is stored in
`customer_social_platform` (sent only with a handle). Amounts group digits
live in the input (`groupAmountInput`); `formatDateTime` shows created/paid with
the time; `customerLabel` renders the best available buyer identifier across the
list, detail, and pay page, appending the platform via `socialHandleLabel` when
the handle is the identifier. Empty optional form fields are coerced to undefined
in the schema so they don't fail their own format checks.

Phase 8 (analytics + connected-account UI) is **complete and verified
in-browser**:
- `src/components/analytics-view.tsx` is ONE dimension-agnostic component (stat
  tiles + a single-hue trend bar chart with hover + a generic
  {label,count,amount} breakdown) rendering merchant AND connected scopes from
  one codepath. Charts are hand-rolled SVG/HTML (no chart library) on the
  `--brand`/`--chart-*` tokens.
- `/analytics`: scope switcher (my sales vs each connected account) + 7/30/90-day
  window. `/connected`: connect form (read-only messaging), list, sync, two-step
  disconnect. Analytics + Connected nav are now `ready`.
- Invoice list has search (customer/item/reference) + status filter; created/paid
  show date+time.
- Settlement account collected on `/verify` (curated bank list in
  `src/lib/banks.ts`); the verified state shows where payouts settle.

Phase 9b (polish + demo rehearsal) is **complete and verified in-browser**:
- Loading/error/empty states rounded out: analytics has a layout-matching
  skeleton while loading; the invoices list and the connected-accounts list each
  distinguish loading vs error vs empty (a failed fetch no longer masquerades as
  "nothing here"); the connected list shows an explicit empty state.
- **Fixed a cross-account cache leak**: React Query's cache was never cleared on
  logout, so a second merchant signing in briefly saw the previous merchant's
  cached invoices/analytics. `queryClient.clear()` now runs on logout and on
  login/register success (the latter also covers a 401 that cleared only the
  store). If you add new session entry/exit points, clear the query cache there.
- PRD §13's nine-step demo was run start to finish against `npm run seed` data
  with no manual DB edits: live onboarding (pending -> Active + sub-account),
  a ₦10,000 invoice paid via a signed webhook (split recorded), the merchant's
  own analytics, and the same view rendering for the connected account.

Phase 10 (analytics deepening + advanced invoice filtering) is **complete and
verified in-browser** (2026-07-19):
- `AnalyticsView` stays ONE component for both scopes but is richer: extra stat
  tiles (largest sale, unique customers, and merchant-only Net settled + Sprout
  fees), a `FunnelCard` (collection rate, outstanding, avg time-to-payment, and a
  stacked paid/outstanding/overdue/cancelled bar), and new breakdown cards (Time
  of day, Top customers, and merchant-only Top items). Merchant-only pieces render
  only when present (`data.scope.type === 'merchant'` / `data.funnel`), so a
  connected account cleanly shows just the shared metrics. Verified both scopes
  in-browser (connected hides net/fees/funnel/top-items).
- New base-nova `Dialog` primitive (`components/ui/dialog.tsx`, on
  `@base-ui/react/dialog` - Portal + Backdrop + Popup, with `data-[starting-style]`
  / `data-[ending-style]` enter/leave transitions). First reusable overlay in the
  app; a future invoice side-sheet is the same primitive edge-positioned.
- Invoice filter modal (`components/invoice-filters.tsx`): status (multi), date
  created / due / paid ranges, amount min/max, and customer details. The pure
  `applyInvoiceFilters(list, filters)` runs CLIENT-SIDE over the already-fetched
  list and composes with the existing search box; the page shows an active-filter
  count badge, a "showing X of Y" line, and a Clear control. The "date paid"
  filter + a new Paid column use `paid_at`, now on each row from the backend list
  (schema field is `.nullable().optional()` since create/detail omit it).
- The list's old single-select status pills were replaced by this modal.

Phase 11 (categories) is **complete and verified in-browser** (2026-07-19):
- `/categories` manager (`app/(app)/categories/page.tsx`): create (name + colour
  swatch from `lib/category-colors.ts`), inline rename/recolour, two-step delete,
  each row showing its colour dot + `invoice_count`. A new `Categories` nav item
  (Tag icon) sits between Analytics and Connected in `(app)/layout.tsx` (sidebar +
  mobile bar).
- Invoice form category picker (`/invoices/new`): colour-dot pills (None + each
  category) with a "Manage" link; the chosen `category_id` rides the create
  payload. The list shows a colour chip beside the item; the detail page adds a
  Category row.
- The dimension-agnostic `AnalyticsView` gained a "By category" `BreakdownCard`
  (merchant-only, hidden for a connected account) fed by the backend's
  `by_category`. `BreakdownCard`'s `Row` grew an optional per-row `color` so the
  category bars use each category's own colour (the "Uncategorised" row has a null
  colour and falls back to the brand hue) - a minimal extension, not a rewrite.
- The invoice filter modal gained a Category section (colour-dot toggles);
  `InvoiceFilters` grew `categories: string[]`, composing with the other filters
  and the search box (which now also matches category name). The dashboard fetches
  categories and passes them to `InvoiceFilterDialog`.

Phase 12 (static payment links) is **complete and verified in-browser**
(2026-07-20):
- Payment links live as a TAB of the invoices page: a shared `InvoiceTabs`
  segmented control (`components/invoice-tabs.tsx`) switches between `/invoices`
  (one-time invoices) and `/invoices/links` (reusable links). Links nest under
  `/invoices/*` so the Invoices nav item stays highlighted; no new nav item.
- `/invoices/links` (list): status-count cards (Total / Active / Paused / Ended /
  Total collected) + a table (title, price or "Buyer decides", status badge,
  collection count, collected, created). Locked/loading/error/empty states mirror
  the invoice list.
- `/invoices/links/new` (create): title, optional item, a Fixed-price vs
  Buyer-decides toggle (`createPaymentLinkFormSchema` has a form-only `mode` and a
  superRefine requiring an amount when fixed), and the category picker. On success,
  a confirmation with the shareable `LinkShare` block.
- `/invoices/links/[id]` (detail): stat cards (total collected, collections,
  average, last paid), status actions (Pause/Resume/End - ending is terminal), the
  `LinkShare` block (shown only while active), a collections table, and a mock-only
  "Simulate a payment" card (gated on `merchant.verification_mode === 'mock'`) that
  drops a test collection live.
- `LinkShare` (`components/link-share.tsx`) shows the shareable public URL
  (`window.location.origin` read at render with `suppressHydrationWarning`), the
  reserved account, and the checkout URL. Public buyer page `/link/[slug]` (own
  public chrome, mirrors `/pay`): shows how to pay while active; paused shows
  "temporarily unavailable" and ended "closed" (no channels).
- Analytics: `AnalyticsView` gained a merchant-only "By payment link"
  `BreakdownCard` fed by the backend's `by_link` (rendered only when it has rows);
  the shared totals/trend/breakdowns already include link revenue because the
  backend unions collections into the merchant base. Schema mirror in
  `lib/schemas/payment-link.ts` + `by_link` on `analytics.ts`; status styles +
  `formatLinkAmount` in `lib/format.ts`.

Invoice side-sheet + row-level table clicks (quick win) is **complete and
verified in-browser** (2026-07-20):
- New base-nova `Sheet` primitive (`components/ui/sheet.tsx`): the same
  `@base-ui/react/dialog` as `components/ui/dialog.tsx` but pinned to the right
  edge (`inset-y-0 right-0`) with a `translate-x` enter/leave transition. Kept
  separate from `Dialog` so the centred filter modal and this detail peek stay
  visually distinct. A slide-over was chosen over a modal for peeking at rows
  without losing list scroll position.
- The invoice detail cards were extracted verbatim into a shared
  `InvoiceDetailBody` (`components/invoice-detail-body.tsx`), now rendered by BOTH
  `/invoices/[id]` and the new `InvoiceSheet` (`components/invoice-sheet.tsx`).
  The sheet reuses the SAME `['invoices', id]` React Query key as the full page,
  so the "Open full page" link opens instantly off shared cache.
- Clicking an invoice row opens the sheet instead of navigating. Whole rows are
  clickable AND keyboard-accessible (Enter/Space) on both the invoices and
  payment-links tables via `rowActivate` in `lib/utils.ts` (rows render as
  `role="button"` + an `aria-label`; the first-cell text is now a plain span, not
  a `<Link>`). The payment-links row uses `router.push` to
  `/invoices/links/[id]`. The link-detail collections table is left
  non-clickable on purpose - it has no per-row destination.

Phase 13 (revenue streams) is **complete and verified in-browser** (2026-07-20):
- "Streams" = where (or through whom) a sale came from: a shop branch, a market
  stall, the Instagram page, a sales rep, a pop-up, a second brand. The name was
  chosen over "branches" because the dimension covers far more than physical
  branches (and "sub-account" was already taken by Monnify's concept). A stream
  is tracking-only until a settlement account is attached, which ROUTES its
  revenue to its own bank account via its own Monnify sub-account.
- `/streams` manager (`app/(app)/streams/page.tsx`): create/edit with a
  "Settles to its own account" checkbox revealing bank picker (from
  `lib/banks.ts`) + NUBAN + account-name fields; rows show invoice/link counts,
  total collected across both products, a routed line ("Settles to Access Bank
  ····4321" with a Landmark icon) or "Settles to your main account", an ARCHIVED
  badge, Archive/Restore, and Delete only when unused. New `Streams` nav item
  (Waypoints icon) between Categories and Connected.
- Shared `StreamPicker` (`components/stream-picker.tsx`): None + pill per ACTIVE
  stream (archived ones excluded; routed ones carry a small Landmark icon), used
  by the invoice form (inside "Add more details") and the payment-link form.
  `stream_id` rides both create payloads.
- Invoice detail/sheet shows a Stream row (`invoice-detail-body.tsx`); the link
  detail rail shows one too. The invoice filter modal gained a Stream section
  (`InvoiceFilters.streams: string[]`); search also matches `stream_name`.
- `AnalyticsView` gained a merchant-only "By stream" `BreakdownCard` fed by
  `by_stream` - hidden until at least one non-"Unassigned" row exists, so a
  merchant with no streams never sees a one-row card.
- Schema mirror in `lib/schemas/stream.ts` (streamSchema + `streamFormSchema`
  with a form-only `routed` flag); `stream_id`/`stream_name` on invoice +
  payment-link schemas; `by_stream` on analytics.

Next: nothing outstanding - the full roadmap through Phase 13 is built.
