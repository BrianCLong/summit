## Required checks discovery
1) In your Git hosting UI, open "Branch protection rules" for the default branch.
2) Copy the exact required check names into this file.
3) Update `ci/gates/required_checks.json` accordingly.

## Temporary gate names (to be renamed)
- gate.workspace_root_enforced
- gate.remote_write_requires_approval
- gate.audit_hash_chain
- gate.extension_signature_required
- gate.never_log_fields

