# Sprout — Frontend Context

Next.js + TypeScript app for Sprout, an APIConf Lagos x Monnify Developer Challenge
hackathon project. Read `../Sprout_PRD_v2.0.docx` and
`../Sprout_Claude_Code_Build_Plan_v2.md` before starting any phase — this file is
the summary, those are the source of truth. The backend (`../backend`) should be
running locally alongside this app from phase 5 onward.

## Stack

Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, Zustand, TanStack React
Query, Axios (JWT interceptor), React Hook Form + Zod resolvers.

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
