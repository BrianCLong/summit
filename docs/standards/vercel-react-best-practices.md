# Vercel React Best Practices - Enforcement Standard

This document outlines how Summit enforces React and Next.js best practices deterministically via CI, based on [Vercel Shares React Best Practices](https://www.infoq.com/news/2026/02/vercel-react-best-practices/).

## Enforcement Goals
We aim to provide a deterministic **Frontend Boundary & Delivery Assurance Layer** that:
- Detects improper client/server boundary usage.
- Enforces streaming and caching best practices.
- Produces machine-verifiable evidence.
- Fails CI when these invariants regress.

## Rule Mappings

| Practice | Source | Summit Enforcement Rule |
| :--- | :--- | :--- |
| Server Components | ITEM:CLAIM-02 | RBP-001: Prevent server components from importing client-only modules |
| Streaming | ITEM:CLAIM-03 | RBP-003: Require `<Suspense>` boundary in async routes |
| Caching Discipline | ITEM:CLAIM-04 | RBP-002: Require explicit cache directives (`revalidate` or `dynamic`) in routes |
| Deployment Discipline | ITEM:CLAIM-05 | CI enforcement and drift monitoring |

## Non-Goals
- Framework migration.
- Hosting-specific configuration.
