# PR: Consolidate Prompt Metadata and Add Jest Network Teardown Shim

Consolidate prompt metadata so ONE prompt hash accurately represents the full, combined scope of the current PR, including Jest network teardown shim addition, governed test updates, and LFS exception updates.

## Changes

### 1. Jest Network Teardown Shim

- Added opt-in Jest setup shim to `server/tests/setup/jest.setup.cjs`.
- Tracks and closes network servers and timers when `NO_NETWORK_LISTEN=true`.
- Reduces open handle hangs in CI.

### 2. LFS Exceptions

- Updated `.gitattributes` to include exception for `verification/*.png` to prevent LFS smudge failures in certain environments.

### 3. Prompt Registry Consolidation

- Identified `jest-network-teardown-shim` as the prompt of record.
- Updated prompt scope to explicitly enumerate all files touched by this PR.
- Registered new prompt hash in `prompts/registry.yaml`.
- Included earlier prompt file edits (`gitattributes-lfs-exception@v1.md`, `nl-graph-query-test-tson-fix@v1.md`) in the consolidated scope.

## Verification

- Computed SHA-256 hash for consolidated prompt: `72dea420478bbb896f60d1ccd13e6148d6145be7a3edeeabc936cbfbe7983a0b`.
- Verified hash consistency in `prompts/registry.yaml`.
- Confirmed `server/tests/setup/jest.setup.cjs` parses correctly.

### Hash Computation

To compute the prompt hash, run:

```bash
sha256sum prompts/governance/jest-network-teardown-shim@v1.md
```

<!-- AGENT-METADATA:START -->

```json
{
  "agent_id": "jules",
  "task_id": "consolidate-prompt-metadata",
  "prompt_hash": "72dea420478bbb896f60d1ccd13e6148d6145be7a3edeeabc936cbfbe7983a0b",
  "domains": ["governance", "testing"],
  "verification_tiers": ["C"],
  "debt_delta": 0,
  "declared_scope": {
    "paths": [
      ".gitattributes",
      "PR_DESCRIPTION.md",
      "server/tests/setup/jest.setup.cjs",
      "docs/roadmap/STATUS.json",
      "prompts/registry.yaml",
      "prompts/governance/gitattributes-lfs-exception@v1.md",
      "prompts/governance/nl-graph-query-test-tson-fix@v1.md",
      "prompts/governance/jest-network-teardown-shim@v1.md"
    ]
  },
  "allowed_operations": ["create", "edit"]
}
```

<!-- AGENT-METADATA:END -->
