1. One-sentence vision for Summit in 2026
An air-gapped-capable, GPU-accelerated open OSINT platform that fuses graph analytics, LLM copilots, and secure federation to rival Palantir-class tooling while staying deployable in 5 minutes anywhere.

2. Three strategic objectives (north stars)
- Become the default open-source graph+LLM OSINT workbench for investigators, threat intel, and red teams across on-prem, cloud, and disconnected edge sites.
- Deliver trust: provable provenance, reproducible analytics, and security-hardening that passes IC/DoD-style evaluations without sacrificing operator speed.
- Build an extensible ecosystem: plugins, data connectors, and workflows that let teams compose their own tradecraft without vendor lock-in.

3. Prioritized roadmap (6–12 months)
| Rank | Epic | Why it matters (impact) | Effort (S/M/L/XL) | Owner role needed | Blockers / Dependencies | Target quarter |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Air-gapped deployable baseline (installer, images, infra as code) | Preserves 5-minute golden path for IC/DoD and corporate enclaves; unlocks evaluations and field pilots | L | Platform/DevOps | Finalize hardened base OS/container images; validate Terraform/Helm modules per environment | Q2 |
| 2 | Secure LLM copilot and retrieval layer (on/offline) | Closes LLM gap with retrieval-augmented workflows for graph queries, briefings, and drafting; must work offline or with on-prem GPU | XL | ML Platform + Graph Lead | GPU scheduling story, model licensing review, vector store selection; needs GPU CI lane | Q2–Q3 |
| 3 | Federation + cross-domain ingestion mesh | Enables multi-source OSINT fusion (open web, gov feeds, corp telemetry) with policy-aware ingest; core differentiator vs notebooks | L | Data Platform | Connector catalog, schema contracts, and policy engine alignment (OPA/ABAC) | Q2–Q3 |
| 4 | Provenance, auditing, and chain-of-custody | Required for LE/IC acceptance; supports legal defensibility and red-team forensics | M | Security/Compliance Engineer | Log schema, evidence store, signed artifacts (C2PA/Sigstore) | Q2 |
| 5 | Offline-first/mobile field kit | Serves investigators/red teams in denied/low-connectivity environments; competitive advantage vs cloud-only tools | L | Mobile/Edge Engineer | Depends on Epic 1 packaging and Epic 2 offline models | Q3 |
| 6 | Investigations UI 2.0 (graph+timeline workspace) | Improves analyst velocity and adoption; parity with Gotham/Analyst’s Notebook experiences | L | Product Design + Frontend Lead | Needs UX research with OSINT.community/Bellingcat; depends on graph query API stability | Q3 |
| 7 | Plugin & workflow marketplace (signed, sandboxed) | Builds ecosystem and community contributions; enables custom tradecraft without forks | M | Platform/SDK Engineer | Requires Epic 4 signing + sandbox model; versioning and manifest spec | Q3 |
| 8 | Red-team/blue-team simulation pack | Provides canned adversary/emulation workflows to prove value in corporate threat-intel and training | M | Security Content Engineer | Leverages Plugin system + LLM copilot; legal review for datasets | Q3–Q4 |
| 9 | Performance & scale-hardening (monorepo, GPU, load) | Ensures reliability for large teams; reduces ops pain and flakiness; keeps 5-minute path intact | M | DevEx/Infra | Requires profiling, test coverage uplift, and queuing for GPU jobs; monorepo build caching | Q2–Q4 |
| 10 | Compliance + export controls toolkit | Speeds procurement and regulated deployments (CJIS/ITAR-like); differentiator for LE contracts | S | Compliance/Legal + SecEng | Depends on Provenance logging and hardened images; policy templates | Q4 |
| 11 | Discoverability + docs-for-ops (runbooks, golden paths) | Reduces adoption friction; necessary for community scale and field deployments | S | Developer Relations | Needs stable CLIs/Helm charts; align with Epics 1 & 3 | Q2–Q4 |
| 12 | Enterprise support channel + telemetry opt-in | Creates sustainability path and feedback loop; optional secure call-home with privacy controls | M | Customer/DevRel Lead | Requires governance and data minimization review | Q4 |

4. Non-functional imperatives (apply to every epic)
- Air-gap ready: no hard cloud dependencies; offline package mirrors and model artifacts; deterministic builds.
- Security-first: FIPS-ready crypto, SSO/SAML/OIDC, MFA, ABAC/OPA enforcement, signed binaries/images, SBOM+SLSA provenance, default deny egress.
- Observability: structured audit logs, red/blue friendly alerting, minimal-to-zero PII retention; runbooks for incident response.
- Performance: GPU-aware scheduling, backpressure for ingestion, graph query budgets, and sub-300ms UI interactions for common tasks.
- Deployable-first: keep 5-minute golden path via scripts/Helm, smoke tests, and clear rollback steps; zero manual patching.

5. Community & adoption levers (ship in parallel)
- Launch signed plugin catalog with curation guidelines and sample connectors (social media, dark web, corporate intel feeds).
- Host monthly OSINT community drills/webinars with Bellingcat-style tradecraft packs and red-team labs using the simulation pack.
- Publish “air-gapped deployment in 5 minutes” video + reproducible benchmark kit (graphs, ingestion throughput, GPU perf).
- Create contributor onramp: starter issues, architecture map, SDK examples, and a governance model that keeps velocity.

6. Funding / sustainability model implications
- Dual-license enterprise features (assurance, compliance packs, managed updates) while keeping core OSS; offer hardened air-gapped distro.
- Paid support/subscription for regulated customers (LE/IC/corporate intel) with SLAs, signed builds, and long-term patch streams.
- Marketplace revenue share for certified plugins/connectors and hosted copilot endpoints for customers who can use cloud.
- Grants/partnerships with research orgs for open threat datasets and GPU credits to offset model hosting costs.
