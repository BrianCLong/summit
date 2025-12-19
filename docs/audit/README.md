# Summit Agent Audit Log

**Status:** Mandatory  
**Applies to:** All AI-assisted contributions

This directory provides an append-only audit trail for all AI agent activity within Summit.

## Purpose

The audit log exists to preserve provenance, enable post-incident review, support governance/compliance/trust, and ensure no AI activity is anonymous or unaccountable. Deletion or modification of audit entries is forbidden.

## What Must Be Logged

Every AI-assisted PR must have a corresponding audit entry documenting who authorized the agent, what scope was granted, what changed, and what the outcome was.

## Enforcement

- PRs may be reverted if audit entries are missing or incomplete.  
- Audit violations are governance incidents.  
- This log overrides convenience.

## File Structure

- `YYYY-MM-DD-agent-log.md` — daily append-only logs.  
- `template.md` — required format.  
- `README.md` — this document.

## Cultural Principle

> **If an agent touched it, it must be traceable.**

Audit logs are not optional bureaucracy — they are a strategic asset.
