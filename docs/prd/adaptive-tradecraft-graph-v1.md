# Adaptive Tradecraft Graph (ATG) + Espionage Equilibrium Shield (EES) v1 PRD

**Item slug:** `adaptive-tradecraft-graph`

## Readiness & Authority

- **Summit Readiness Assertion:** `docs/SUMMIT_READINESS_ASSERTION.md`
- **Governance anchors:** `docs/governance/CONSTITUTION.md`, `docs/governance/META_GOVERNANCE.md`
- **Core operating rule:** Never defend the past. Only assert the present and dictate the future.

## Problem Statement

Defenders need a **simulation-only** module that models AI-assisted espionage tradecraft on a graph overlay and produces deterministic, evidence-bound mitigation guidance without any offensive instructions. The module must bind every narrative step to evidence IDs, enforce tenant isolation, and default to non-enforcement outputs (tickets/PR suggestions only).

## Public Grounding (claims)

- **ITEM:CLAIM-01:** Anthropic reports a mid-Sept 2025 espionage operation and attributes it with “high confidence” to a Chinese state-sponsored group, emphasizing unprecedented AI integration and autonomy across lifecycle steps. ([Anthropic report](https://assets.anthropic.com/m/ec212e6566a0d47/original/Disrupting-the-first-reported-AI-orchestrated-cyber-espionage-campaign.pdf))
- **ITEM:CLAIM-02:** Anthropic notes AI executed “80–90%” of tactical operations at very high request rates and lists phases including recon, vuln discovery, credential harvesting, lateral movement, data analysis/exfil. ([Anthropic report](https://assets.anthropic.com/m/ec212e6566a0d47/original/Disrupting-the-first-reported-AI-orchestrated-cyber-espionage-campaign.pdf))
- **ITEM:CLAIM-03:** Anthropic documents model limitations, including overstated or fabricated findings during autonomous operations, requiring validation. ([Anthropic report](https://assets.anthropic.com/m/ec212e6566a0d47/original/Disrupting-the-first-reported-AI-orchestrated-cyber-espionage-campaign.pdf))
- **ITEM:CLAIM-04:** Cyderes frames Anthropic’s analysis as the first verified AI-orchestrated cyber-espionage campaign (secondary commentary). ([Cyderes analysis](https://www.cyderes.com/howler-cell/first-ai-driven-cyber-espionage-campaign-anthropic-analysis?utm_source=chatgpt.com))
- **ITEM:CLAIM-05:** Trend Micro advocates proactive simulation/digital-twin thinking for AI-powered threats (motivation for simulation posture). ([Trend Micro](https://www.trendmicro.com/en_us/research/25/k/redefining-defense-in-era-of-ai-led-attacks.html?utm_source=chatgpt.com))
- **ITEM:CLAIM-06:** SpyCloud positions AI insights to accelerate insider threat/cybercrime analysis based on breach/phishing/malware data (motivation for identity exposure ingestion). ([SpyCloud](https://spycloud.com/newsroom/spycloud-enhances-investigations-solution-with-ai-powered-insights?utm_source=chatgpt.com))
- **ITEM:CLAIM-07:** TechTarget describes AI threat detection as ML analyzing traffic, behavior, and data access patterns (broad detection framing). ([TechTarget](https://www.techtarget.com/searchsecurity/feature/How-AI-threat-detection-is-transforming-enterprise-cybersecurity?utm_source=chatgpt.com))

## Prior-Art Pointers (defensive only)

- MITRE ATT&CK knowledge base (tactics/techniques for defensive mapping). ([MITRE ATT&CK](https://attack.mitre.org/))
- Lockheed Martin Cyber Kill Chain (phased campaign framing for defense). ([Lockheed Martin](https://www.lockheedmartin.com/en-us/capabilities/cyber/cyber-kill-chain.html))
- NIST SP 800-53 Rev. 5 control families (defensive control baselines). ([NIST SP 800-53](https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final))

## Scope Guardrails (non-negotiable)

1. **No offense.** Red agent actions are abstract graph transitions only; no exploit, phishing, or operational steps against real targets.
2. **Simulation mode default ON; enforcement default OFF.** Outputs are tickets/PR suggestions/config diffs only.
3. **Evidence-bound outputs.** Narratives can only reference ESG nodes/edges present in snapshots with `evidence_ids[]`.
4. **Privacy capsule.** HR/“whole-person” signals are optional, abstracted, allowlisted, and never logged raw.
5. **PR stack cap:** 6 PRs.

## Target Outcome (MWS)

“From existing Summit graph + one identity exposure feed + one SaaS telemetry feed, produce an ESG snapshot, run a bounded dual-agent simulation that outputs 3 equilibrium campaign clusters, compute an Equilibrium Risk Index + minimal mitigation bundle, and generate evidence-bound narratives—deterministically in CI.”

## Solution Overview

### 1) Espionage Surface Graph (ESG) Overlay
- Overlay graph on Summit KG with espionage-tuned node/edge types and weights.
- Evidence IDs required on all nodes/edges.
- Deterministic snapshot build (stable ordering, no runtime timestamps).

### 2) Dual-Agent Game (Simulation Only)
- Red policy: abstract path transitions with capability constraints (filters only).
- Blue policy: control actions as graph rewrites (remove/reweight/add-monitor/require-phishing-resistant-auth/tighten-vendor-access).
- Bounded best-response iterations + Monte Carlo rollouts, converge by KL divergence threshold or max iters.

### 3) Equilibrium State + EES/ERI
- Store equilibrium distribution across campaign clusters.
- **Equilibrium Risk Index (ERI):** sum over top campaigns of `P(path) * Impact(path) * Stealth(path)`.
- Record fragility: ERI delta under top mitigation bundles.

### 4) Mitigation Bundles
- Approximate hitting set/submodular greedy for minimal controls.
- Each bundle includes control list, ERI reduction, business cost score, affected edges, evidence IDs.

### 5) Evidence-Bound Narratives
- Generate narratives referencing only snapshot evidence IDs.
- Output policy denies harmful instructions; safe rewrite required when risky phrasing appears.

## Functional Requirements

1. Build deterministic ESG snapshots from Summit KG + TECF streams.
2. Run dual-agent equilibrium simulation (bounded, safe action set).
3. Compute ERI and fragility metrics.
4. Produce top mitigation bundles and expected risk reduction.
5. Generate narratives bound to evidence IDs only.

## Non-Functional Requirements

- Determinism: all artifacts stable; no runtime timestamps embedded.
- Security: prompt-injection hardening and output policy enforcement.
- Tenant isolation: strict partitioning of graphs and snapshots.
- Observability: emit metrics and drift reports.
- Evidence-first: narrative outputs follow evidence bundle generation.

## Acceptance Tests (exact)

1. `esg.build` creates `out/esg.snapshot.json` from fixtures (deterministic).
2. `game.run` emits `out/equilibrium.state.json` with ≥3 campaign clusters.
3. `mitigations.find` emits `out/mitigation.bundles.json` (top 10) + expected risk reduction.
4. `narratives.render` emits `out/narratives.md` where every step references `evidence_ids[]`.
5. Security tests: prompt injection fixtures + “no procedural wrongdoing” output lint.

## Release & Roll-Forward Plan

- v1 ships simulation-only with no enforcement.
- Expand connector scope after determinism + evidence integrity gates are green.
- Keep equilibrium mechanics stable; model upgrades require baseline regression evidence.

## PR Stack (6 max)

1. **PR1:** ESG schema + TECF + evidence IDs
2. **PR2:** ESG snapshot builder
3. **PR3:** Dual-agent game engine
4. **PR4:** EES/ERI scoring
5. **PR5:** Mitigation optimizer
6. **PR6:** Narratives + API/UI + ops pack

## Compliance & Governance Hooks

- Regulatory logic only via policy-as-code.
- Evidence hashes verified; tenant isolation enforced.
- Output policy for red agent and narratives enforced in CI.

## Positioning Constraints

- Use Anthropic language as reported; treat Cyderes as secondary commentary.
- Avoid absolute marketing claims; maintain evidence-cited phrasing.

## Open Items (Intentionally constrained)

- Deferred pending repo verification: exact Summit KG API, evidence normalization conventions, job scheduling mechanism, UI routing and graph visualization stack.

