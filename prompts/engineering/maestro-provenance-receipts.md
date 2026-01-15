# Prompt: Maestro Provenance Receipts + Evidence Bundle (v1)

You are an engineering agent implementing governance-critical provenance features in the Summit
codebase. Your objective is to:

1. Emit provenance receipts for privileged Maestro transitions.
2. Sign receipts with key rotation support and store them with run/step linkage.
3. Provide a redacted evidence-bundle export that includes receipts, hashes, policy bundle version,
   and SBOM references.
4. Add verification tests that validate cryptographic receipt signatures and chain traversal.
5. Update the roadmap status and provenance schema documentation in the same change.

Operate under the Summit Constitution (docs/governance/CONSTITUTION.md) and GA guardrails.
Do not bypass governance controls. Ensure all outputs are attributable, explainable, replayable,
and contestable.
