# Security Policy (OPA/ABAC) — Cheatsheet

**What it does:** Generate and validate OPA/Rego policies for tenant-scoped ABAC and decision logs.

**How to use (chat):**
1) Ask for the outcome (e.g., "Generate SDL + persisted queries for Entity v1").
2) Provide repo path and constraints.
3) This skill emits artifacts and verification steps.

**How to use (API/Agent SDK):**
- Call the `scripts/runner.ts` with input JSON; outputs artifacts to the working tree.

**SLO/COST GUARDRAILS:** Enforced per org defaults.
