# ADR-001: Monorepo structure

- Status: Accepted
- Date: 2025-12-06
- Deciders: Architecture Guild
- Contributors: Platform Engineering
- Tags: repo, tooling, delivery

## Context

The Summit/IntelGraph platform has grown into a multi-surface system spanning APIs, client applications, shared packages, and automation scripts. A single codebase already houses the primary server, React client, pnpm workspace packages, and multiple Docker and CI assets. Teams need to coordinate changes that touch schemas, workflows, and shared utilities without cross-repo drift.

## Decision

Maintain a unified monorepo rooted at `/workspace/summit` managed with pnpm workspaces. All first-party services (`apps/*`, `services/*`, `packages/*`, `agents/*`, `companyos/services/*`, `server`, `client`, `cli`, `tools/*`) stay co-located and governed by the same linting, typing, and release standards. Shared build tooling (Turbo, pnpm, Husky, lint/format/typecheck scripts) remains centralized and enforced at the repo root.

## Consequences

- Faster cross-cutting changes: schema updates, shared types, and client/server contract changes can land atomically with consistent CI coverage.
- Operational consistency: a single dependency tree and workspace manifest reduces version skew and simplifies environment provisioning.
- Tradeoffs: repo size and install times increase; caching (Turbo), scoped installs, and workspace-aware tooling are required to keep developer feedback loops fast.

## Options Considered

- Option A: Split into multiple service-specific repos (rejected due to coordination overhead and schema drift risk).
- Option B: Hybrid approach with a "core" monorepo plus satellite repos (rejected for added release complexity).
- Option C: Full monorepo with strict workspace and CI governance (chosen).
