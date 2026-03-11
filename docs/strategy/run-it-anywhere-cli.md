# Summit Run-It-Anywhere CLI Strategy (Zero-Adoption Value)

## Summit Readiness Assertion

Summit accelerates adoption by delivering architecture intelligence before integration. The CLI must produce useful, defensible insights on first execution against any repository input: local path, GitHub URL, or Git URL.

## Product Decision

**Decision 4 (Adoption Catalyst):** `npx summit-intel analyze <repo>` is a first-class product surface, not a future integration feature.

This turns Summit from an enterprise rollout into an immediately shareable developer utility.

## North-Star Experience

```bash
npx summit-intel analyze ./repo
npx summit-intel analyze https://github.com/vercel/next.js
npx summit-intel analyze git@github.com:kubernetes/kubernetes.git
```

Output contract:

```text
Repository Intelligence
-----------------------
Modules analyzed: 1,208
High-risk dependency clusters: 7
Architecture health: 72 / 100
CI instability probability: 54%
```

## Design Contract (MVP)

1. **Input Resolver**
   - Accepts local path, HTTPS GitHub URL, SSH Git URL.
   - Canonicalizes target and creates deterministic workspace cache key.
2. **Repository Acquisition**
   - Local repos are analyzed in place (read-only mode).
   - Remote repos are shallow-cloned with optional depth escalation.
3. **Architecture Graph Builder**
   - Builds language-agnostic module and dependency graph.
   - Enforces deterministic ordering and bounded traversal limits.
4. **Risk + Health Analysis**
   - Computes architecture health score, coupling hotspots, and dependency risk clusters.
   - Produces confidence and evidence budget metadata.
5. **Report Renderer**
   - Human-readable terminal summary.
   - Optional JSON artifact for CI reuse.

## CLI Spec

```bash
summit-intel analyze <target> [options]

Options:
  --format text|json            Output format (default: text)
  --evidence-budget <n>         Max graph traversal budget
  --max-modules <n>             Hard limit for module scan
  --cache-dir <path>            Local cache path
  --timeout-ms <n>              Analysis timeout
  --emit-artifact <path>        Write JSON report
```

## Architecture & Governance Alignment

### MAESTRO Layers

- **Foundation**: deterministic execution and cache discipline.
- **Data**: repository acquisition and graph construction.
- **Agents/Tools**: CLI orchestration and analyzer execution.
- **Observability**: command duration, module counts, risk distributions.
- **Security**: safe clone/read behavior, no credential leakage.

### Threats Considered

- Prompt injection via malicious repository text artifacts.
- Tool abuse via hostile Git URLs or oversized repositories.
- Denial-of-service via pathological dependency graphs.

### Mitigations

- Treat repository content as untrusted data; never execute repository scripts.
- Restrict protocol and target parsing with explicit allow-list semantics.
- Enforce evidence budgets, module caps, and timeout ceilings.
- Emit explicit constrained/deferred states when limits trigger.

## 30-Day Public Launch Roadmap

### Week 1 — CLI Spine + Input Support

- Ship `analyze` command skeleton and target resolver.
- Add local path + GitHub URL + Git URL support.
- Add text renderer with baseline health/risk fields.

### Week 2 — Graph + Scoring

- Implement deterministic module/dependency graph extraction.
- Add architecture health scoring and dependency cluster detection.
- Add regression fixtures on open-source repositories.

### Week 3 — Reliability + Evidence

- Add JSON artifact output and confidence metadata.
- Add timeout/evidence-budget enforcement and constrained-state messaging.
- Instrument command timings and error taxonomies.

### Week 4 — Distribution + Growth Loop

- Publish npm package and docs landing page.
- Add share-ready output mode and reproducibility hash.
- Ship benchmark examples on notable repos (e.g., `next.js`, `kubernetes`).

## Success Metrics

- **Activation**: time-to-first-report under 3 minutes on medium OSS repos.
- **Shareability**: >30% of first-run sessions export text or JSON artifacts.
- **Reliability**: >95% successful completion on supported public repositories.
- **Signal quality**: architecture health score stability variance within defined threshold.

## Rollback Plan

If remote acquisition or scoring quality degrades:

1. Keep local-path analysis enabled.
2. Temporarily gate remote clone support behind a feature flag.
3. Revert to baseline static risk heuristics while graph scorer patch is validated.
4. Re-ship once determinism and completion SLOs return to target.
