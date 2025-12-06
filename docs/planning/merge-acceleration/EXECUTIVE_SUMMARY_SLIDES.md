# Summit: Merge Acceleration & Architectural Consolidation Initiative
**Executive Summary | Q1-Q2 Roadmap**

---

## Slide 1: The Challenge
*   **376 Open PRs**: Velocity killer.
*   **Architectural Drift**:
    *   Duplicate Backends (`server/` vs `apps/server`)
    *   Duplicate Frontends (`apps/web` vs `client/`)
    *   Root Pollution (`server/billing`, `server/ai`...)
*   **Result**: High cognitive load, slow merges, regression risks.

---

## Slide 2: The Mission
1.  **Unify**: One Backend, One Frontend, One Package Manager.
2.  **Stabilize**: Reduce tech debt by 50%.
3.  **Accelerate**: Increase merge velocity by 3x.

---

## Slide 3: Codebase Intel (The Reality)
*   **Core Backend**: `server/` (Node 18, Apollo v5, Neo4j).
*   **Core Frontend**: `apps/web` (React 19, Vite, Tailwind v4).
*   **Legacy/Debt**: `apps/server`, `client/`, `package-lock.json` mixed with `pnpm`.
*   **Critical Risk**: Zod version skew (v3 vs v4) and "Python-Shell" dependencies.

---

## Slide 4: The Strategy (3 Phases)
1.  **Phase 1: Stabilization (Weeks 1-4)**
    *   Auto-close stale PRs (>30 days).
    *   Delete `apps/server` & legacy artifacts.
    *   Enforce `pnpm` and Review Windows.
2.  **Phase 2: Unification (Weeks 5-8)**
    *   Port legacy console to `apps/web`.
    *   Refactor `server/` root structure.
    *   Standardize testing & validation (Zod).
3.  **Phase 3: High Velocity (Weeks 9-12)**
    *   Automated Dependency Management.
    *   Merge Queue Implementation.
    *   Backlog < 50 PRs.

---

## Slide 5: The "Merge Acceleration Protocol"
*   **Review Windows**: Tue/Thu 10am-12pm (All hands on deck).
*   **SLA**: < 48 hours for review.
*   **Triage**: Automated categorization (Docs/Chore = Fast Track).

---

## Slide 6: Immediate Next Steps
*   **Today**: Publish Codebase Report & Standards.
*   **Tomorrow**: Run PR Triage Script.
*   **Next Week**: Begin "Review Windows".

---

**Outcome**: A unified, stable, high-velocity Summit platform ready for scale.
