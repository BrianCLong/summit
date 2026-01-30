# Runbook: Subsumption Bundle Framework

## Symptoms

- CI job `verify-subsumption-bundle` failing.

## Common causes

- Missing docs target.
- Missing evidence schema or evidence index.
- Missing deny-by-default fixtures dir.
- Missing required evidence IDs in index.
- Dependency change without deps delta entry.

## Fix

- Add missing files, update manifest/docs/evidence index, and rerun CI.
