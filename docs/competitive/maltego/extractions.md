# Extractions for Maltego

- ID: ci.maltego.ops.001
  URL: docs/osint/updates/automation-turn-5.md
  Quote: "focus on stability, access control, and performance tuning across the Maltego One (browser) and platform ecosystem"
  Quote SHA256: 94a4744fc01b82e0d87f0b1c7ea9110414809a6c8ca9db3f1ac21a81a2465e61
  Type: inference
  Claim: Maltego is prioritizing enterprise-grade reliability and governance over new features.
  Value: Summit can leapfrog by maintaining feature velocity while enforcing the same governance via automated gates.
  Summit Mapping: docs/governance/
  Gate: scripts/ci/verify_governance_docs.mjs

- ID: ci.maltego.ecosystem.001
  URL: docs/osint/updates/automation-turn-5.md
  Quote: "New investigative value is primarily emerging via Transform partners and data integrations, not core UI or workflow changes."
  Quote SHA256: 87cbc4782174ab5b1502a1f85248f03a5868449d45f433f4978d1323cec06ec4
  Type: direct
  Claim: Value growth is ecosystem-driven through data integrations.
  Value: Summit's connector architecture and MCP support are already aligned; need to ensure easy "Transform-like" plugin development.
  Summit Mapping: packages/mcp-apps/
  Gate: scripts/ci/validate_mcp_contract.mjs
