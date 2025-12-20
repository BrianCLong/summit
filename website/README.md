# Topicality.co website

Next.js 14 App Router site for Topicality.co with Summit as the flagship initiative. Includes first-party analytics, Tailwind-based theming, and CI-ready tests.

## Getting started

```bash
cd website
pnpm install
cp .env.example .env.local
pnpm dev
```

## Validation

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm e2e
```

## Environment
- `NEXT_PUBLIC_SITE_URL` – public base URL for metadata and sitemap.
- `NEXT_PUBLIC_ANALYTICS_MODE` – `none` or `firstparty` (enables `/api/analytics`).
- `NEXT_PUBLIC_ANALYTICS_ENDPOINT` – analytics collector path, defaults to `/api/analytics`.
