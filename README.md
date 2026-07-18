# Sprout - Frontend

Next.js (App Router) + TypeScript app for Sprout (APIConf Lagos x Monnify Developer
Challenge). See `CLAUDE.md` and `../Sprout_Claude_Code_Build_Plan_v2.md` for the full
context. From phase 5 onward the backend (`../backend`) should be running locally
alongside this app.

## Stack

Next.js (App Router), Tailwind CSS, shadcn/ui, Zustand, TanStack React Query,
Axios (JWT interceptor in `src/lib/api.ts`), React Hook Form + Zod resolvers.

## Setup

```bash
npm install
cp .env.example .env.local   # frontend-only vars; no secrets
```

## Run

```bash
npm run dev      # http://localhost:3000
npm run build
npm start
```

## Quality

```bash
npm run lint           # ESLint
npm run format         # Prettier (write)
npm run format:check   # Prettier (check only)
```
