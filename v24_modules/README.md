# v24 Global Coherence Ecosystem - Executive Brief

This directory contains the core operational modules for the v24 IntelGraph Activities Portfolio. The primary goal is to establish a graph-backed system for analyzing and influencing global coherence signals, aggregating per-tenant coherence scores, and providing real-time insights for the workbench UI.

## Mission Summary

v24 focuses on delivering the first slice of the Global Coherence Ecosystem, enabling the ingestion, persistence, and exposure of coherence signals through a robust GraphQL API. Key components include:

- **Signal Ingestion:** Via HTTP Push and Kafka, with provenance tracking.
- **Dual-Store Design:** Utilizing Neo4j for write-optimized signal persistence and Postgres for materialized per-tenant coherence scores, ensuring fast reads.
- **GraphQL API:** Providing queries, mutations, and real-time subscriptions for coherence data.
- **Observability:** Comprehensive metrics, logs, and traces with SLO gating.
- **Policy & Privacy:** Implementation of ABAC policies and cost controls.
- **Testing & Evidence:** Rigorous unit, integration, and E2E testing, with automated evidence bundle generation.
- **Release & Runbooks:** Defined processes for release, canary deployments, and operational runbooks.

## Tactical Modules

This portfolio includes a suite of tactical Python modules designed to support advanced analysis and simulation capabilities:

- `activity_replay_engine.py`: Simulates and audits historical activity sequences.
- `narrative_impact_model.py`: Scores narratives by their psychological and behavioral impact.
- `opposition_injector.py`: Emulates red team activity, interference, and deception.
- `graph_resilience_monitor.py`: Measures influence graph robustness under stress.
- `psy_signal_encoder.py`: Encodes psychological tactics into signal formats.
- `mission_vault.py`: Archives mission scenarios with cryptographic integrity.
- `trust_score_calculator.py`: Evaluates trust across nodes and actor paths.
- `impact_proof_generator.py`: Generates cryptographic "proofs of impact."
- `activity_fingerprint_index.py`: Hashes and catalogs activities to avoid duplication.
- `multiagent_scenario_runner.py`: Simulates complex agent interactions in high-stakes environments.

## CI/CD Pipeline

The included `ci.yml` GitHub Actions workflow ensures code quality and operational readiness, supporting Python 3.11 and `pytest` for automated testing. It runs automatically on pushes and pull requests to the `main` branch.

## Next Steps

- Implement the core logic within each tactical module.
- Expand test coverage for all modules.
- Begin authoring detailed scenarios in the `config/` directory.
- Consider adding `.env.example` and `requirements.txt` for dependency management.
