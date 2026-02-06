# Adaptive Espionage Deception Grid (AEDG) & Counter-Tradecraft Studio (CTS)

## Readiness assertion
Summit readiness alignment is asserted via `docs/SUMMIT_READINESS_ASSERTION.md`; this module inherits those readiness standards and gate expectations by default.【F:docs/SUMMIT_READINESS_ASSERTION.md†L1】

## Mission
Establish a Summit-native, graph-anchored deception fabric that embeds realistic decoys directly into the intelligence graph and runs AI-driven engagement agents to learn adversary tradecraft, then feeds that intelligence back into other Summit modules with evidentiary traceability.

## Scope
### In scope (v1)
- Graph-anchored deception overlay that mirrors high-value paths with shadow assets, identities, and narratives.
- Narrative/persona honeypots with controlled interaction surfaces (portals, chats, tickets, repos, APIs).
- Engagement agents that log interactions with chain-of-custody metadata.
- Structured extraction of adversary TTPs, tooling mentions, and prompt patterns into the Summit graph.
- Interop exports to ATG/EES, DisinfoShield, ITT/BEG, SCEL/VES, and IEA/REF.

### Out of scope (v1)
- Active counter-offense or external disruption.
- Unreviewed production-system changes (all enforcement remains gated and human-reviewed).

## Core concepts
- **Graph-Anchored Deception Fabric:** shadow nodes/edges aligned to high-value graph paths to create a deception overlay consistent with organizational topology.
- **Narrative & Persona Honeypots:** decoy narratives and personas embedded into communications surfaces to attract espionage reconnaissance.
- **Adaptive Engagement Agents:** LLM/RL-driven agents that sustain believable interaction, steer adversaries into decoys, and extract tradecraft signals.
- **Cross-Module Feedback Loop:** captured signals update core espionage modules as evidence-bound training data.

## Functional requirements (v1)
1. **Deception grid construction**
   - Identify high-value paths and select deception choke points.
   - Generate graph-consistent decoys with tunable realism and lifecycle rotation.
   - Maintain topological alignment as real structures evolve.
2. **Engagement & telemetry**
   - Provide controlled interaction channels for decoys.
   - Run engagement agents with full logging, chain-of-custody, and refusal policies.
   - Extract structured tradecraft into graph data products.
3. **Analytics & integration**
   - Dashboards for active engagements and inferred attacker goals.
   - APIs/events for SIEM/SOAR and internal module updates.

## Non-functional requirements
- **Containment:** decoy systems must be isolated, non-pivotable into production assets.
- **Legal/ethics guardrails:** jurisdictional controls for engagement content and retention.
- **Determinism:** stable evidence artifacts for CI and audit workflows.

## Governance and evidence
- **Evidence IDs:** `EVD-AEDG-<AREA>-<NNN>` for all outputs and evaluations.
- **Policy guards:** no offensive guidance, no unauthorized data capture, no raw prompt storage by default.
- **Kill switches:** all AEDG/CTS features remain OFF by default and require explicit enablement.

## MAESTRO threat-model alignment
- **MAESTRO Layers:** Foundation, Data, Agents, Tools, Infra, Observability, Security.
- **Threats considered:** prompt injection, decoy poisoning, goal manipulation, unauthorized pivoting, telemetry leakage, adversarial model gaming.
- **Mitigations:** policy-as-code refusal tests, decoy containment isolation, tenant-scoped evidence, tool allowlists, and observability hooks for anomalous engagement behavior.

## Data products
- **Deception Engagement Log (DEL):** immutable interaction ledger with provenance and chain-of-custody.
- **Tradecraft Extraction Bundle (TEB):** structured TTPs, tool signatures, and narrative patterns linked to graph refs.
- **Engagement Risk Cards:** executive summaries with evidence links and residual risk bands.

## Interop handshake
- **Exports:** deception engagement signals, tradecraft updates, narrative indicators.
- **Imports:** ATG/EES path priors, SCEL vendor dependency data, ITT/BEG insider drift priors, IEA/REF crown-jewel overlays.

## Rollback plan
- Disable AEDG/CTS flags and ignore latest deception snapshots; retain evidence bundles for audit traceability.

## Next actions (deterministic)
- Define AEDG/CTS contracts in `src/graphrag/aedg/contracts.ts`.
- Implement evidence fixtures and refusal tests for engagement agents.
- Add minimal API stubs for dashboard integration.
