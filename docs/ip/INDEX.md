# IP Platform Index

**Single source of truth for all Summit / IntelGraph IP documentation**

## Quick Start

1. **Explore families**: Open [ip-registry.yaml](./ip-registry.yaml) to see all 10 IP families
2. **Understand the platform**: Read [PLATFORM_OVERVIEW.md](./PLATFORM_OVERVIEW.md) for architecture
3. **Review roadmap**: See [IP_PROGRAM_ROADMAP.md](./IP_PROGRAM_ROADMAP.md) for strategic initiatives
4. **Check metrics**: Run `pnpm run ip:metrics` to generate coverage report
5. **Browse UI**: Navigate to `/ip-console` in the web app (once deployed)

---

## Core Documents

### Registry & Overview

| Document | Purpose | Last Updated | Owner |
|----------|---------|--------------|-------|
| [ip-registry.yaml](./ip-registry.yaml) | **Single source of truth** for all IP families | 2025-11-20 | Platform Team |
| [PLATFORM_OVERVIEW.md](./PLATFORM_OVERVIEW.md) | Architecture and component overview | 2025-11-20 | Platform Team |
| [INDEX.md](./INDEX.md) | This file—directory index | 2025-11-20 | Platform Team |

### Code & Implementation

| Document | Purpose | Last Updated | Owner |
|----------|---------|--------------|-------|
| [LINKING_CODE.md](./LINKING_CODE.md) | Annotation scheme and guidelines | 2025-11-20 | Platform Team |

### Roadmap & Strategy

| Document | Purpose | Last Updated | Owner |
|----------|---------|--------------|-------|
| [IP_PROGRAM_ROADMAP.md](./IP_PROGRAM_ROADMAP.md) | Unified cross-family roadmap (H0-H3) | 2025-11-20 | Product/Eng |

### Observability & Metrics

| Document | Purpose | Last Updated | Owner |
|----------|---------|--------------|-------|
| [OBSERVABILITY.md](./OBSERVABILITY.md) | Metrics framework and tracking | 2025-11-20 | Platform Team |

### Competitive Analysis

| Document | Purpose | Last Updated | Owner |
|----------|---------|--------------|-------|
| [../competitive/IP_PLATFORM_MOAT.md](../competitive/IP_PLATFORM_MOAT.md) | Competitive moat narrative | 2025-11-20 | Product/Strategy |

---

## Invention Disclosures (Future)

Once families mature, detailed invention disclosures will live here:

| Family ID | File | Status | Last Updated |
|-----------|------|--------|--------------|
| F1 | `F1-provenance-multi-llm-orchestration.md` | MVP (not yet created) | TBD |
| F2 | `F2-cognitive-targeting-active-measures.md` | Partial (not yet created) | TBD |
| F3 | `F3-adversarial-misinfo-defense.md` | Partial (not yet created) | TBD |
| F4 | `F4-cloud-arbitrage-incentive-routing.md` | Idea (not yet created) | TBD |
| F5 | `F5-graphrag-query-preview.md` | MVP (not yet created) | TBD |
| F6 | `F6-graph-investigation-workflow.md` | v1 (not yet created) | TBD |
| F7 | `F7-multimodal-ai-extraction.md` | MVP (not yet created) | TBD |
| F8 | `F8-observability-slo-driven.md` | v1 (not yet created) | TBD |
| F9 | `F9-export-controls-governance.md` | Partial (not yet created) | TBD |
| F10 | `F10-universal-data-connector-sdk.md` | MVP (not yet created) | TBD |

**Creation guideline**: Write invention disclosure docs once family reaches **MVP** status and is ready for patent prosecution review.

---

## Tooling & Scripts

| Tool | Purpose | Usage |
|------|---------|-------|
| `scripts/ip-metrics.ts` | Generate coverage report per family | `pnpm run ip:metrics` |
| `client/src/pages/IPConsole/` | Web UI for IP family management | Navigate to `/ip-console` |

---

## Maintenance Schedule

### Weekly

- Run `pnpm run ip:metrics` and share summary in team standup
- Review any new `@ip-family` annotations in recent PRs

### Monthly

- Update family `status` in `ip-registry.yaml` as work progresses
- Review roadmap progress (which epics completed?)
- Add new families if novel work emerged

### Quarterly

- **Full IP audit**: Coverage, capabilities, tests, docs
- **Roadmap refresh**: Adjust H1-H3 based on progress and market intel
- **Competitive review**: Update `../competitive/IP_PLATFORM_MOAT.md`

---

## Status Summary (Auto-Updated by ip-metrics.ts)

**Last Run**: 2025-11-20 (manual)

```
- Total families: 10
- Status breakdown:
  - idea: 1 (F4)
  - partial: 3 (F2, F3, F9)
  - mvp: 4 (F1, F5, F7, F10)
  - v1: 2 (F6, F8)
  - v2+: 0
- Average coverage: TBD (run `pnpm run ip:metrics`)
- Families < 50% coverage: TBD
```

*(Replace with actual output from `ip-metrics.ts` once run)*

---

## Tags & Search

Families are tagged for easy filtering. Common tags:

- `provenance` → F1, F9
- `graph` → F1, F5, F6
- `llm` → F1, F2, F5
- `psyops` → F2, F3
- `ai-ml` → F1, F5, F7
- `observability` → F8
- `compliance` → F9
- `orchestration` → F1
- `connectors` → F10

Use `grep` or console UI filters to find families by tag.

---

## Questions & Troubleshooting

**Q: How do I add a new IP family?**

A: See [PLATFORM_OVERVIEW.md § Maintenance](./PLATFORM_OVERVIEW.md#maintenance)

**Q: How do I annotate code with `@ip-family`?**

A: See [LINKING_CODE.md](./LINKING_CODE.md)

**Q: Where do I track roadmap progress?**

A: See [IP_PROGRAM_ROADMAP.md](./IP_PROGRAM_ROADMAP.md) and link GitHub issues with `ip:FX` labels

**Q: How do I generate metrics?**

A: Run `pnpm run ip:metrics` (see [OBSERVABILITY.md](./OBSERVABILITY.md))

**Q: Who owns the IP Platform?**

A: Platform Team (currently `unassigned` in registry—assign to specific team/person as org scales)

---

## Version History

- **2025-11-20**: Initial IP Platform creation
  - Created registry with 10 families
  - Built platform overview, roadmap, observability docs
  - Scaffolded IP Console UI
  - Added annotation scheme and metrics script

---

## License & IP Strategy

All IP family documentation in this directory is **proprietary** and covered under the [MIT license](../../LICENSE) for code implementations, but **invention disclosures are confidential and not for public distribution** until patent strategy is finalized.

**Do not**:
- Share family docs with external parties without legal review
- Publish invention disclosures publicly before patent filing
- Copy text from external sources (maintain clean provenance)

**Do**:
- Keep docs updated as code evolves
- Use for internal planning and patent prosecution
- Share with trusted partners under NDA

---

**The IP Platform is a living, breathing system. Keep it sharp, keep it ahead.**
