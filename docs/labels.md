# Label Taxonomy & Playbook

This repository uses a structured label taxonomy to track work across Engineering, GTM, and Compliance.
All labels are defined in `scripts/github/labels.sync.json` and synced automatically.

## 1. Lane Labels (Workstream)
*Used to route issues to the correct team board.*

* `lane:bizdev` - Go-to-market, sales enablement, and partnership tasks.
* `lane:pilot` - Pilot deployment requirements and intake.
* `lane:engineering` - Core product engineering.
* `lane:governance` - Compliance, policy, and audit-readiness tasks.

## 2. Product Levels
*Used to indicate which product tier an issue affects.*

* `level:foundation` - Core open-source platform.
* `level:agents` - Agentic capabilities and skills.
* `level:enterprise` - Paid features (SSO, Audit, RBAC).

## 3. Compliance & Governance
*Used to trigger CI gates and compliance checks.*

* `compliance:audit-ready` - Must produce immutable audit logs.
* `compliance:gdpr` - Affects data retention or privacy.
* `security:neverlog` - Flags sensitive data handling (PII/Secrets).

## 4. Automation Status
*Used by agents to signal state.*

* `agent:approved` - Verified by human operator.
* `agent:blocked` - Waiting on human input.

## Syncing Labels
To update labels, edit `scripts/github/labels.sync.json` and run:
```bash
python3 scripts/github/sync_labels.py
```
