# Sprout — Frontend Context

Next.js + TypeScript app for Sprout, an APIConf Lagos x Monnify Developer Challenge
hackathon project. Read `../Sprout_PRD_v2.0.docx` and
`../Sprout_Claude_Code_Build_Plan_v2.md` before starting any phase — this file is
the summary, those are the source of truth. The backend (`../backend`) should be
running locally alongside this app from phase 5 onward.

## Stack

Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, Zustand, TanStack React
Query, Axios (JWT interceptor), React Hook Form + Zod resolvers.

shadcn components use the `base-nova` style on top of `@base-ui/react` (not radix).
Keep it that way — the harmony-admin reference app uses radix/new-york, but we do
NOT port its components; only its design tokens (below).

## Design system (ported from harmony-admin)

- Typeface: **Poppins** (`--font-poppins` → `--font-sans`/`--font-heading`), wired
  in `src/app/layout.tsx`.
- Palette: shadcn neutral base (shared with harmony) + a Sprout brand accent
  token `--brand` / `--color-brand` — green `oklch(0.58 0.16 150)` (light) /
  `oklch(0.62 0.16 150)` (dark). The token structure was ported from harmony's
  red accent, then recoloured green for the Sprout brand. Use `bg-brand` /
  `text-brand-foreground` for the primary brand colour.
- Charts: harmony's colourful `--chart-1..5` palette (light + dark).
- Icons: **lucide-react** (matches harmony's icon library). Harmony's hand-rolled
  brand icons (Chowdeck, logos, etc.) are intentionally NOT ported.
- All tokens live in `src/app/globals.css`.

## Core mechanic — pin this

A merchant isn't Active until BVN/NIN verification and sub-account creation both
succeed on the backend (phase 2). Invoice creation must be gated behind Active
status — don't let the UI imply it's available earlier.

## Two fee layers — keep distinct (PRD §7.3)

Same as backend: Monnify's own transaction fee vs Sprout's platform commission. Any
split shown in the UI should make clear which layer it's describing.

## Two analytics audiences, one component (PRD §7.5–§7.6)

Sprout-onboarded merchants and merchants who connect their own existing Monnify
account both see the same analytics view, sourced from different backend data via
Phase 4's shared endpoint. Build one component parameterised by context, not two.

## Current phase

Phase 0 (scaffolding) complete. Frontend work resumes at Phase 5 once backend
phases 1–4 are done.
