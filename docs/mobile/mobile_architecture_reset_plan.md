# Mobile Architecture Reset & Release Safety Program

## Purpose

This plan turns the 9×11 epic set into a single execution blueprint for rebuilding the mobile stack, ensuring one modern architecture, predictable releases, and production-grade performance, security, and UX. It prioritizes fast wins on the highest-traffic screens while eliminating legacy dual-maintenance.

## Target Architecture

- **Pattern:** MVVM with unidirectional data flow (Redux-style store per module) to balance testability and predictable state.
- **Shared layers:**
  - **Networking:** idempotent HTTP client with retries, deadlines, cache directives, request dedupe, and redaction-aware logging.
  - **Auth:** token/session manager using secure storage (Keychain/Keystore), rotation hooks, device signals, and remote revoke.
  - **Sync:** single offline/sync engine with queued mutations, dedupe keys, conflict policies per entity, and background scheduling/backoff.
  - **Design system:** tokens + primitives + accessibility-first components; navigation conventions (tabs/stacks/modals) and empty/error/undo patterns.
  - **Observability:** crash + ANR capture, RUM for startup/render/API latency, feature-flag exposure logging, release markers.
- **Golden module template:** scaffolds view, view-model, store slice, DI wiring, feature flags, metrics, tests, and kill switches.
- **Automation:** lint/typecheck/unit/UI smoke in CI, reproducible builds, SBOM, provenance, staged rollout hooks, and weekly release train.

## Execution Waves

1. **Foundations (Weeks 0–3)**
   - Land architecture docs and the golden module template (MVVM + store slice + navigation contract).
   - Ship shared networking layer (timeouts, retries, idempotency headers, caching) and centralized auth/session manager.
   - Enable crash/ANR metrics with release markers; add feature-flag service with owner/expiry metadata.
   - Produce dependency hygiene plan (lockfiles/version catalogs, update cadence, SBOM generation).
2. **High-traffic migrations (Weeks 3–7)**
   - Migrate top 2 traffic screens to the new stack using the template; delete legacy scaffolding post-migration.
   - Introduce performance budgets (startup, frame drops) enforced in CI; add image optimization and list rendering improvements.
   - Deliver offline/sync engine with queue + replay + conflict resolution for priority entities; surface “last synced” indicators.
3. **Scale & safety (Weeks 7–12)**
   - Expand design system coverage, UX regression tests, and accessibility checks.
   - Harden release safety: automated signing, versioning, release notes, staged rollout playbooks, rollback drills, and canary/beta loops.
   - Add support diagnostics export, incident runbooks, and monthly GameDay exercises (API outage, auth failure, sync corruption).
4. **Continuous improvement (12+ weeks)**
   - Quarterly dependency audits, security reviews, and performance/battery hardening sprints.
   - Track change failure rate, MTTR, crash-free %, ANR %, startup p95, API p95, sync success, and battery regressions.

## Deliverables by Epic

- **Architecture & templates (Epics 1, 9.9, 8.9):** Golden module template, navigation conventions, DI, test harness, and codegen hook for new modules.
- **Networking & auth (Epics 1.3–1.4, 4, 5):** Shared client with retries/backoff, idempotency headers, caching; centralized auth with secure storage, rotation, remote revoke, and device integrity signals.
- **Design system & UX (Epics 1.5, 6):** Token library, primitives, accessible components, error/empty/undo patterns, dynamic type, and haptics/animation guidance.
- **Release safety (Epic 2):** CI with fast unit/UI smoke, automated signing/versioning/notes, staged rollout with rollback playbooks, release envelopes, crash/perf markers, reproducible artifacts.
- **Performance & battery (Epic 3):** RUM for startup/render/API latency/scroll jank; image caching policy; pagination/delta sync; background work minimization; performance budgets enforced in CI.
- **Offline & sync (Epic 4):** Unified sync engine with dedupe keys, conflict policies, background scheduling, reconciliation checks, queue + replay, sync timeline UI, corruption GameDay.
- **Security & privacy (Epic 5):** Secure storage, screenshot/recents redaction, certificate pinning (or strict TLS), encrypted local DB where needed, privacy-safe analytics, permission minimization, incident playbook.
- **Observability & diagnostics (Epic 7):** Crash reporting with symbolication, performance tracing linked to backend correlation IDs, network failure capture, diagnostics export, dashboards, alerting, feature-flag exposure logging, incident runbooks.
- **Dependency hygiene (Epic 8):** Version catalogs/lockfiles, automated update PRs with tests, license scanning, SBOM, provenance, static analysis gates, quarterly audit and cleanup.
- **GTM & adoption (Epic 9):** Value-moment instrumentation, push/deep link strategy, onboarding templates, in-app feedback, A/B testing guardrails, cohort retention tracking, ROI reporting.

## First 30-Day Action Plan

- Ratify MVVM + Redux-style store as the single pattern; publish module template and navigation contract.
- Build shared networking client and auth/session manager; integrate into the first migrated screen.
- Stand up feature-flag service with ownership/expiry; add kill switches for payment/auth flows.
- Enable crash/ANR reporting with release markers; add RUM for cold start and top API calls.
- Begin migration of the highest-traffic screen; delete legacy code after parity verification.
- Establish weekly release train with staged rollout and rollback checklist; add build provenance and SBOM generation to CI.

## Risk Mitigation & Proof Points

- **No dual-maintain:** Delete legacy module immediately after migrated screen ships behind a guarded flag.
- **Safety nets:** Feature flags + kill switches for critical flows; release envelopes for high-risk changes.
- **Quality gates:** CI enforces lint/typecheck/unit + UI smoke; performance budgets block regressions; quarterly rollback and corruption GameDays.

## Innovation Track

- **Predictive prefetch + battery-aware scheduling:** Use on-device heuristics (recent nav graph, connectivity, battery level) to prefetch caches only when cheap, combining with sync dedupe keys to avoid over-fetching.
- **State-aware tracing:** Propagate correlation IDs through the store to link UI events, network calls, and sync operations for faster incident triage.
