# Cloud Sector Defense Runbook - Enterprise Reality

> **Operating Reality**: Enterprise SaaS Platform with Agentic AI
> **Focus**: Identity Containment, Egress Gates, Proxy Churn, and Model Serving Hardening.

---

## P0: Today / 72 Hours (Containment & Visibility)

### 1. Identity-First Containment
*   **Action**: Ensure global session revocation works across the platform.
*   **Summit Context**: `AuthService.ts` implements a `logout(userId, currentToken)` method that revokes all refresh tokens and blacklists the current access token.
*   **Checklist**:
    - [ ] Trigger global logout for a test user.
    - [ ] Verify access token is blacklisted and `verifyToken` rejects it.
    - [ ] Verify refresh token rotation is halted for that user.
*   **Gate**: **Global logout works and is tested** (verified via `AuthService.test.ts`).

### 2. New-Domain + New-Storage Egress Controls
*   **Action**: Implement alerting for "first-seen domain" and large outbound transfers.
*   **Summit Context**: K8s network policies in `mesh-data` (see `30-data-plane.yaml`) enforce default-deny. Egress is limited to allowlisted endpoints.
*   **Checklist**:
    - [ ] Audit `allow-egress-external-allowlisted` for overly broad rules.
    - [ ] Integrate egress volume monitoring into `alerts.yaml`.
*   **Gate**: **“First-seen domain” alert to triage ≤ 15 minutes**.

### 3. Email + Browser Isolation for Risky Content
*   **Action**: Enforce "unknown doc → isolate render" for privileged roles.
*   **Summit Context**: Ingestion pipeline should use isolated worker pods for document detonation/sanitization.
*   **Checklist**:
    - [ ] Verify `docling` or other ingest services run in restricted `workload-type: sandbox` pods.
*   **Gate**: High-risk attachments detonation confirmed in isolated environment.

### 4. Proxy Churn Readiness
*   **Action**: Use adaptive auth (reputation + impossible travel).
*   **Summit Context**: `AuthService` tracks `last_login` and `last_ip`.
*   **Gate**: Bot mitigation that doesn’t lock out legitimate roaming users.

---

## P1: This Week (Hardening)

### 5. Zero-Trust Egress for Crown Jewels
*   **Action**: Strict default-deny outbound for systems holding secrets or customer data.
*   **Summit Context**: Enforced via `00-default-deny.yaml` and specific `mesh-storage` policies.
*   **Gate**: “Unknown outbound connection attempts” trend to near-zero.

### 6. Segregate Model-Serving Planes
*   **Action**: Treat inference servers as untrusted compute.
*   **Summit Context**: Inference runs on `ml_workloads` nodes in `mesh-data` namespace.
*   **Checklist**:
    - [ ] Verify `ml_workloads` pods have no direct access to `mesh-storage` secrets or production DBs except via authorized proxies.
*   **Gate**: **RCE on inference server cannot reach secrets.**

---

## P2: This Quarter (Governance)

### 7. Tool-Using Agents: Least Privilege + Approvals
*   **Action**: Scoped credentials and human approval for destructive actions.
*   **Summit Context**: Governed by `Constitution.md` and `AGENTS.md`. Tool calls must be audited in the `provenance-ledger`.
*   **Checklist**:
    - [ ] Implement `EvidenceBudget` and `IntentCompiler` for all agent retrieval/action logic.
*   **Gate**: Full replayable audit trail for every tool call.

---

## Acceptance Criteria
1.  **Time-to-revoke ≤ 10 minutes** from declaration.
2.  **Zero unauthorized egress** from `mesh-data` workloads.
3.  **100% Provenance** for all agent-mediated tool executions.
