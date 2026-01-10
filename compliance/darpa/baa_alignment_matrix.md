# DARPA BAA Alignment Matrix

This matrix maps evaluator-first artifacts to common BAA evaluation criteria.

| Evaluation Criterion   | Artifact                          | Evidence Source                             |
| ---------------------- | --------------------------------- | ------------------------------------------- |
| Independent evaluation | Conformance suite + evaluator API | `spec/common/evaluator_handoff_contract.md` |
| OA/MOSA compliance     | ICD + rights assertion artifact   | `spec/common/architecture_overview.md`      |
| Reproducibility        | Determinism token + witness chain | `spec/common/determinism_tokens.md`         |
| Secure data handling   | Scope tokens + egress receipts    | `spec/common/multi_performer_eval_plane.md` |
| Auditability           | Transparency log receipts         | `spec/common/transparency_log.md`           |

## Policy-as-Code Requirement

All compliance logic referenced in this matrix must be implemented as policy-as-code
and logged to the transparency log for auditability.
