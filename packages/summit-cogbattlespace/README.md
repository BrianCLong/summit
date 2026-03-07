# @intelgraph/summit-cogbattlespace

Tri-Graph cognitive battlespace runtime package for Summit.

## Purpose

This package provides the analytic/defensive runtime substrate for:

- Narrative Graph (NG) ingestion and clustering
- Belief Graph (BG) estimation
- Reality Graph (RG) link analysis without direct RG mutation
- Divergence and belief-gap metric generation
- NG/BG-only WriteSet firewall and unified rejection reports

## Security posture

- Analytic-only guardrails are enforced in `governance/guards.ts`.
- WriteSet envelope rejects any domain outside NG/BG.
- Runtime paths produce rejection reports for schema and policy violations.

## Quick start

```bash
pnpm --dir packages/summit-cogbattlespace test
```

## MAESTRO alignment

- Layers: Data, Agents, Tools, Observability, Security
- Threat model focus: prompt abuse, schema poisoning, cross-domain write contamination
