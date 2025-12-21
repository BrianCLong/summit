# Topicality.co Website

Marketing website for Topicality.co with Summit as the flagship initiative.

## Overview

This is a Next.js-based marketing website that:

- Presents **Topicality** as a meta-platform for complex systems
- Showcases **Summit** as the deep, flagship initiative
- Provides first-party analytics for live testing
- Is production-ready and SEO-optimized

## Quick Start

```bash
cd website
pnpm install
cp .env.example .env.local
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Structure

```
website/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx           # Homepage
│   │   ├── summit/            # Summit section pages
│   │   │   ├── page.tsx       # Overview
│   │   │   ├── capabilities/  # Capabilities
│   │   │   ├── architecture/  # Architecture
│   │   │   ├── security/      # Security & Governance
│   │   │   ├── use-cases/     # Use Cases
│   │   │   ├── roadmap/       # Roadmap
│   │   │   └── faq/           # FAQ
│   │   ├── initiatives/       # Initiatives
│   │   ├── labs/              # Labs
│   │   ├── research/          # Research
│   │   ├── products/          # Products
│   │   ├── tools/             # Tools
│   │   ├── writing/           # Writing
│   │   ├── about/             # About
│   │   ├── contact/           # Contact
│   │   ├── careers/           # Careers
│   │   ├── legal/             # Legal
│   │   ├── privacy/           # Privacy
│   │   ├── status/            # Status
│   │   └── api/               # API routes
│   │       ├── health/        # Health check
│   │       └── analytics/     # Analytics ingest
│   ├── components/            # React components
│   │   ├── site/              # Site-wide components
│   │   └── ui/                # UI primitives
│   ├── content/               # Content models
│   ├── lib/                   # Utilities
│   │   ├── analytics/         # Analytics client/server
│   │   ├── seo.ts             # SEO utilities
│   │   ├── route.ts           # Route utilities
│   │   └── utils.ts           # General utilities
│   └── styles/                # CSS
├── tests/
│   ├── unit/                  # Vitest unit tests
│   └── e2e/                   # Playwright E2E tests
├── public/                    # Static assets
└── scripts/                   # Build scripts
```

## Development

### Commands

```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint
pnpm typecheck    # Run TypeScript checks
pnpm test         # Run unit tests
pnpm e2e          # Run E2E tests
pnpm ci           # Run full CI suite
```

### Environment Variables

Copy `.env.example` to `.env.local` and configure:

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_SITE_URL` | Site URL | `https://topicality.co` |
| `NEXT_PUBLIC_ANALYTICS_MODE` | Analytics mode (`none` or `firstparty`) | `firstparty` |
| `NEXT_PUBLIC_ANALYTICS_ENDPOINT` | Analytics ingest endpoint | `/api/analytics` |
| `NEXT_PUBLIC_ENV` | Environment label | `local` |

## Architecture

### Information Architecture

```
Topicality.co (oblique, expandable)
├── Summit (flagship, deep)
│   ├── Capabilities
│   ├── Architecture
│   ├── Security & Governance
│   ├── Use Cases
│   ├── Roadmap
│   └── FAQ
├── Initiatives
├── Labs
├── Research
├── Products
├── Tools
├── Writing
├── About
├── Contact
├── Careers
├── Legal
├── Privacy
└── Status
```

### Analytics Events

| Event | Description |
|-------|-------------|
| `page_view` | Page view tracking |
| `nav_click` | Navigation click |
| `cta_click` | Call-to-action click |
| `outbound_click` | External link click |
| `section_view` | Section visibility |
| `scroll_milestone` | Scroll depth tracking |
| `error_client` | Client-side error |

### Design Tokens

Located in `src/styles/tokens.css`:

```css
:root {
  --bg: #0b0f14;
  --fg: #e7edf5;
  --muted: #b8c4d4;
  --muted2: #91a1b6;
  --card: rgba(255, 255, 255, 0.03);
  --border: rgba(255, 255, 255, 0.09);
  --accent: #9fd0ff;
}
```

## Testing

### Unit Tests (Vitest)

```bash
pnpm test              # Run all unit tests
pnpm test:watch        # Watch mode
```

### E2E Tests (Playwright)

```bash
pnpm e2e               # Run E2E tests
```

## Deployment

The website is designed to be deployed to any static hosting or Node.js platform:

- Vercel (recommended)
- Netlify
- Cloudflare Pages
- AWS Amplify
- Self-hosted

### Build

```bash
pnpm build             # Creates .next/ output
```

## Live Testing

The website includes first-party analytics for live testing:

1. **Events are logged** to server console (default)
2. **Swap for durable storage** (PostHog, ClickHouse, etc.) in production
3. **Dashboard specs** in project documentation

### What We Measure

- Which sections answer questions vs create confusion
- Where users drop off in Summit's narrative
- What technical pages earn deeper time-on-page
- Which calls-to-action are credible vs ignored

## Contributing

1. Make changes to content or components
2. Test locally with `pnpm dev`
3. Run `pnpm ci` to verify everything passes
4. Submit a pull request

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Playwright Testing](https://playwright.dev/docs/intro)
