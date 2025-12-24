## Summary

This PR launches the complete Topicality.co marketing website with Summit as the flagship initiative.

### What's Included

**Topicality Marketing Surface (oblique, expandable)**
- Homepage with initiative architecture that accommodates future expansion
- Initiatives, Labs, Research, Products, Tools, Writing sections
- About, Contact, Careers, Legal, Privacy, Status pages
- Minimal, intellectual design that avoids over-specific positioning

**Summit Deep Pages (flagship)**
- Overview with trust surfaces and live testing instrumentation
- Capabilities: ingest, graph, governance, provenance
- Architecture: primitives, design principles, structural commitments
- Security & Governance: posture, policy enforcement, audit
- Use Cases: realistic end-to-end intelligence workflows
- Roadmap: now/next/later with discipline principles
- FAQ: direct technical answers

**Technical Stack**
- Next.js 14 App Router with TypeScript
- Tailwind CSS with custom design tokens
- First-party privacy-preserving analytics
- SEO utilities, dynamic sitemap, robots.txt
- Vitest unit tests + Playwright E2E smoke tests
- GitHub Actions CI workflow

**Features**
- Dark theme with graph-inspired aesthetics
- Responsive design with mobile navigation
- Accessibility (skip links, focus states, reduced motion)
- Production-ready build with security headers

## Test Plan

- [ ] `pnpm install` completes without errors
- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` unit tests pass
- [ ] `pnpm build` succeeds
- [ ] `pnpm e2e` smoke tests pass
- [ ] Homepage loads at localhost:3000
- [ ] Summit pages render correctly
- [ ] Navigation works between pages
- [ ] Health endpoint returns OK at /api/health

## Local Testing

```bash
cd website
pnpm install
cp .env.example .env.local
pnpm dev
# Visit http://localhost:3000
```

## Files Changed

- **106 files** changed
- Removed: Docusaurus blog, docs, and configuration
- Added: Next.js app with 20+ pages, 12 components, analytics, tests, CI
