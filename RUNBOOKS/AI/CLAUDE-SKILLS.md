# Claude Skills — Ops Runbook

**Date:** 2025-10-17

## Scopes
- Default: `org`
- Sensitive skills: `team:platform` or `private`

## Quotas
- Prod monthly LLM budget: $18,000 (alert at 80%)

## On-Call Triage
- Manifest load failures → check `.claude/skills/*/skill.yaml`
- Provenance mismatch → re-run CI job to rebuild `PROVENANCE.HASH`

## Rollback
- Revert `.claude/registry.yaml` to previous commit.
- Purge editor/agent caches; restart developer tools if needed.

## Security
- Verify signatures on import.
- Deny unknown skills; least privilege in permissions.
