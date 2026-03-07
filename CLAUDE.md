# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Dev server
npm run dev                          # starts Nuxt dev server (needs DB + env vars)

# Build & preview
npm run build                        # production build
npm run preview                      # preview production build locally

# Database
docker compose up -d                 # start local PostgreSQL 16
npx drizzle-kit generate             # generate migration from schema changes
npx drizzle-kit migrate              # apply migrations
npx drizzle-kit studio               # open Drizzle Studio GUI

# Post-install (auto-runs)
npx nuxt prepare                     # generates .nuxt types
```

No linting or test framework is configured.

## Architecture

**Nuxt 4** full-stack app: Vue 3 SPA frontend with Nitro H3 API backend, session-based auth.

### AI Document Processing (Single-Step)
`POST /api/ai/process` sends document to AI provider → extracts data → saves `aiSummaries`, `medications`, `conditions` → regenerates versioned `memberHealthSummaries`. No manual review step.

### AI Provider Abstraction
`server/utils/ai-provider.ts` provides `useAIProvider()` with three backends:
- `codex` (default) — Codex CLI via `codex exec`
- `claude` — Claude CLI via `claude -p --output-format text`
- `openai` — OpenAI-compatible API via SDK
Selected by `AI_PROVIDER` env var.

CLI providers write documents to temp files for vision analysis. JSON is extracted from CLI output with fallback parsing (raw → markdown fences → substring). Health summary generation is non-blocking — errors don't fail the upload request.

`server/utils/ai.ts` is legacy (no consumers) — kept for reference, safe to delete.

### Data Model Chain
`users → familyMembers → documents → aiSummaries` with side tables for `medications`, `conditions`, `memberHealthSummaries`, `chatMessages`.

Schema note: `documents.isApproved` and `aiSummaries.isReviewed` are auto-set to `true` during processing (no manual review step). Do not remove these columns without a migration — they maintain backward compatibility.

### Storage Abstraction
`server/utils/storage.ts` provides unified `uploadFile/getFileObject/deleteFile`. Driver selected by `STORAGE_DRIVER` env var (`local` = `./uploads/` served via `/api/files/`, `r2` = Cloudflare R2 with signed URLs).

### Database Connection
`server/database/index.ts` auto-detects Neon vs local Postgres by checking if `DATABASE_URL` contains `neon.tech` — uses `neon-http` driver for Neon, standard `postgres` driver locally.

## Key Conventions

- **Server imports**: use `~~/server/...` (double-tilde = project root in Nuxt 4)
- **API pattern**: every handler calls `requireAuth(event)` first, uses Zod via `readValidatedBody(event, schema.parse)`, always filters by `user.id` for data isolation
- **Client data fetching**: `$fetch` in composables with `useState` for SSR-safe shared state — no axios or vue-query
- **Component naming**: `pathPrefix: false` in nuxt.config, so `<DocumentCard>` not `<DocumentsDocumentCard>`
- **UI primitives**: shadcn-vue in `app/components/ui/`, barrel `index.ts` files excluded from auto-import
- **Class merging**: `cn()` from `app/lib/utils.ts` (clsx + tailwind-merge)
- **Auth type augmentation**: `#auth-utils` User interface extended in BOTH `app/types/auth.d.ts` AND `server/types/auth.d.ts` — keep them in sync
- **AI provider**: `useAIProvider()` singleton from `server/utils/ai-provider.ts` — supports CLI (codex/claude) and API (openai) backends via `AI_PROVIDER` env var
- **Chat**: `DELETE /api/chat/[memberId]/messages` clears conversation history. Messages are per-user per-member.
- **Nitro preset**: hardcoded to `'vercel'` in nuxt.config — override with `NITRO_PRESET` env var for local dev if needed

## Environment Setup

Copy `.env.example` to `.env`. Required vars for local dev:
- `DATABASE_URL=postgresql://medrecords:medrecords@localhost:5432/medrecords`
- `NUXT_SESSION_PASSWORD` (min 32 chars)
- `AI_PROVIDER=codex` (or `claude` or `openai`)
- `OPENAI_API_KEY` + `OPENAI_BASE_URL` (only if `AI_PROVIDER=openai`)
- `STORAGE_DRIVER=local`

## Git

Never use claude username for git commits.
