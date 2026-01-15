# Policy Profile Assignment & Bundle Mapping

Objective: implement policy profile manifests and bundle mappings with versioned checksums,
add a profile assignment service + endpoint that records provenance and emits receipts,
ensure policy simulation re-reads the active profile state, and update documentation
with profile definitions plus expected OPA bundle diffs.

Scope:

- `server/src/policies/`
- `server/src/services/policy-profiles/`
- `server/src/routes/`
- `server/src/provenance/`
- `docs/`

Constraints:

- Preserve conventional commit formatting.
- Record assignments in the provenance ledger for replay.
- Keep bundle pointers versioned and checksum-addressed.
