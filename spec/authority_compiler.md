# Authority Compiler and Policy Gate Spec

## Purpose
Compile ABAC/OPA policies into deterministic bytecode that guards graph ingest, query, and export paths with deny-by-default controls and clear reasons for analysts.

## Flow
1. Request enters gateway with requester identity, dataset tags, hypothesis ID (optional), and authority token.
2. Authority compiler selects policy bundles by domain (ingest/query/export) and compiles to WASM bytecode with embedded license/TOS constraints.
3. Execution engine evaluates the request, producing `allow|deny` plus reason, policy version, and appeal link.
4. Results are streamed to audit sink with hash-chain anchor and fed to UI for user-friendly messaging.

## Bytecode Stub
- Module exports: `authorize(requestCtx) -> {decision, reason, obligations}`
- Request context fields: actor, roles, clearance, dataset sensitivity, purpose-of-use, budget, time window, justification text, warrant/authority binding.
- Obligations: throttle, redact fields, require multi-party approval, enforce cost budgets.

## Simulator Checklist
- Determinism: same input produces identical decisions; hash decisions for audit.
- Policy coverage: tests for allow, deny, conditional allow (obligation) across ingest/query/export.
- Reason rendering: localized strings and remediation hints generated from policy metadata.
- Governance: appeals create tickets with evidence bundle; deny logs include policy and dataset IDs.
- Safety: prompt-injection guard ensures model actions cannot bypass policy decisions.
