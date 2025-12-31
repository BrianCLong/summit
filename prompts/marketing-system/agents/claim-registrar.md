# Subagent: Claim Registrar

Input: extracted claim sentences from one or more artifacts.

Tasks:

- Normalize each claim into registry entries.
- Assign stable IDs (e.g., SUMMIT-CLAIM-###).
- Classify category, strength, scope, and channels.
- Add evidence references (code/test/doc/gate). If unsure, mark as assumption and restrict channels to internal.

Outputs:

- Updated `governance/claims.registry.yaml` (full file content).
- Mapping table: claim sentence -> claim ID.
- List of claims blocked or downgraded with rationale.
