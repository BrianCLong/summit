# Chaos & Tabletop Simulation Framework

## 1. Objective

To empirically verify Summit's isolation and containment guarantees. We move from "we think it's secure" to "we proved it held up."

**Frequency:** Bi-weekly (Automated) / Quarterly (Human Tabletop).

---

## 2. The Simulation Suite (5 Scenarios)

These scenarios must be executable by engineers using standard tooling (CLI, Scripts).

### Scenario 1: The "Peeping Tom" (Cross-Tenant Access)

- **Goal:** Prove Tenant A cannot read Tenant B's data via API or DB.
- **Action:**
  1.  Create Tenant A and Tenant B.
  2.  Insert Document X into Tenant B.
  3.  Authenticate as User A.
  4.  Attempt `GET /api/documents/{id_of_X}`.
  5.  Attempt direct SQL injection pattern in search endpoint.
- **Expected Result:**
  - API returns `404 Not Found` (preferred) or `403 Forbidden`.
  - **Evidence:** API Logs showing denial.

### Scenario 2: The "Infinite Loop" (Agent Resource Exhaustion)

- **Goal:** Prove a runaway agent doesn't take down the worker node.
- **Action:**
  1.  Deploy a "Bad Agent" with a prompt: "Repeat the word 'echo' forever."
  2.  Trigger the run.
- **Expected Result:**
  - Run terminates with `LIMIT_EXCEEDED` (Tokens or Time).
  - Worker process remains healthy for other jobs.
  - **Evidence:** `JobFailed` event in `BatchJobService`.

### Scenario 3: The "Credential Leak" (Key Rotation)

- **Goal:** Verify compromised keys can be killed instantly.
- **Action:**
  1.  Generate a valid JWT for User A.
  2.  Verify access works.
  3.  Call `AuthService.revokeAllTokens(UserA)`.
  4.  Attempt access with the same JWT.
- **Expected Result:**
  - Immediate `401 Unauthorized`.
  - **Evidence:** Auth logs showing token rejection.

### Scenario 4: The "Graph Bomb" (Query Complexity)

- **Goal:** Prevent complexity attacks on Neo4j.
- **Action:**
  1.  Send a Cypher query seeking a massive Cartesian product (unbounded expansion).
- **Expected Result:**
  1.  Query times out after 5 seconds (DB Config).
  2.  User receives `400/504`.
  3.  DB CPU usage spikes briefly but returns to baseline.
  4.  **Evidence:** Neo4j Query Log showing termination.

### Scenario 5: The "Policy Bypass" (CI/CD)

- **Goal:** Ensure bad config cannot be deployed.
- **Action:**
  1.  Open a PR that changes `allow_public_access: false` to `true` in OPA policy.
  2.  Or try to merge code without 2 reviews.
- **Expected Result:**
  - CI Pipeline Fails (`conftest` check).
  - Branch protection blocks merge.
  - **Evidence:** Github Actions failure log.

---

## 3. Governance & Escalation

### Tier-4 Boundaries (Protected)

Changing these requires **CTO/CISO Approval**:

1.  Disabling RLS on Postgres.
2.  Changing AuthZ Middleware logic.
3.  Modifying OPA Policy definitions.
4.  Granting "Super Admin" roles.

### Audit Requirements

All Chaos Tests generate an **Evidence Artifact**:

- `chaos-report-{date}.json`
- Contains: Scenario ID, Pass/Fail, Logs, Timestamp.
- Stored in: `server/src/compliance/evidence/` (Simulated WORM).

---

## 4. Execution Guide (How-To)

To run the automated suite:

```bash
# Run the Tabletop Suite (Integration Tests)
npm run test:chaos

# Expected Output:
# [PASS] Scenario 1: Cross-Tenant Isolation
# [PASS] Scenario 2: Resource Quotas
# ...
```

_(Note: `test:chaos` maps to a specific Jest suite in `server/tests/chaos/`)_
