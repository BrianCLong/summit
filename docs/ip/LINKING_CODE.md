# IP–Code Linkage System

## Purpose

This document defines the **lightweight annotation scheme** used to link IP families (defined in `ip-registry.yaml`) to actual code implementations throughout the Summit/IntelGraph monorepo.

**Goals**:
- **Bidirectional traceability**: From IP family → code modules and from code → IP families
- **Signal over noise**: Annotate only the 20-30 most important surfaces per family
- **Low maintenance**: Minimal overhead, no mandatory CI enforcement initially
- **Machine-readable**: Parseable by `scripts/ip-metrics.ts` for observability

---

## Annotation Schemes

### 1. TypeScript/JavaScript In-Code Annotations

Add comments at the **module, class, or function level** for key implementations:

```typescript
// @ip-family: F1,F5
// Implements provenance-first orchestration (F1) and GraphRAG retrieval (F5)
export class LaunchableOrchestrator {
  // ...
}
```

**Format**:
- `@ip-family:` followed by comma-separated family IDs (no spaces after commas)
- Optional: Follow-up line with human-readable explanation

**Where to annotate**:
- Top-level module exports
- Core service classes
- Critical business logic functions
- Main API resolvers
- Key React components (for UX-heavy families like F6)

**Example locations**:
```typescript
// client/src/services/orchestrator/orchestrator.ts
// @ip-family: F1
// Core multi-LLM orchestrator with task dispatch and provenance tracking
export class LaunchableOrchestrator { ... }

// server/src/graphql/resolvers/investigation.ts
// @ip-family: F6
// Investigation workflow resolvers for golden path
export const investigationResolvers = { ... }

// packages/prov-ledger/src/index.ts
// @ip-family: F1,F9
// Provenance ledger for audit trails (F1) and compliance (F9)
export function recordStep(...) { ... }
```

---

### 2. Metadata Files (Optional, for Complex Modules)

For packages or services that span multiple files, create an `ip.meta.json` in the root:

```json
{
  "ip_families": ["F1", "F10"],
  "notes": "Core provenance ledger enabling immutable audit trails and proof-carrying analytics"
}
```

**Where to use**:
- `packages/prov-ledger/ip.meta.json`
- `services/orchestration/ip.meta.json`
- `connectors/stix_taxii_connector/ip.meta.json`

**Benefits**:
- Aggregates attribution for multi-file modules
- Easier to maintain than scattered comments
- Can include extended notes, contributors, links to docs

---

### 3. Documentation Cross-Links

In IP family docs (`docs/ip/F*-*.md`), explicitly list primary modules:

```markdown
## Primary Modules

- `client/src/services/orchestrator/` (orchestrator core)
- `packages/prov-ledger/` (provenance tracking)
- `.maestro/` (orchestration config)
```

This creates the reverse link: family → code.

---

## Annotation Guidelines

### What to Annotate

**High-priority** (must annotate):
- Core services and orchestrators
- Main API resolvers and controllers
- Key UI components (for user-facing IP)
- Critical algorithms and business logic
- Provenance/audit hooks
- Policy enforcement points

**Medium-priority** (annotate if significant):
- Supporting utilities directly tied to a family
- Data models specific to a family
- Test suites that validate IP claims

**Low-priority** (skip):
- Generic utilities (e.g., logger, config loader)
- Third-party library wrappers
- Boilerplate code (Dockerfiles, scripts)

### When to Add Annotations

- **During initial implementation**: When creating new IP-relevant code
- **During refactors**: When touching annotated code, verify annotations are still accurate
- **During IP audits**: Quarterly review to fill gaps

### When to Update Annotations

- **Family ID changes**: If registry IDs are refactored
- **Code moves**: If a module relocates, update or add annotations
- **Status promotions**: When an IP family matures (idea → MVP → v1), ensure core modules are annotated

---

## Anti-Patterns (What NOT to Do)

❌ **Don't over-annotate**:
```typescript
// @ip-family: F1
function logger(msg: string) { ... } // BAD: Generic utility, not IP-specific
```

❌ **Don't use vague comments**:
```typescript
// @ip-family: F1
// This does orchestration stuff // BAD: Explain *how* it relates to F1
```

❌ **Don't annotate dead code**:
- Remove annotations from deprecated/unused modules
- Archive old annotations in git history

✅ **Do be specific**:
```typescript
// @ip-family: F1
// Dispatches multi-LLM tasks with provenance logging (F1 core capability)
export class LaunchableOrchestrator { ... }
```

---

## Tooling Support

### Current

- **Manual search**: `grep -r "@ip-family" .` to find all annotations
- **Metrics script**: `pnpm run ip:metrics` (once implemented) parses annotations

### Future

- **CI validation**: PR check warns if new code in critical paths lacks annotations
- **IDE plugin**: Syntax highlighting for `@ip-family` comments
- **Auto-linker**: Script to suggest annotations based on git history + family modules list

---

## Metrics & Observability

The `scripts/ip-metrics.ts` script will:

1. Parse `ip-registry.yaml` to get all families
2. Scan `modules` paths for `@ip-family` comments and `ip.meta.json` files
3. Generate report:
   - Per-family: % of listed modules annotated
   - Global: Total annotations, families with <50% coverage
   - Suggestions: "Module X listed in F1 but no annotation found"

**Example output**:
```
IP Metrics Report
=================
Family F1 (Provenance-First Multi-LLM Orchestration):
  - Modules listed: 7
  - Modules annotated: 5 (71%)
  - Missing: .maestro/, .mc/

Family F2 (Cognitive Targeting Engine):
  - Modules listed: 4
  - Modules annotated: 2 (50%)
  - Missing: scenarios/narrative/, cognitive-targeting-engine/

Overall:
  - Total families: 10
  - Avg coverage: 62%
  - Families < 50% coverage: 3
```

---

## Examples by IP Family

### F1: Provenance-First Multi-LLM Orchestration

**Annotated files**:
- `client/src/services/orchestrator/orchestrator.ts` (orchestrator core)
- `packages/prov-ledger/src/index.ts` (provenance ledger)
- `server/orchestrator/maestro.ts` (maestro integration)

**ip.meta.json**:
- `packages/prov-ledger/ip.meta.json`

### F6: Graph-Native Investigation Workflow

**Annotated files**:
- `client/src/pages/InvestigationPage.tsx` (investigation UI)
- `server/src/graphql/resolvers/investigation.ts` (investigation API)
- `server/src/services/InvestigationService.ts` (business logic)

### F10: Universal Data Connector SDK

**Annotated files**:
- `connectors/stix_taxii_connector/src/index.ts`
- `data-pipelines/universal-ingest/src/pipeline.ts`

**ip.meta.json**:
- `connectors/stix_taxii_connector/ip.meta.json`

---

## Maintenance Workflow

### Quarterly IP Audit

1. Run `pnpm run ip:metrics` to generate coverage report
2. Identify families with <50% coverage
3. Review `modules` list in `ip-registry.yaml` for accuracy
4. Add missing annotations or remove stale modules from registry
5. Update `docs/ip/F*-*.md` to reflect current implementation status

### When Adding New IP Family

1. Add entry to `ip-registry.yaml`
2. List primary `modules`
3. Create `docs/ip/FAMILYID-*.md` with detailed disclosure
4. Annotate core modules with `@ip-family: FAMILYID`
5. (Optional) Add `ip.meta.json` for complex packages
6. Run `pnpm run ip:metrics` to verify coverage

### When Deprecating IP Family

1. Update `status` in `ip-registry.yaml` to `deprecated`
2. Remove `@ip-family` annotations from code (or leave with `// DEPRECATED: ...`)
3. Archive `docs/ip/FAMILYID-*.md` to `docs/ip/archive/`
4. Update roadmap to reflect removal

---

## Questions & Troubleshooting

**Q: Should I annotate tests?**
A: Only if the test validates a core IP claim (e.g., provenance integrity, multi-LLM routing correctness). Skip generic unit tests.

**Q: What if a file implements multiple families?**
A: List all relevant family IDs: `// @ip-family: F1,F5,F9`

**Q: What if a family spans 50+ files?**
A: Annotate the top 10-20 most critical files. Use `ip.meta.json` at the package level to aggregate.

**Q: Can I use this for research/experimental code?**
A: Yes, use `@ip-family: FX` (where X is TBD) or `@ip-family: experimental` until you create a registry entry.

---

## Summary

- **Use `@ip-family:` comments** for in-code annotations (TypeScript/JS)
- **Use `ip.meta.json`** for complex multi-file modules
- **Annotate the top 20-30 surfaces** per family (signal > noise)
- **Run `ip-metrics.ts`** quarterly to track coverage
- **Keep annotations up-to-date** during refactors and IP audits

This lightweight system makes IP development **legible, traceable, and acceleratable** without process theater.
