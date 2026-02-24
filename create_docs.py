import os

repo_assumptions_content = """# Repo Assumptions: Narrative IO Inference & Convergence

## Verified
- Workflows: `.github/workflows/*`
- Scripts: `.github/scripts/*` (Note: scripts/ directory used instead)
- Policies: `.github/policies/*` (Note: policies/ directory used instead)
- Code: `src/api/*`, `src/agents/*`, `src/connectors/*`, `src/graphrag/*` (Note: `src/narrative` added)
- Docs: `docs/architecture/*`, `docs/api/*`, `docs/security/*`

## Assumed & Validated
- Narrative representation: Graph nodes + embeddings (confirmed by `src/narrative` structure).
- Evidence ledger: `summit_evidence` or `evidence/` directory exists.
- Test runner: `jest` (verified).
- Fixtures: `tests/narrative/fixtures` (verified).

## Validation Checklist
- [x] Locate narrative pipeline entrypoints (`src/agents/*` and `src/graphrag/*`)
- [x] Identify embedding store + similarity primitives (vector DB, cosine, etc.)
- [x] Confirm any existing taxonomy schema (e.g., frames, themes, stances)
"""

standards_content = """# Standards: Narrative IO Inference & Convergence

## Imports
- Corpus snapshots (Summit’s existing ingestion)
- Optional metadata: timestamps, actor IDs, platform hints

## Exports
- Deterministic JSON evidence pack (`interpretive_defaults.json`, `redundancy_clusters.json`, `convergence.json`)
- Optional graph updates (narrative nodes/edges) via `src/graphrag/*`

## Non-goals
- No censorship / automated takedown logic
- No “truth adjudication”
- No demographic inference; no targeting individuals
"""

security_content = """# Security: Narrative IO Inference & Convergence (Data Handling)

## Threat Model & Mitigations

1. **Weaponization for targeted persuasion**
   - **Mitigation:** Require analysis outputs at **aggregate** level (cluster-level).
   - **Gate:** CI schema denies `user_id` sinks.
   - **Test:** Fixture attempting to include per-user microtargeting fails.

2. **Overconfident attribution**
   - **Mitigation:** Enforce confidence calibration + “unknown” class; require evidence pointers.
   - **Gate:** Unit test rejects missing evidence refs.

3. **Prompt/LLM hallucination in inference extraction**
   - **Mitigation:** Deterministic extractor must be **rule+model hybrid** with “extracted spans + rationales” required.
   - **Gate:** Test ensures every inferred default links to supporting text spans.

4. **Privacy leakage**
   - **Mitigation:** PII redaction in evidence pack; never store raw full text unless permitted.
   - **Gate:** Fixture with emails/tokens produces redaction report.
"""

ops_content = """# Runbook: Narrative IO Inference & Convergence

## Execution
Run analysis on a daily snapshot:
```bash
pnpm run narrative:analyze -- --in tests/narrative/fixtures/day0.json --out /tmp/out
```

## Interpretation
- **Convergence Direction:** Vector alignment of implied narratives. High cosine similarity indicates convergence.
- **Consensus:** Agreement on explicit claims. Distinct from convergence (agreement on implicit assumptions).
- **Redundancy:** Structural similarity without lexical overlap. High redundancy + low lexical overlap = coordinated messaging.

## Tuning
- Adjust `similarity_threshold` in `src/narrative/redundancy/similarity.ts` if false positives occur.
- Adjust `inference_confidence` threshold if defaults are too noisy.

## Determinism
- Ensure `seeded` random number generator is used.
- Sort all outputs by stable keys (e.g., ID) before hashing.
"""

competitive_content = """# Competitive Positioning: Narrative IO Inference & Convergence

## Positioning
- Many systems detect **keywords/claims**; Summit adds **implicit-default + structural redundancy + long-horizon identity** detection.
- **Constraint:** Summit claims **detection support**, not intent proof.

## Differentiation
- **Interpretive Defaults:** Extracts what is *presupposed*, not just what is said.
- **Structural Redundancy:** Detects same logic in different words (e.g., metaphors).
- **Identity Tracking:** Tracks narrative evolution over time (mutations).
"""

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as f:
        f.write(content)
    print(f"Created {path}")

def main():
    write_file('docs/governance/repo_assumptions.md', repo_assumptions_content)
    write_file('docs/standards/narrative-io-inference-convergence.md', standards_content)
    write_file('docs/security/data-handling/narrative-io-inference-convergence.md', security_content)
    write_file('docs/ops/runbooks/narrative-io-inference-convergence.md', ops_content)
    write_file('docs/governance/competitive/narrative-io-inference-convergence.md', competitive_content)

if __name__ == "__main__":
    main()
