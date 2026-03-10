# AI Agent Operating Policy

## Purpose
This document defines the operating constraints for AI coding agents working in Summit.

## Policy
All AI-generated changes must be:
- path-bounded
- blast-radius bounded
- verifier-aware
- evidence-aware
- rollback-ready
- publish-bundle complete

## Mandatory rules
- Additive changes preferred
- No unrelated refactors
- No timestamps in deterministic artifacts
- Timestamps only in stamp.json
- Stable evidence IDs
- No PII in fixtures, payloads, logs, or evidence outputs
- New functionality must fail closed behind feature flags where applicable
- No new required checks without documenting mapping and intent

## Review standard
AI-generated changes must be reviewed for:
- mergeability
- governance compliance
- CI impact
- dependency delta
- rollback clarity
