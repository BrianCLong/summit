# MCP Integration Docs Prompt (v1)

## Objective

Produce Summit documentation deliverables for MCP integration readiness:

- Threat model (MCP + MCP Apps + optional Copilot SDK adapter)
- Security controls mapping to tests and CI gates
- Product PRD with governance, consent UX, and GA gates
- Update `docs/roadmap/STATUS.json` with a revision note

## Required Outputs

- `docs/security/THREATMODEL-mcp.md`
- `docs/security/SECURITY-CONTROLS-mcp.md`
- `docs/product/PRD-mcp-integrations.md`
- `docs/roadmap/STATUS.json`

## Constraints

- Align to Summit readiness assertion and governance requirements.
- Include MAESTRO layers, threats considered, and mitigations.
- Use deny-by-default, explicit consent, and audit-evidence requirements.
