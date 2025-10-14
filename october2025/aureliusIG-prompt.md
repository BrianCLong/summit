sweet — here’s a tight, high-leverage set of **AURELIUS conversation starters**, grouped by mode and outcome. Copy/paste and fill the `{…}` blanks.

# Quick-Start Macros

* “**[SCOUT]** Map SOTA and leapfrog angles for `{problem}`. Timebox `{7}` days. Output: prior-art table, gap analysis, novelty matrix, top-3 attack vectors.”
* “**[ARCHITECT]** Design a patentable method for `{goal}` under `{constraints}`. Target products: `{Summit|IntelGraph|MC}`. Output: spec+pseudocode, interfaces, complexity, integration plan.”
* “**[EXPERIMENTALIST]** Run a pilot proving `{metric} > {baseline}+{delta}` on `{dataset}`. Grid: `{hparams}`. Output: plots, ablations, seeds, repro script.”
* “**[PATENT-COUNSEL]** Draft IP for `{invention}`. Output: 2 independent + 10 dependent claims, drawings list, FTO notes, PCT plan.”
* “**[COMMERCIALIZER]** Package `{artifact}` into licensable SKUs. Output: pricing, partner list, SSO hooks, claim-chart seeds.”

# JSON Kickoff Template

```json
{
  "mission": "Achieve {goal} via {approach}",
  "constraints": ["latency<{ms}", "privacy:{P0}", "license:Apache-2.0"],
  "target_products": ["Summit","IntelGraph","Maestro Conductor"],
  "repos": ["github.com/{org}/{repo}"],
  "success_metrics": [">{delta}% over {baseline} on {benchmark}", "p95<{ms}"],
  "deliverable_emphasis": ["patent","runtime","benchmark"],
  "timebox_days": 7
}
```

# SCOUT (Horizon & Novelty)

1. “Survey SOTA in `{topic}` and rank **claimable gaps** by enforceability and moat strength; propose 3 contrarian leaps.”
2. “Build a **kill-list** of assumptions in `{field}` we can overturn with new representations or training curricula.”
3. “Trace standards/SSOs relevant to `{tech}`; identify pending drafts we can influence with our method.”
4. “Construct a **threat model** for `{model/class}` (poisoning, MI, jailbreaks) and map IP opportunities in mitigations.”
5. “List datasets we can **synthesize or license** to gain durable data advantage; include ethics/compliance notes.”

# ARCHITECT (Design & Spec)

6. “Invent a **compiler pass** that turns `{policy}` into execution-time guards in our inference graph; give formal spec + interfaces.”
7. “Design a **provenance-first** embedding store with on-device redaction; provide asymptotic costs and memory plan.”
8. “Propose a **curriculum** that reduces hallucinations via `{mechanism}`; include ablation plan and eval contracts.”
9. “Sketch a **heterogeneous runtime** (CPU/GPU/NPU/WASM) for `{model_size}` with p95 `< {ms}`; include fallback logic.”
10. “Define a **zero-knowledge eval** protocol to prove `{property}` without leaking test sets; include security proof sketch.”

# EXPERIMENTALIST (Repro & Deltas)

11. “Stand up a benchmark comparing `{ours}` vs `{baselines}` on `{datasets}`; report cost/query and throughput/Watt.”
12. “Run **robustness sweeps** under distribution shift `{S}`; quantify calibration, abstention rate, and recovery time.”
13. “Evaluate **policy-aware RAG** on IntelGraph cases; metrics: factuality, provenance coverage, redaction precision/recall.”
14. “Do a **power analysis** to detect `{effect_size}` at α=0.05; set seeds and n; emit CI job matrix.”
15. “Prototype `{idea}` in 300 loc with synthetic data; ship notebook + CLI + Makefile that `make test && make run`.”

# PATENT-COUNSEL (Claims & FTO)

16. “Draft **claims** for a method that couples `{rep}` with `{training}` to guarantee `{property}`; enumerate design-arounds.”
17. “Create **drawings list** (flowcharts, timing, memory layout) for `{invention}`; tie each to claim elements.”
18. “Compose **FTO memo** against `{assignee/portfolio}`; highlight safe harbors and our differentiators.”
19. “Write **international strategy** (PCT timeline, key jurisdictions, SEP potential) for `{domain}`.”
20. “Generate a **prior-art table** (10 refs, arXiv/DOI, code links, licenses) and mark our novelty deltas.”

# COMMERCIALIZER (GTM & Licensing)

21. “Package `{artifact}` into SKUs (SDK, runtime, eval harness); propose pricing levers and OEM terms; add partner shortlist.”
22. “Draft a **standard-essential** positioning for `{protocol}` with FRAND considerations and SSO engagement plan.”
23. “Author a 1-pager for `{vertical}` quantifying ROI and integration steps into `{stack}`.”
24. “Create a **claim chart seed** vs `{competitor}` features; identify royalty base and damages model.”
25. “Define **compliance kit** (SBOM, SLSA, DPIA) for enterprise adoption in `{regulated market}`.”

# Summit/IntelGraph/MC-Specific

26. “Design **NL→Cypher** with policy-aware compilation; provide test corpus and leakage checks; integrate to IntelGraph.”
27. “Create **CompanyOS eval harness** with p95 latency, cost/query, and provenance completeness; wire Grafana panels.”
28. “Ship an **edge inference** path for `{task}` with WASM + SIMD; include cold-start budget and cache policy.”
29. “Implement **OPA hooks** for redaction and license gates; emit audit-ready traces (SPDX + cosign attestation).”
30. “Add **Stripe sandbox** telemetry → ROI dashboard; show activation→ARR funnel with statistically sane CIs.”

# Risk & Safety Starters

31. “Red-team `{invention}` for dual-use; propose rate-limiters, gating, and governance toggles.”
32. “Run **license hygiene**: enumerate inbound deps (no GPL/AGPL); produce SPDX/SBOM and third-party inventory.”

# Ultra-Short One-Liners

33. “New rep for `{modality}` that halves tokens — spec + pilot.”
34. “Train-time guard that enforces `{constraint}` — claims + ablations.”
35. “On-device RAG with p95<80ms — runtime + benchmark.”
36. “Zero-copy provenance through the stack — design + CI attestation.”
37. “Cost/query −40% at parity quality — plan + experiment grid.”

# “Fill & Fire” Kickoffs

```yaml
mission: "Reduce hallucinations via retrieval-calibrated decoding"
constraints: ["p95<120ms", "no GPL", "edge ready"]
target_products: ["IntelGraph","Summit"]
success_metrics: [">=5pt factuality gain on {bench}", "cost/query ≤ ${x}"]
deliverable_emphasis: ["patent","benchmark","runtime"]
timebox_days: 7
```

If you want, I can drop these into a canvas as a **Prompt Palette** with buttons (SCOUT/ARCHITECT/…); say the word and I’ll ship it.

