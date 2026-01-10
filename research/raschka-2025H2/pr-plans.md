# PR Implementation Plans (Raschka 2025H2)

## Plan 1: Run the Research Intake Pipeline (Ready)

- **Goal**: Convert the provided paper list into `papers.json`, `backlog.csv`, and `backlog.md`.
- **Scope**: Execute the pipeline script; no production services touched.
- **Non-goals**: No model changes; no policy updates.
- **Steps**:
  1. Save the paper list as `research/raschka-2025H2/source.md`.
  2. (Optional) Provide enrichment in `research/raschka-2025H2/enrichment.json` (tags, claims, scores).
  3. Run:
     ```bash
     python tools/research/raschka2025h2_pipeline.py \
       --input research/raschka-2025H2/source.md \
       --enrichment research/raschka-2025H2/enrichment.json
     ```
  4. Review `papers.json` for provenance and `backlog.csv` for ranking.
- **Tests/CI**: `pytest tests/research/test_raschka2025h2_pipeline.py`.
- **Success Metrics**: `papers.json` populated with parsed entries; backlog files updated and non-empty.

## Plan 2: Enrichment + ADR Decisions (Pending Content)

- **Goal**: Add claims, tags, and scoring for each paper; produce 1–3 ADRs with decisions and telemetry.
- **Scope**: Update `research/raschka-2025H2/enrichment.json` and add ADRs under `docs/adrs/`.
- **Non-goals**: No production code changes.
- **Steps**:
  1. Populate enrichment fields (`claim`, `tags`, `scores`, `next_steps`) per paper.
  2. Re-run the pipeline to refresh backlog artifacts.
  3. Draft ADRs with context, decision, alternatives, consequences, and telemetry plans.
- **Tests/CI**: `pytest tests/research/test_raschka2025h2_pipeline.py`.
- **Success Metrics**: Deterministic ranking and ADRs aligned to the research evidence.

## Plan 3: Delivery PRs (Post-Enrichment)

- **Goal**: Convert top P0/P1 backlog items into atomic implementation PRs.
- **Scope**: Bounded to the selected epic zone; update tests and telemetry for each change.
- **Non-goals**: No scope creep across zones.
- **Steps**:
  1. Select top-ranked item(s) from backlog.
  2. Write PR-sized task specs and execute changes.
  3. Run zone-specific tests + `make smoke`.
- **Tests/CI**: Feature tests + `make smoke`.
- **Success Metrics**: CI green with traceable provenance and measurable acceptance criteria.
