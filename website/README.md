# Topicality Website

Marketing website for Topicality, built with Next.js 14 and Tailwind CSS.

## Overview

This is the public-facing marketing website for Topicality.co, featuring:

- **Summit**: Our flagship intelligence analysis platform
- **Initiatives**: Strategic programs and partnerships
- **Labs**: Research and experimentation
- **Products**: Commercial offerings
- **Research**: Published papers and analysis
- **Writing**: Blog and thought leadership
- **Documentation & Evidence Portal**: GA-grade documentation composed from repository artefacts with automated regeneration.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **Testing**: Vitest + Playwright
- **Deployment**: Vercel (recommended)

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 9+

### Installation

```bash
cd website
pnpm install
```

### Development

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
pnpm build
pnpm start
```

## Project Structure

```
website/
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── (marketing)/     # Marketing pages (home, about, etc.)
│   │   ├── api/             # API routes
│   │   └── summit/          # Summit product pages
│   ├── components/
│   │   ├── site/            # Site-wide components (Header, Footer, Nav)
│   │   └── ui/              # Reusable UI components
│   ├── content/             # Static content and copy
│   └── lib/                 # Utilities and helpers
├── public/                  # Static assets
└── tests/                   # Test files
```

## Scripts

| Command              | Description                                                                 |
| -------------------- | --------------------------------------------------------------------------- |
| `pnpm dev`           | Start development server                                                    |
| `pnpm build`         | Build for production                                                        |
| `pnpm start`         | Start production server                                                     |
| `pnpm lint`          | Run ESLint                                                                  |
| `pnpm typecheck`     | Run TypeScript checks                                                       |
| `pnpm test`          | Run unit tests                                                              |
| `pnpm e2e`           | Run E2E tests                                                               |
| `pnpm docs:generate` | Build the GA documentation bundle from code comments, schemas, and runbooks |
| `pnpm ci`            | Run full CI suite                                                           |

## Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
cp .env.example .env.local
```

See `.env.example` for available options.

## Analytics

Privacy-preserving first-party analytics are included. Events are tracked via the `track()` function from `@/lib/analytics/client`.

## Deployment

The site is optimized for deployment on Vercel:

```bash
vercel deploy
```

Or build and deploy manually:

```bash
pnpm build
# Deploy the .next folder
```

## Contributing

1. Create a feature branch
2. Make changes
3. Run `pnpm ci` to verify
4. Submit a PR

## License

Proprietary - Topicality, Inc.
