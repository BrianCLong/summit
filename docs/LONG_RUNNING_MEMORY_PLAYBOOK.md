# Long-Running Memory Playbook

This playbook describes how to build and operate durable, long-running project memory inside this codebase. It aligns day-to-day delivery with a persistent program spine, episodic logging, semantic knowledge capture, and a compact working set so that teams can ship faster without losing historical context.

## Objectives
- Preserve intent, decisions, and constraints across long-lived efforts.
- Make retrieval of relevant history fast and reliable for humans and agents.
- Keep the operational surface lean: minimal overhead for contributors while preserving auditability.
- Ensure memory artifacts remain consistent with production behavior (code, infrastructure, policies).

## Memory Model
- **Program spine (structural memory):** Canonical map of missions, projects, workstreams, tasks, owners, SLAs, and decision records. Store as typed, versioned entities (e.g., JSON/YAML in `docs/programs/`, or Postgres tables exposed via the orchestrator) with references to source artifacts and PRs.
- **Episodic project memory:** Time-ordered log of significant events (decision, incident, pivot, failure, validation). Each entry captures situation → action → outcome → uncertainties → next commitments. Suggested locations: `docs/episodes/<program>/<yyyymmdd>-<slug>.md` plus structured copies in the database or event stream.
- **Semantic knowledge & design memory:** Curated patterns and anti-patterns distilled from episodes (e.g., `docs/patterns/`). Each pattern links back to episode IDs and affected code modules, and is versioned with clear applicability conditions.
- **Working set / scratch context:** Small, purpose-built bundles for the current task (e.g., `docs/working-sets/<program>/<task-id>.md`) summarizing only what is needed for the next 1–3 commits. Expire or archive aggressively.

## Operating Practices
1. **Before execution:**
   - Anchor to the program spine: confirm mission, constraints, decision records, and owners are current.
   - Declare the current working set: goals, scope, success metrics, and invariants (security, compliance, SLOs).
2. **During execution:**
   - Record episodes for non-trivial events. Include links to PRs, incidents, tests, feature flags, and rollbacks.
   - Update semantic patterns when you discover a repeatable approach or an anti-pattern. Tie them to episode IDs and code locations.
   - Keep the working set lean; rewrite it as details clarify and remove stale items.
3. **After execution:**
   - Reconcile the program spine with what shipped (owners, status, SLAs, dependencies, decision deltas).
   - Close or archive the working set; capture lessons learned as patterns and update episode logs.
   - Emit checkpoints (artifacts + hashes + metrics) so future agents can diff and replay.

## Implementation Hooks in This Repo
- **Documentation:** Use `docs/programs/`, `docs/episodes/`, `docs/patterns/`, and `docs/working-sets/` folders (create as needed). Mirror critical records in code comments or config (`server/`, `services/`, `ga-graphai/`) where behavior changes.
- **Services & workflows:**
  - Expose program spine and episodes via existing APIs or a small GraphQL/REST façade in `server/` or `services/` for agent and UI retrieval.
  - Stream episode events to the observability pipeline (metrics + traces) and persist to the primary datastore.
  - Add IDs/links to commit messages and PR templates so code references back to spine and episodes.
- **Storage & schema:** Prefer append-only logs for episodes; use relational tables or typed YAML/JSON for the spine. Include migrations and validation hooks in CI (`npm run lint` / `npm test`).
- **Governance:** Define invariants (security, privacy, SLOs) in the spine and enforce them via policy checks in CI/CD. Reject deployments when spine state is stale or missing required links.

## Quality & Observability
- **Checks:**
  - Lint structured artifacts (YAML/JSON) and validate schema conformance during CI.
  - Require coverage for new retrieval or governance logic (≥80%).
  - Add synthetic tests that exercise episode ingestion and retrieval paths.
- **Telemetry:**
  - Emit counters for episode creation, retrieval latency, and policy violations.
  - Add traces around memory reads/writes, including success/failure tags for reconciliation steps.
  - Log reconciliation actions (what spine fields changed, which episodes were linked, who approved).

## Forward-Looking Enhancements
- **Automated retrieval planning:** Use embedding indexes over episodes/patterns to pre-fetch the top-N relevant artifacts per task and attach them to the working set.
- **Predictive drift detection:** Periodically compare program spine intents to production signals (deployments, incidents, SLOs) and surface divergences as alerts.
- **Trusted execution:** Sign checkpoints and episode bundles (e.g., Sigstore/Cosign) so agents can verify provenance before use.
- **Human-in-the-loop curation:** Add lightweight review queues for new patterns and decision records to keep the spine authoritative.

## Minimal Adoption Checklist
- [ ] Create the four folders (`programs`, `episodes`, `patterns`, `working-sets`) with ownership and SLAs.
- [ ] Add program spine records for active missions and link current projects/workstreams.
- [ ] Start episodic logs for ongoing efforts; link new PRs and incident reports.
- [ ] Stand up retrieval endpoints (or reuse existing ones) and add schema validation to CI.
- [ ] Enable telemetry for episode CRUD and reconciliation; set SLOs for retrieval latency.
- [ ] Review and publish at least two patterns per milestone, tagged to episodes and code paths.

Adopting this playbook will provide durable, queryable memory that keeps long-running programs aligned, auditable, and faster to execute.
