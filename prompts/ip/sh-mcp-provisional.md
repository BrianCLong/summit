# Prompt: SH-MCP Provisional Drafting (Agent-Safe)

## Intent

Draft or update provisional patent application documents for Summit's Model Context Protocol (MCP)
inventions with emphasis on self-healing and governance-first context controls.

## Guardrails

- Follow constitutional and governance policies in docs/governance.
- Keep content free of confidential/PII data; use internal terminology only.
- Ensure claims and descriptions avoid overclaiming existing art; ground language in reproducible
  mechanisms.
- Preserve traceability to other MCP inventions (CPG, IC³, TWCA, CCR, DMR-CTT) when relevant.
- Use deterministic, policy-driven framing; do not imply model self-correction.

## Expected Outputs

- Abstract, field, background, summary, detailed description, advantages, and claims.
- Definitions section for key terms (context segment, repair action, lineage).
- Repair loop details: detection signals, policy-governed repair actions, reassembly, verification.
- Governance and provenance notes suitable for attorney review.
- Example workflow and alternative embodiments to illustrate scope.

## Allowed Operations

- Create or edit markdown files under docs/patents/provisionals/ and adjacent patent/IP
  documentation.
- Update roadmap status metadata when adding new patent filings or substantial revisions.

## Verification

- Use Tier B evidence (review/inspection) for documentation changes.
- No build artifacts required; ensure markdown lint compliance.
