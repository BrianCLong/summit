# Timer-S1 Claims Registry & Repo Reality Check

## Ground Truth Capture
* **ITEM:CLAIM-01**: Timer-S1 is an MoE time-series foundation model with 8.3B total params, 0.75B active per token.
* **ITEM:CLAIM-02**: Supports 11.5K context length.
* **ITEM:CLAIM-03**: Introduces Serial-Token Prediction (STP) rather than standard next-token prediction for time series.
* **ITEM:CLAIM-04**: Integrates sparse TimeMoE and TimeSTP blocks.
* **ITEM:CLAIM-05**: Uses TimeBench (~1T time points) corpus.
* **ITEM:CLAIM-06**: Best MASE and CRPS on GIFT-Eval.
* **ITEM:CLAIM-07**: Serial Scaling across architecture, data, pipeline.

## Repo Facts
* **REPO:FACT-01**: The Summit repo is an Agentic AI OSINT Platform with multi-agent orchestration.
* **REPO:FACT-02**: Repo has `agents/`, `bench/`, `benchmark/`, `benchmarks/`, `analysis/`, `alerting/`, `artifacts/`, `RUNBOOKS/`, `SECURITY/`, `.github/`, `.ci/`, `.opa/policy/`.
* **REPO:FACT-03**: GHA footprint includes `agentic-evals.yml`, `agentplace-drift.yml`, `evidence-bundle-validation`.
* **REPO:FACT-04**: Requires strict compliance with Branch Protection as Code and required status checks.

## Map to Summit Native Primitives
* Serial trajectory forecasting harness -> CLAIM-03
* Long-horizon agent-window evaluation -> CLAIM-02
* Expert-specialization telemetry for behavior modes -> CLAIM-01, CLAIM-04
* Large temporal evidence corpus ingestion -> CLAIM-05
* Forecast-vs-policy governance gate -> Summit native
* Counterfactual scenario runner -> Summit native
* Behavior risk budget and release decision pack -> Summit native
* Drift detector for forecast accuracy degradation -> Summit native
