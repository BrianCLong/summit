# Summit Product Strategy: "Actionability + Provability"

## ICP (Ideal Customer Profile) Focus

For the initial Go-To-Market wedge, we are targeting **Enterprise CTI / SOC** and **Regulated Investigations/Legal** teams.
These groups suffer from "opaque scoring" and require undeniable, audit-grade proof for actions (takedowns, blocking, reporting).

## The Wedge: "Provable Intelligence"

While competitors like Recorded Future offer broad integrations and risk lists, Summit differentiates on **deterministic, verifiable chain-of-custody**. Every alert and risk score is explainable down to the captured raw artifacts, with cryptographic signatures ensuring integrity.

## MVP Scope (Deal-Winning Demo Path)

* **Brand Takedown Use Case**: A seamless workflow demonstrating typosquat detection, automated screenshot capture, DNS/certificate analysis, and the generation of a signed evidence bundle ready for legal submission.
* **Vulnerability Prioritization**: Weekly patch lists enriched with deterministic scoring based on explainable lifecycle stages, not opaque vendor algorithms.

## Competitive Battlecard (vs. Recorded Future / SpiderFoot)

| Feature | Summit | Recorded Future | SpiderFoot |
| :--- | :--- | :--- | :--- |
| **Integrations** | Native (SIEM, SOAR, Ticketing) | Extensive | Broad (CLI/UI focused) |
| **Scoring** | Explainable, Deterministic | Proprietary, Opaque | Rule-based |
| **Evidence** | Cryptographically Signed Bundles | Enriched Artifacts | Raw Exports |
| **Replayability**| Full Offline Replay (Air-gapped) | No | No |
| **Custom Rules** | User-editable, Sandboxed | Playbooks | YAML Rules |

## Definition of Done (DoD) Metrics

* **Provable Action Latency (PAL)**: Time from detection to downstream action *with* a complete, signed evidence bundle.
* **Actionability Rate**: Percentage of findings that trigger a downstream action (e.g., Jira ticket, SOAR playbook).
* **Reproducibility Score**: Percentage of analytical pipelines that are hash-stable under replay.
