# Living Architecture Flows

This specification defines the Living Architecture Flows artifacts for Summit, aligned with the
Summit Readiness Assertion and the Law of Consistency. The artifacts describe end-to-end flows
(UI → BFF → API → DB → events → workflows) as versioned, deterministic data that is safe for
agents and humans to consume.

## Contract

**Authoritative definitions**:
- Evidence IDs and schemas in `src/flows/schema/`.
- Versioned outputs under `docs/architecture/flows/`.

**Artifacts**:
- `flows.json`: normalized flow graph data.
- `flows/<flow-id>/diagram.mmd`: Mermaid diagram.
- `flows/<flow-id>/README.md`: flow narrative (governed, deterministic).
- `verification.json`: coverage and mismatch findings.
- `index.md`: catalog of flow IDs.

## Evidence ID conventions

- `FLOW:<slug>:v1` — flow document identifiers.
- `FLOWEDGE:<slug>:<n>` — edge identifiers.
- `VERIFY:<check>:v1` — verification check identifiers.

## Determinism & governance

- Outputs are deterministic and must not embed unstable timestamps.
- Evidence references are file-path plus line anchors when available.
- Any extraction or verification that cannot be proven is marked `unknown` or
  `confidence: low` and remains intentionally constrained pending verified sources.

## Security & safety stance

- Sanitization removes unsafe Mermaid tokens and escapes code fences.
- Secret redaction is mandatory before artifacts are committed.
- Workspace roots are explicit allowlists; network access is denied by default.

## Readiness alignment

This capability asserts production readiness posture by grounding every flow in explicit evidence
and consistent schemas. It directly references `docs/SUMMIT_READINESS_ASSERTION.md` for readiness
criteria.
