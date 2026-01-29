# Threat Model: Privacy Graph Analytics

## Threat Table

| Threat | Risk | Mitigation | CI/Runtime Gate |
| :--- | :--- | :--- | :--- |
| PII Re-identification | High | Strict feature allowlist (GraphBuilder) | `tests/privacy_graph/test_graph_builder_pii_safe.py` |
| Linkage Attacks | Medium | Anonymized IDs (upstream) + Backend checks | `PrivacyGraphPolicy` |
| Rare Node Inference | Medium | Degree Capping (DP Hooks) | `cap_degree` |
| Dependency Supply Chain | Medium | Dependency Delta Gate | `tools/ci/dependency_delta_gate.py` |
| Policy Bypass | High | Deny-by-default config | `test_policy_denies_by_default.py` |

## Residual Risks

1.  **Upstream ID Stability**: If upstream hashing is broken, graph nodes might be re-identifiable.
2.  **Side Channel**: Timing attacks on the HE simulator (not implemented yet).
3.  **Metadata Leakage**: Graph structure itself might leak info even if features are safe.
