# Pilot Charter: Retrieval Protocol Moat Evaluation

## Objective

Convene the cross-functional stakeholders and select a single defensible moat candidate for the pilot. Document the success and kill thresholds for quality, p95 latency, cost-per-request, and reliability, and record validation from Product and Research leads.

## Stakeholders & Decision Record

- **Facilitator:** Pilot Owner (Architecture)
- **Product:** Product Lead, GTM Lead
- **Research/ML:** Research Lead, Applied Scientist
- **Engineering:** Retrieval Lead, Infra Lead
- **Security & Compliance:** Security Lead (advisory)
- **Decision:** Adopt a **retrieval protocol with design-around resistance** (schema-stable, adversarially robust retrieval and response contract) as the single moat candidate for the pilot.
- **Rationale:**
  - Locks in defensible differentiation by coupling protocol semantics to provenance, content hashing, and adversarial robustness (design-around resistance).
  - Minimizes integration friction by staying transport-agnostic while enforcing contract-level guarantees for grounding and traceability.
  - Aligns with roadmap epics for provenance ledger, policy-as-code, and RAG quality.

## Success and Kill Thresholds

_All thresholds apply to the pilot evaluation window (2 weeks) against the baseline retrieval stack._

### Quality (grounded response accuracy and safety)

- **Success:** ≥ **+7.5 pp** improvement in grounded correctness (IR win rate) vs. baseline **and** <1% hallucination rate on red-team set.
- **Kill:** < **+3 pp** improvement **or** ≥2% hallucination rate.

### Performance (p95 latency, end-to-end user request)

- **Success:** **p95 ≤ 850 ms** with cache cold-start; no more than +150 ms over baseline.
- **Kill:** **p95 ≥ 1100 ms** or regression ≥ +400 ms vs. baseline.

### Cost per Request (end-to-end, infra + model)

- **Success:** **≤ $0.045** per user request at pilot scale (10 RPS steady), with ≤ +10% vs. baseline.
- **Kill:** **≥ $0.06** per request **or** > +25% vs. baseline.

### Reliability (availability & error budget)

- **Success:** **99.5%+** success rate (non-5xx/4xx) across pilot traffic; error budget burn < 20% over window.
- **Kill:** **< 99.0%** success rate **or** error budget burn ≥ 40%.

## Validation

- **Product Lead:** Validated thresholds and moat selection (✔).
- **Research Lead:** Validated thresholds, evaluation protocol, and robustness emphasis (✔).

## Next Steps

1. Freeze the retrieval protocol contract and publish schema/guards to the integration repo.
2. Instrument metric collection for the four dimensions (quality, p95 latency, $/req, reliability) in the pilot dashboard.
3. Run the 2-week pilot, gating exit on meeting all success thresholds and avoiding kill conditions.
