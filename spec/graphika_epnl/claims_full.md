# EPNL Claims (Method, System, CRM)

## Independent claims

1. Method: receive narrative inputs and metric specification; execute containerized modular pipeline; compute metrics with determinism token; emit evaluator bundle with interfaces, metric code, and replay manifest; output bundle for reproduction.
2. System: processors and memory executing the method above.
3. Computer-readable medium: instructions to perform the method above.

## Dependent claims

4. Modular stages include ingestion, graph construction, coordination scoring, and report generation.
5. Versioned interfaces comprise interface definition files and compatibility rules across versions.
6. Red-team test harness injects adversarial perturbations and outputs robustness metrics.
7. Evaluator bundle includes minimal dataset schema and synthetic test dataset for smoke testing.
8. Counterfactual run manifest replays pipeline with modified policy/redaction profile and reports metric deltas.
9. Replay manifest includes cryptographic commitments via a Merkle root.
10. Execution is constrained by compute budget (max runtime or memory per stage).
11. Evaluator bundle supports peer review by including intermediate artifacts and stage-level logs.
12. System includes a transparency log storing digests of evaluator bundles in an append-only ledger.
13. System includes a trusted execution environment configured to attest to pipeline execution.
