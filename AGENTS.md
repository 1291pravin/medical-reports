# Repository Guidelines

## Project Structure & Module Organization
This is a Nuxt 4 full-stack app. Frontend code lives in `app/`: pages in `app/pages`, shared UI in `app/components`, composables in `app/composables`, layouts in `app/layouts`, and styles in `app/assets/css`. Backend code lives in `server/`: API handlers in `server/api`, database schema and migrations in `server/database`, and shared server utilities in `server/utils`. Static files go in `public/`. Local uploads are stored in `uploads/` when `STORAGE_DRIVER=local`.

## Build, Test, and Development Commands
Use `npm run dev` to start the Nuxt dev server; it expects a working database and `.env` values. Use `docker compose up -d` to start the local PostgreSQL 16 instance. Use `npm run build` for a production build, `npm run preview` to serve that build locally, and `npm run generate` for static generation. Database workflows use Drizzle: `npx drizzle-kit generate` creates migrations and `npx drizzle-kit migrate` applies them.

## Coding Style & Naming Conventions
Use TypeScript and Vue single-file components with 2-space indentation. Keep server imports rooted with `~~/server/...`. API handlers should call `requireAuth(event)` first, validate input with Zod, and always scope queries by `user.id`. Use PascalCase for Vue components (`DocumentCard.vue`), camelCase for composables (`useDocuments.ts`), and kebab-case for route file segments where appropriate. Reuse `cn()` from `app/lib/utils.ts` for class merging. Keep auth type augmentation synchronized in both `app/types/auth.d.ts` and `server/types/auth.d.ts`.

## Testing Guidelines
There is currently no configured test runner or coverage gate. Until one is added, verify changes with `npm run build` and exercise the affected flow in `npm run dev`. For database changes, add a Drizzle migration and confirm it applies cleanly before opening a PR.

## Commit & Pull Request Guidelines
Git history is minimal, but the existing pattern uses short, imperative commit subjects such as `Initial commit: Medical reports management app`. Continue with concise, descriptive messages focused on one change. PRs should include a short summary, note any schema or env changes, link the related issue if one exists, and attach screenshots for UI work. Call out any AI-provider, storage, or auth changes explicitly because they affect local setup and deployment.

## Security & Configuration Tips
Copy `.env.example` to `.env` and never commit secrets. Required local values include `DATABASE_URL`, `NUXT_SESSION_PASSWORD`, `AI_PROVIDER`, and `STORAGE_DRIVER`. The default Nitro preset targets Vercel; override with `NITRO_PRESET` when needed for local or alternate deployments.
