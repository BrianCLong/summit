# Coverage Assessment

| Signal | Status | Evidence/File | Remediation |
| :--- | :--- | :--- | :--- |
| **Constitutional Primacy** | ✅ Covered | `docs/governance/CONSTITUTION.md` | - |
| **Human Primacy** | ✅ Covered | `docs/governance/CONSTITUTION.md` | - |
| **Provenance Requirement** | ✅ Covered | `docs/governance/CONSTITUTION.md` | - |
| **Release Abort Gate** | ⚠️ Gap (Closing) | `scripts/ci/verify_release_constraints.ts` | Implemented in this PR. |
| **Explainability Gate** | ❌ Gap | `docs/osint/EXPLAINABILITY_REQUIREMENTS.md` | Policy exists; automated check missing. |
| **MCP Zero-Trust** | ✅ Covered | `docs/security/MCP_ZERO_TRUST_GATE.md` | Policy defined; enforced via code review. |
| **Ethical Defensive Use** | ✅ Covered | `docs/ETHICAL_GUIDELINES.md` | - |
| **Agent Mandates** | ✅ Covered | `AGENTS.md` | - |
| **Contradiction Detection** | ⚠️ Gap (Closing) | `scripts/ci/verify_contradiction_exposure.mjs` | Implemented in this PR. |
