# Privacy Preserving Intrusion Detection Framework for IIoT in 6G

This module implements a privacy-first GNN analytics framework based on the paper:
*A privacy preserving intrusion detection framework for IIoT in 6G networks using homomorphic encryption and graph neural networks* (Scientific Reports; 2026). DOI: 10.1038/s41598-025-32087-7.

## Core Principles
1. **Graph-first modeling**: Device-interaction graphs + temporal traffic patterns as primary signal for IDS.
2. **Encrypted analytics posture**: "No centralized raw aggregation" as a design constraint, enforced cryptographically via Homomorphic Encryption (HE).
3. **Split-trust key custody**: Edge holds the secret key; the server sees only ciphertext.

## Evidence IDs
- `EVD-iiot6g-gnn-he-SCHEMA-001`: schemas + validators
- `EVD-iiot6g-gnn-he-GATE-001`: deny-by-default plaintext/key gates
- `EVD-iiot6g-gnn-he-HE-API-001`: HE interface + "server has no key" test
- `EVD-iiot6g-gnn-he-PIPE-001`: end-to-end encrypted inference harness (toy)
- `EVD-iiot6g-gnn-he-NEG-001`: negative fixtures (plaintext/key/logging)
