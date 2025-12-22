# Task Set 2: Advanced Epics for Forward Exploit Resistance and Resilience

This task set captures the next six epics (7–12) focused on signal fusion, adversary emulation, privacy controls, exposure-aware asset management, supply chain integrity, and adaptive access.

## Epic 7: Signal Fusion & Threat Correlation Layer
Goal: Move from isolated alerts to campaign-aware insights.
- Build TTP-to-signal correlation maps (across EDR/NDR/Cloud/IAM).
- Normalize telemetry UUIDs (users, devices, sessions) for linking.
- Enable graph-based joins of identity + network + asset trails.
- Apply TTP clustering to detect lateral movement and pivoting.
- Auto-prioritize alerts based on blast radius and campaign overlap.
- Design a fusion dashboard (alerts → sessions → assets).
- Feed correlated threats into SOAR with enriched context.

## Epic 8: Adversary Emulation & Threat-Informed Defense
Goal: Build confidence in defenses via adversary simulation.
- Identify top 5 threat actors by vertical/geography from intel feeds.
- Select ATT&CK chains and techniques used by those actors.
- Develop lab-safe adversary emulation chains (manual + atomic).
- Execute across dev/test, capture telemetry, and validate detections.
- Use results to patch detection gaps or elevate telemetry depth.
- Store findings in an attack simulation registry (with results and fix status).
- Run quarterly tabletop or purple team exercises.

## Epic 9: Privacy & Data Exposure Control
Goal: Ensure data minimization and exposure control at source.
- Classify data fields (PII/PHI/PCI/etc.) and tag in schema.
- Build retention and masking policies enforced via OPA or pipeline rules.
- Apply differential privacy or tokenization where applicable.
- Inventory all analytics dashboards and public links; remove or expire as needed.
- Enforce opt-in-by-default for high-risk exports/logs.
- Run periodic scans for publicly exposed data (buckets, docs).
- Publish live data access and exposure map.

## Epic 10: Exposure-Aware Asset Inventory
Goal: Align security effort with exposure and value.
- Build a live asset graph (cloud, on-prem, SaaS, endpoints).
- Score assets by exposure (external/internal), sensitivity, and criticality.
- Auto-assign owners to all assets (people or teams).
- Track configuration drift against hardened baselines.
- Set TTLs on ephemeral/test resources and auto-remove stale items.
- Monitor cloud resource misconfigurations in CI/CD.
- Power a dashboard showing risk-weighted asset priority.

## Epic 11: Build & Supply Chain Integrity
Goal: Detect tampering early; prevent unsigned artifacts from reaching prod.
- Enforce SLSA Level 2+ build provenance requirements.
- Sign all critical artifacts (binaries, containers) using cosign/rekor.
- Require SBOMs for all third-party and internal builds.
- Diff SBOMs weekly for drift or new high-risk dependencies.
- Alert on unsigned or deviant build artifacts in CI/CD.
- Create a CI/CD gate with policy enforcement (OPA/Rego).
- Rotate secrets and tokens in build pipelines quarterly.

## Epic 12: Adaptive Access & Behavior-Based Controls
Goal: Move from static policies to risk-adaptive, behavior-aware enforcement.
- Log all session risk signals (IP reputation, geo, velocity, method).
- Build behavior baselines per user or group.
- Flag anomaly types: unusual login time, volume, geo-shift, or method shift.
- Add adaptive access rules (step-up auth, deny, alert).
- Trigger SOAR playbooks for high-risk behavior scores.
- Feed identity signals into detection pipeline (joined with endpoint/network telemetry).
- Design a behavioral score dashboard with risk-driven control triggers.
