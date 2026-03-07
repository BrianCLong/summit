# Sprint 23 Risk Register

| Threat                                                                        | Likelihood |   Impact | Mitigation                                                                                                                   |
| ----------------------------------------------------------------------------- | ---------: | -------: | ---------------------------------------------------------------------------------------------------------------------------- |
| Webhook spoof/replay                                                          |     Medium |     High | HMAC verify, idempotency keys, egress allowlist                                                                              |
| Key compromise                                                                |        Low |     High | BYOK/HSM with rotation and transparency entries                                                                              |
| Transparency split view                                                       |        Low |     High | Gossip auditors validating STH proofs                                                                                        |
| DP SLA breach unnoticed                                                       |     Medium |   Medium | Online error bounds and auto refunds                                                                                         |
| PII leakage in billing                                                        |     Medium |     High | PII-off invoices and DSAR purge                                                                                              |
| FTO not signed for Fed Intelligence Phase 2 crypto stack                      |     Medium | Critical | Block partner data until counsel FTO memo; feature flag `federation.pilot.legal_gate`; weekly legal checkpoints              |
| Copyleft/commercial crypto libs contaminate pilot artifacts (Circom/Concrete) |     Medium |     High | Default to MIT/Apache stacks (SEAL/OpenFHE, gnark/arkworks); segregate GPL/AGPL code; secure commercial licenses when needed |
