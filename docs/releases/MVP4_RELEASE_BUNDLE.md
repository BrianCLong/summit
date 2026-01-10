# MVP-4 Release Artifact Bundle

**Release Identity**
* **Release Name**: MVP-4 GA
* **Status**: GOLD
* **Commit**: `3bdd8370e1c1cc6137220065fc627f8c66429d4a`
* **Branch**: `jules-10662408581345938345-7889584c`
* **Date**: 2025-12-30

---

## 🛑 One-Command Proof

To verify the hard-gate for this release:

```bash
make ga-verify
```

---

## 📚 Canonical Documents

### Core Release Artifacts
* **[GA Baseline & Verification Matrix](../ga/MVP4-GA-MASTER-CHECKLIST.md)**: The single source of truth for release readiness.
* **[Release Notes & Readiness Report](../ga/RELEASE-READINESS-REPORT.md)**: Detailed feature status and gap analysis.
* **[Release Bundle Checklist](./MVP4_RELEASE_BUNDLE_CHECKLIST.md)**: Verification of this bundle's completeness.

### Evidence & Governance
* **[Evidence Map (Markdown)](../ga/EVIDENCE_SECURITY.md)**: Human-readable map of security controls and evidence.
* **[Evidence Map (Canonical)](../ga/verification-map.json)**: Machine-readable verification schema.
* **[Security Ledger](../security/SECURITY-ISSUE-LEDGER.md)**: Authoritative record of security findings and resolutions.
* **[Risk Register](../risk/RISK_LEDGER.md)**: Known risks and mitigation plans.

### Trust & Operations
* **[Trust Dashboard](../release/GA_DASHBOARD.md)**: Live view of release health and trust metrics.
* **[Ops Cadence](../RELEASE_CADENCE.md)**: Release cycles, maintenance windows, and frozen zones.
* **[Sunset Policy](../governance/SHUTDOWN_PLAYBOOK.md)**: End-of-life and shutdown procedures.
* **[Demo Narrative](../releases/MVP-4_DEMO_SCRIPT.md)**: Official script for validation demos.

---

## 🧭 Operator Paths

### 👔 Executive Summary
* **Start here**: [Release Readiness Report](../ga/RELEASE-READINESS-REPORT.md)
* **Then read**: [Trust Dashboard](../release/GA_DASHBOARD.md) for current health.

### 🕵️ Auditor Path
* **Step 1**: Run `make ga-verify` to confirm baseline integrity.
* **Step 2**: Inspect the [Evidence Map](../ga/EVIDENCE_SECURITY.md).
* **Step 3**: Review the [Security Ledger](../security/SECURITY-ISSUE-LEDGER.md).

### 🛠️ Customer Zero Engineer (Repro)
* **Start**: [GA Baseline](../ga/MVP4-GA-MASTER-CHECKLIST.md)
* **Command**: `make ga-verify`
* **Reference**: [One-Command Proof](#one-command-proof) above.

### 🖥️ Operator
* **Daily**: Check [Trust Dashboard](../release/GA_DASHBOARD.md).
* **Weekly**: Follow [Ops Cadence](../RELEASE_CADENCE.md).
* **Emergency**: See [Shutdown Playbook](../governance/SHUTDOWN_PLAYBOOK.md).

### 🛡️ Security Reviewer
* **Gate**: [Security Ledger](../security/SECURITY-ISSUE-LEDGER.md)
* **Verification**: `make ga-verify`
