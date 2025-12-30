# SpiderFoot — Query-Safe Distributed Recon with Canary Targets (QSDR)

QSDR runs distributed OSINT safely by embedding canary targets and query-shape checks to detect unsafe or abusive modules, automatically halting execution and generating a signed audit record.

## Objectives

- Detect disallowed recon behavior via canary triggers and query-shape policy violations.
- Halt and quarantine modules automatically, emitting kill audit records with evidence.
- Protect privacy with per-target budgets and selective-disclosure outputs.

## Workflow Overview

1. **Request Intake:** Receive recon request and select modules per policy.
2. **Canary Generation:** Issue decoy domains/accounts/emails to detect outbound contact attempts.
3. **Monitored Execution:** Execute modules against targets + canaries while inspecting query shapes.
4. **Violation Detection:** Trigger on canary hits, active probe patterns, rate-limit violations, or disallowed endpoints.
5. **Kill Switch:** Halt module, revoke execution token, quarantine module, and produce kill audit record with replay token.
6. **Output:** Return pre-halt results with selective disclosure plus kill audit record anchored in transparency log.

## Governance Hooks

- Per-target privacy budgets enforced (lookups/bytes/retention).
- Policy decisions logged with identifiers and scope constraints.
- Trusted execution optional for monitoring pipeline.
