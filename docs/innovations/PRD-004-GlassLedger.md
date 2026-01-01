# PRD: Glass Ledger (Provenance / Verification)

## 1. Executive Summary
Glass Ledger anchors the internal Summit `ProvenanceLedger` to a public transparency mechanism (simulated external ledger) via Merkle Trees. This allows Summit to prove to external auditors that logs have not been tampered with, without revealing the log content.

## 2. Problem Statement
Internal logs are mutable by DBAs. High-trust environments require cryptographic proof of immutability.

## 3. Non-Goals
- Publishing actual data.
- Blockchain tokenomics.

## 4. User Stories
- As an auditor, I want to verify that the `AuditLog` for Jan 1st matches the hash published on Jan 2nd.

## 5. Functional Requirements
- Periodically (e.g., hourly) fetch new ledger entries.
- Build a Merkle Tree.
- "Publish" the Root Hash to an external store (e.g., a file or mock API).
- `verify(proof, leaf)` function.

## 6. Non-Functional Requirements
- Crypto-agility (support SHA-256).
- Scalable to millions of entries.

## 7. Architecture
- `TransparencyLogService` runs as a cron job.
- Reads `ProvenanceLedger` table.
- Uses `merkle-tree-solidity` or similar logic.

## 8. Data Flows
Ledger DB -> Merkle Builder -> Root Hash -> Public Record.

## 9. Policy & Governance
- RPO (Recovery Point Objective) for tamper evidence is 1 hour.

## 10. Test Strategy
- Tamper with a log entry in DB.
- Run verification -> Should Fail.

## 11. Rollout
- Enable for `System` tenant first.

## 12. Risks
- Key management for signing the root.

## 13. Success Metrics
- 100% of audit periods successfully anchored.
