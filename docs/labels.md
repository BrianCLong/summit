# Summit Label Taxonomy

This repository uses a structured label system to align engineering work with business goals (Summit Levels) and GTM stages.

## Business Lanes (`lane:*`)
- **`lane:bizdev`**: Tasks related to go-to-market, sales enablement, or customer success.
- **`lane:pilot`**: Work specifically required for an active pilot customer.
- **`lane:enterprise`**: Features or hardening required for large-scale enterprise deployments.
- **`lane:partner`**: Integrations or enablement for the partner ecosystem.

## Product Tiers (`tier:*`)
Reflecting the [Summit maturity model](https://www.summitai.cloud):
- **`tier:foundation`**: Core platform, data ingestion, graph infrastructure.
- **`tier:agents`**: Multi-agent orchestration, specific agent capabilities, and cognitive skills.
- **`tier:enterprise`**: Sovereignty, compliance, audit logging, and RBAC/governance controls.

## Standard Engineering Labels
- **`type:*`**: `bug`, `feature`, `chore`, `security`, `docs`.
- **`priority:*`**: `P0` (Blocker) to `P3` (Backlog).
- **`area:*`**: `frontend`, `backend`, `infrastructure`, `ai`.
