# Explainability & Graph-XAI Differentiation

This document codifies the Graph-XAI differentiation plan for Summit/IntelGraph. It covers a publishable research agenda, public benchmarks for explainability, and case-study collateral that proves measurable value for users and buyers.

## Objectives

- Establish Summit as the reference implementation for Graph-XAI research and practice.
- Provide transparent, reproducible evidence of explainability quality through public benchmarks.
- Prove business and mission value with field-tested case studies grounded in customer outcomes.
- Reduce evaluation friction by shipping turnkey artifacts (datasets, code, notebooks, leaderboards) alongside papers.

## Research Publication Track

1. **Paper themes (2026 pipeline)**
   - **Counterfactual Path Explanations for Heterogeneous Graphs** (trustworthy intervention suggestions).
   - **Subgraph Rationales with Causal Attribution** (contrastive explanations that bound spurious correlations).
   - **Temporal Graph Explanations** (concept drift-aware rationales and stability metrics over time).
   - **Multi-agent Graph Copilot Evaluations** (human+AI teaming with transparent decision traces).
2. **Target venues**: KDD, NeurIPS Datasets & Benchmarks, ICML, ICLR workshops (XAI/graph tracks), Applied AI Letters.
3. **Artifacts & reproducibility**
   - Release code in `ga-graphai/packages/graphai` with permissive license and repro scripts (`scripts/xai-bench.sh`).
   - Publish Docker images with pinned dependencies; provide `requirements.txt` and lockfiles.
   - Supply experiment configs + seeds, tensorboard logs, and model cards for each paper.
   - Host datasets via Hugging Face or Open Graph Benchmark (OGB) mirrors with checksums.
4. **Governance**
   - Internal review board: Research Lead (owner), Security (PII/ethics), Product (use-case alignment).
   - Publication checklist: dataset license validation, bias audit summary, reproducibility run, policy sign-off.
5. **Cadence**
   - Drafts each quarter with rolling submissions; maintain a living queue of reviewer feedback and errata in `docs/explainability.md`.

## Public Benchmark Program

- **Benchmark suite composition**
  - **Datasets**: OGBN-Arxiv, OGBN-MAG, OGBG-MOLHIV, CORA, synthetic counterfactual graph sets.
  - **Tasks**: node classification, link prediction, community detection, temporal event prediction.
- **Metrics** (report mean ± std over 5 seeds)
  - **Fidelity** (deletion/insertion curves), **sparsity**, **stability** (temporal/perturbation), **faithfulness** (causal ablation), **human-alignment** (Likert scoring from SMEs), **runtime/latency**.
- **Baselines**
  - PGExplainer, GNNExplainer, GraphLIME, PGM-Explainer, SubgraphX, GRAPPA, counterfactual search baselines.
- **Benchmark harness**
  - Deterministic runners with seed control and cached downloads.
  - Built-in leaderboard generation (Markdown + JSON) and CI gate to prevent metric regressions.
  - Exportable artefacts: per-run provenance (configs, hashes), plots, and comparison tables.
- **Publication cadence**
  - Quarterly public drop with changelog and reproducibility badge; align with conference submissions.

## Case Studies & Value Proofs

- **Sectors**: national security/OSINT fusion, financial crime (AML), supply chain risk, and safety monitoring.
- **Design**
  - Work with two design partners per sector; define shared success metrics and qualitative feedback loops.
  - Capture before/after workflows, time-to-insight, and precision/recall changes after Graph-XAI adoption.
  - Package each case as a narrative + reproducibility kit (sample data, queries, explanation screenshots).
- **Metrics & outcomes** (examples)
  - > 30% faster analyst triage while keeping false-positive rate flat.
  - Measurable lift in explanation trust scores (Likert + SUS) and review-cycle reduction.
  - Audit-readiness evidence: provenance completeness and tamper-proof logs for explanations.
- **Distribution**
  - Publish externally consumable PDFs + blog posts; create short-form demos and talks for conferences.
  - Maintain internal gallery of exemplar explanation traces tied to benchmark metrics.

## Operating Model & Timeline

| Quarter | Milestones                                                                                                    |
| ------- | ------------------------------------------------------------------------------------------------------------- |
| Q1      | Benchmark harness MVP; pick datasets; draft paper outlines; select design partners.                           |
| Q2      | First benchmark release + leaderboard; submit at least one workshop paper; first case-study alpha.            |
| Q3      | Conference submissions for primary papers; publish two full case studies; add temporal/stability metrics.     |
| Q4      | Hardened reproducibility pipeline; public launch of benchmark v2 with counterfactual tasks; third case study. |

## Differentiation Checklist

- Clear, peer-reviewed methods with reproducibility artifacts.
- Transparent, open benchmarks with defensible metrics and baselines.
- Tangible customer outcomes through case studies tied to KPI deltas.
- Governance that enforces ethical data use, privacy controls, and auditability.
