# Summit MVP-4 GA Demo Rehearsal Script

**Objective:** To demonstrate the stability, reliability, and operator-grade quality of the Summit platform by executing the "Golden Path" workflow. This script provides a deterministic, rehearsable sequence that aligns with the official readiness claims in `docs/SUMMIT_READINESS_ASSERTION.md`.

**Total Demo Time Budget:** 390 seconds (6 minutes, 30 seconds)

---

## Chapter 1: Environment Bootstrap (Clean State Verification)

**Goal:** Prove the system can be bootstrapped from a clean state reliably.
**Evidence Hook:** See `docs/ga/MVP4_GA_EVIDENCE_MAP.md`, Chapter 1.

| Step | Operator Command(s) | Expected Output Indicator(s) | Fallback Path | Time Budget (s) |
| :--- | :--- | :--- | :--- | :--- |
| 1.1 | `make bootstrap` | `✅ bootstrap complete.` | **If fails:** Execute `pnpm install`. If it persists, pivot to "Failure Playbook: #1 (`pnpm install` hiccups)". | 180 |

---

## Chapter 2: System Activation (Core Services Startup)

**Goal:** Demonstrate the successful activation of the entire Summit stack.
**Evidence Hook:** See `docs/ga/MVP4_GA_EVIDENCE_MAP.md`, Chapter 2.

| Step | Operator Command(s) | Expected Output Indicator(s) | Fallback Path | Time Budget (s) |
| :--- | :--- | :--- | :--- | :--- |
| 2.1 | `make up` | `[+] Running N/N` where N is the number of services. | **If fails:** Check for port conflicts using `lsof -i :<port>`. Pivot to "Failure Playbook: #3 (Port binding conflicts)". | 120 |

---

## Chapter 3: Golden Path Verification (End-to-End Test)

**Goal:** Execute the end-to-end smoke test to verify the core functionality of the platform.
**Evidence Hook:** See `docs/ga/MVP4_GA_EVIDENCE_MAP.md`, Chapter 3.

| Step | Operator Command(s) | Expected Output Indicator(s) | Fallback Path | Time Budget (s) |
| :--- | :--- | :--- | :--- | :--- |
| 3.1 | `make smoke` | `Smoke test passed` | **If fails:** Check service logs (`make logs`). Pivot to "Failure Playbook: #7 (Demo data missing)". | 60 |

---

## Chapter 4: System Shutdown (Graceful Termination)

**Goal:** Show that the system can be shut down cleanly.

| Step | Operator Command(s) | Expected Output Indicator(s) | Fallback Path | Time Budget (s) |
| :--- | :--- | :--- | :--- | :--- |
| 4.1 | `make down` | `[+] Stopping N/N` | **If fails:** Manually stop Docker containers using `docker-compose down`. | 30 |
