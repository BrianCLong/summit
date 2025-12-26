# Auditor Walkthrough & Q&A
> **Purpose**: Guide the external auditor efficiently through the system.

## 1. Executive Summary
Summit is a **Zero-Trust, Graph-Intelligence Platform**.
We treat Compliance as Code.
* **Control Plane**: OPA + RBAC
* **Data Plane**: Encrypted + Tenant Isolated
* **Audit Plane**: Immutable + Event Sourced

## 2. Architecture "Lite" (For Auditors)
* **Frontend**: React (Read-Only UI)
* **Backend**: Node.js/TypeScript (Enforcement Point)
* **Database**: PostgreSQL (System of Record) + Neo4j (Graph)
* **Identity**: JWT + OPA (Stateless Verification)

## 3. The "Golden Path" Verification
To verify a control, follow this pattern:
1. **Define Policy**: Show `.rego` file.
2. **Show Enforcement**: Show Middleware code.
3. **Show Evidence**: Show Audit Log entry.

## 4. Anticipated Q&A

**Q: How do you prevent developers from pushing bad code?**
A: "Branch protection rules require 1 approval + passing CI. We can't push directly to `main`." (Show `security.yml`)

**Q: What if the database admin deletes a log?**
A: "Postgres Triggers prevent DELETE/UPDATE on audit tables. Plus, we stream logs to WORM storage." (Show `server/src/audit/worm.ts`)

**Q: How do you handle PII in AI prompts?**
A: "We use a PII redaction layer before sending data to LLMs." (Show `server/src/pii/ingestionHooks.ts`)

**Q: How do you know your backups work?**
A: "We run automated restore tests daily in the `dr-verify` pipeline." (Show `scripts/dr-verify.sh`)

## 5. Quick Links
* [Audit Scope](./SCOPE_AND_CONTROLS.md)
* [Risk Register](./RISK_REGISTER.md)
* [Evidence Bundle](./evidence_manifest.json)
