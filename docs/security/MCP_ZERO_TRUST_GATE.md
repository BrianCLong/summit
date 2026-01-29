# MCP Zero-Trust Security Gate

**Status:** Active Gate
**Owner:** Security / Aegis
**Source:** Zero-Trust MCP Whitepaper
**Enforcement:** PR Review & Architecture Audit

## 1. Core Mandate
"Context is untrusted by default until cryptographically verified." All MCP tools and Agent workflows must pass this checklist before GA.

## 2. Security Checklist

### 2.1 Context Isolation
- [ ] **Boundary Check:** Does the tool strictly confine context to the authorized agent scope?
- [ ] **Leakage Prevention:** Are side-channels (e.g., shared cache, error logs) sanitized of sensitive context?
- [ ] **Encryption:** Is context encrypted in transit (TLS) and at rest?

### 2.2 Input Validation (Adversarial)
- [ ] **Prompt Injection:** Is there a mechanism to detect/block adversarial instructions in the input?
- [ ] **Schema Rigidity:** Does the tool enforce strict typing on all input arguments?
- [ ] **Sanitization:** Are inputs sanitized before being passed to downstream execution (SQL, Shell)?

### 2.3 Provenance & Attribution
- [ ] **Source Tagging:** Is every context fragment tagged with its source ID and sensitivity level?
- [ ] **Token Provenance:** Can specific output tokens be traced back to their source input? (If applicable)
- [ ] **Revocation Support:** Does the tool support revocation signals (Merkle Tree updates)?

### 2.4 Information Flow
- [ ] **Policy Check:** Is there a pre-execution check to ensure combined contexts do not violate security lattices (e.g., combining Public + Secret)?

## 3. Failure Modes
Any tool failing **Isolation** or **Input Validation** is strictly blocked from Release Candidate (RC).
