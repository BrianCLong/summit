# Threat Model Delta - Sprint S-OS-08

**Sprint Goal:** Privileged ops are fail-closed, OPA/ABAC enforced, and every action emits a signed receipt.

## 1. New Assets

- **Provenance Receipts:** Signed JSON blobs serving as non-repudiation evidence.
- **Signing Keys (Notary):** Private keys used to sign receipts. High value target.
- **Approvals DB:** Stores pending and completed approvals with rationale.
- **Audit Logs (Enhanced):** Now strictly immutable and cryptographically linked (via Ledger).

## 2. New Threats

### T1: False Receipt Injection

- **Description:** Attacker injects a fake receipt to cover tracks or frame a user.
- **Mitigation:**
  - Receipts must be signed by the Notary service using a key stored in a secure KMS.
  - Verification logic (`ledger.verify()`) checks signature and chain of custody.
  - **Status:** Mitigation in progress (Notary Adapter v1).

### T2: Approval Bypass

- **Description:** Attacker manipulates the policy engine or workflow to bypass the approval step for high-risk actions.
- **Mitigation:**
  - "Fail-closed" architecture: If policy engine is unreachable or returns error, action is denied.
  - Policy enforcement point (PEP) is in the critical path (Policy Gateway).
  - Receipts must include the `decision_id` and `policy_version` used.
  - **Status:** Core to this sprint.

### T3: Signing Key Compromise

- **Description:** Attacker gains access to the private signing key and can forge receipts.
- **Mitigation:**
  - Key stored in KMS (or simulated secure storage in MVP).
  - Access to key restricted to Notary service via IAM.
  - Key rotation procedures.
  - **Status:** SRE task Day 3.

### T4: Rationale Tampering

- **Description:** Attacker modifies the rationale of an approved action after the fact to change the context.
- **Mitigation:**
  - Rationale is hashed and included in the signed receipt.
  - Any modification breaks the signature or the hash mismatch.
  - **Status:** Day 4 deliverable.

### T5: Dual-Control Collusion

- **Description:** The same user approves their own request, or uses two accounts they control.
- **Mitigation:**
  - Policy `deletes_dual_control.rego` enforces `approver.id != requester.id`.
  - Identity system must prevent one person from holding conflicting accounts (out of scope for sprint, but assumed).
  - **Status:** Day 7 deliverable.

## 3. Assumptions & Dependencies

- The underlying Identity Provider (IdP) is trusted.
- The KMS (or mock) is secure.
- The immutable storage (WORM) for the ledger prevents deletion of receipts.

## 4. Verification Plan

- **Security Unit Tests:** Attempt to verify forged receipts (should fail).
- **Policy Fuzzing:** Test policy with various inputs to ensure no open access by default.
- **Chaos Testing:** Kill the Notary service and ensure privileged ops fail.
