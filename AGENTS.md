<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Quick commands

- `pnpm dev` — dev server (port 3000)
- `pnpm build` — production build
- `pnpm lint` — ESLint (flat config, next core-web-vitals + typescript)
- No `typecheck` or `test` scripts exist. Use `pnpm build` to catch type errors.

## Stack

- **Next.js 16.3.3** (App Router) + **React 19.2.8**
- **TypeScript** strict mode, path alias `@/*` → `./src/*`
- **Tailwind CSS v4** (PostCSS plugin) + **shadcn** (base-nova style, `components.json`)
- **Lucide React** icons, `class-variance-authority` + `tailwind-merge` for styling
- UI language is **Spanish** (`lang="es"` in layout)

## Architecture

```
src/
  app/
    page.tsx              # Home: search + masonry grid of photos
    destination/[id]/     # Detail page: photo + bento layout + AI travel plan
    api/
      photos/             # GET ?q=...&page=... (search), GET /popular, POST /related, GET /[id]
      ai-plan/            # POST { destination, context } → Gemini-generated TravelPlan
  services/
    unsplash.ts           # Server-only. Unsplash API wrapper (search, popular, related, getPhoto)
    gemini.ts             # Server-only. Google Gemini travel plan generation (structured JSON)
  hooks/
    use-favorites.ts      # localStorage-backed favorites via useSyncExternalStore
    use-recent-searches.ts # localStorage-backed recent searches (max 8)
  components/
    features/             # Domain components: SearchBar, MasonryGrid, PhotoCard, TravelPlanPanel, etc.
    ui/                   # shadcn primitives (Button, Input, Badge, Sheet, etc.)
  lib/
    types.ts              # UnsplashPhoto, TravelPlan, PaginatedPhotos, ApiError
    utils.ts              # cn() helper
```

## Environment variables

Required (see `.env.example`):
- `UNSPLASH_ACCESS_KEY` — Unsplash API
- `GEMINI_API_KEY` — Google Gemini API

Optional:
- `GEMINI_MODEL` — override default `gemini-3-flash-preview`

## Gotchas

- **`fetchedRef` guard in `page.tsx`**: The search page uses `useRef(initialQuery)` to prevent a race condition between the `useEffect` fetch and the SearchBar's 300ms debounce timer. Both trigger on mount; the ref ensures only one fires. If you change the search flow, preserve this pattern or the terminal will flood with duplicate requests.
- **`useSyncExternalStore` snapshot caching**: Both `use-favorites.ts` and `use-recent-searches.ts` cache the parsed localStorage value at module level. Without this, `getSnapshot()` returns a new array reference each call → React infinite re-render loop. If you add new localStorage-backed hooks, use the same pattern.
- **`server-only` imports**: `src/services/` files import `"server-only"` at the top. They must never be imported from client components — only through API routes.
- **Unsplash rate limit**: 50 req/hr on demo keys. The `fetchPopular` function picks a random curated city per call; search results are cached via `next: { revalidate: 3600 }`.
- **`AGENTS.md` is auto-generated**: The `<!-- BEGIN/END:nextjs-agent-rules -->` block is re-created by `next dev`. Do not remove it. If you add content, put it outside the marker block.
- **shadcn components**: Use `pnpm dlx shadcn@latest add <component>` to add new primitives. They land in `src/components/ui/`. Config is in `components.json`.
- **Next.js 16 API**: Route handler params are async (`{ params }: { params: Promise<{ id: string }> }`) — must `await params`. This differs from older Next.js versions.

## Hooks pattern

Client-side persistence hooks (`use-favorites`, `use-recent-searches`) follow the same structure:
1. Module-level `cachedRaw` / `cachedResult` for snapshot stability
2. `subscribe` listens to `window.storage` events
3. Mutations write to `localStorage` then dispatch a `StorageEvent` to notify other tabs/components
4. `getServerSnapshot` returns `[]` for SSR compatibility
