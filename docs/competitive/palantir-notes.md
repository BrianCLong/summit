# Palantir Product Notes

## Product loop

- **Data fusion:** consolidates high-volume heterogeneous data into a common model and entity graph.
- **Pattern and link analysis:** resolves entities and surfaces associations to fuel investigations and operational decisions.
- **Operational workflows:** pushes insights into casework, logistics, intelligence, and enforcement actions—not just dashboards.

## Dual-use risk and controversy

- Core capability set is simultaneously valuable for commercial optimization and high-stakes security/immigration enforcement.
- Public narrative leans on “clients control use,” raising questions about vendor accountability and the presence of enforceable red lines.
- Mission branding (“defending the West”) and political positioning sharpen both adoption and scrutiny.
- Market signal: positioned as a multi-hundred-billion colossus—evidence that the governed-intelligence category is commercially real.

## How Summit differentiates

- **Enforceable policy in-product:** purpose binding, justification capture, and case linkage are required for sensitive operations.
- **Reason-for-access by default:** requests without purpose/justification/case identifiers are blocked and surfaced to users for completion.
- **Immutable audit + provenance:** append-only audit events record tenant, user, action, purpose, justification, case, decision, and correlation IDs.
- **Step-up for high-risk moves:** bulk exports and other high-impact actions require step-up authentication or explicit approval tokens.
- **Provenance-aware workflows:** sensitive responses include the governing context so analysts see “why they are seeing this.”
- **Governed threat model:** surveillance-state risks are treated as first-class threats with mapped mitigations (see `docs/security/surveillance-state-threat-model.md`).
