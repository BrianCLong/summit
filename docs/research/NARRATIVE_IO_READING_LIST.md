# Narrative Analysis & Information Operations — Curated Reading List (High-Signal)

Purpose: a compact set of academic + practitioner references you can wire into Summit’s narrative/CIB pipelines.
Each entry includes: (a) what it contributes, (b) what to extract as signals/features, (c) where it plugs into the system.

---

## 1) Narrative & framing analysis (methods + datasets)

### 1.1 Narrative framing framework (values + framing components) — arXiv (2025)
Link: https://arxiv.org/pdf/2506.00737
Why it matters: operationalizes “frame” beyond topic into values + framing components.
Signals/features:
- Frame/Value labels; frame-component spans; stance/valence around actors and events
- Frame graph nodes: {value, moral evaluation, causal attribution, remedy}
Eval ideas:
- Frame classification F1; stability under paraphrase; cross-domain transfer
Pipeline insertion:
- Frame extractor → Frame Graph builder → Narrative clustering

### 1.2 Multilingual news framing in Russia-backed disinfo campaigns — ACL SRW (2024)
Link: https://aclanthology.org/2024.acl-srw.21.pdf
Why it matters: multilingual framing under influence campaigns; helpful for cross-lingual normalization.
Signals/features:
- Cross-lingual frame alignment; outlet/region-conditioned frame distributions
Eval ideas:
- Cross-lingual frame consistency; language-generalization tests
Pipeline insertion:
- Multilingual embeddings → Frame alignment layer → Campaign analytics

### 1.3 Framing detection beyond topical frames — ACL (2023)
Link: https://aclanthology.org/2023.latechclfl-1.18.pdf
Why it matters: pushes framing detection toward linguistic/rhetorical structures.
Signals/features:
- Rhetorical cues; implied causality; evidentiality; evaluative language patterns
Eval ideas:
- Ablations on rhetorical features; robustness to keyword noise
Pipeline insertion:
- Rhetoric/stance module → Frame inference module

### 1.4 Media Framing Dataset (Mexico/Colombia local news) — Data in Brief (2025)
Link: https://www.sciencedirect.com/science/article/pii/S2352340925000162
Why it matters: provides a dataset for supervised framing models and domain-shift testing.
Signals/features:
- Frame labels; article metadata for stratified evaluation
Eval ideas:
- Domain shift (region/outlet) performance; calibration curves
Pipeline insertion:
- Training/eval harness dataset → Model registry baselines

### 1.5 Framing-theory-driven misinformation detection — Springer (2025)
Link: https://link.springer.com/article/10.1007/s42001-025-00403-w
Why it matters: ties framing theory into misinformation detection (bridges narrative + veracity).
Signals/features:
- Frame-informed misinfo likelihood; narrative consistency vs factual anchors
Eval ideas:
- Compare to topic-only models; precision uplift at fixed recall
Pipeline insertion:
- Misinformation classifier that consumes frame outputs

### 1.6 “Framing element networks” method — SAGE (2025)
Link: https://journals.sagepub.com/doi/full/10.1177/10776990251328597
Why it matters: network approach to framing elements; fits graph-native Summit design.
Signals/features:
- Co-occurrence networks of framing elements; community structure; centrality
Eval ideas:
- Community stability over time; event-response deltas
Pipeline insertion:
- Graph analytics (community detection) → Narrative evolution dashboards

---

## 2) Information operations & coordinated behavior detection (surveys + methods)

### 2.1 Survey: coordinated online behavior detection & characterization — arXiv (2024)
Link: https://arxiv.org/html/2408.01257v1
Why it matters: taxonomy of coordination signals; great for feature checklisting + evaluation design.
Signals/features:
- Coordination types: temporal, textual, network, account, cross-platform
Eval ideas:
- Red-team eval suite by coordination class; false positive tests on organic bursts
Pipeline insertion:
- CIB feature registry + policy rules (OPA) for gating

### 2.2 Unsupervised detection of coordinated info ops (Bayesian + amortized VI) — EPJ Data Science (2025)
Link: https://link.springer.com/article/10.1140/epjds/s13688-025-00544-y
Why it matters: unsupervised detection at scale; useful when labels are scarce/contested.
Signals/features:
- Latent coordination clusters; posterior confidence; actor-group emergence
Eval ideas:
- Stability under sampling; temporal holdout validation
Pipeline insertion:
- Unsupervised CIB detector → Analyst review queue with confidence

### 2.3 Cross-platform coordinated inauthentic activity (similarity networks) — ACM (2025)
Link: https://dl.acm.org/doi/10.1145/3696410.3714698
Why it matters: explicitly cross-platform—matches Summit’s “multi-surface” requirement.
Signals/features:
- Cross-platform similarity edges: text reuse, URL reuse, timing patterns
Eval ideas:
- Cross-platform linkage precision/recall; duplication-resistance tests
Pipeline insertion:
- Cross-platform link graph → campaign stitching + attribution support

### 2.4 Large-scale multilingual coordinated activity on Telegram — Nature (2025)
Link: https://www.nature.com/articles/s44260-025-00056-w
Why it matters: Telegram-scale campaign characterization; multilingual + network heavy.
Signals/features:
- Channel cluster signatures; forward/repost cascades; multilingual campaign markers
Eval ideas:
- Cascade anomaly detection; robustness to channel churn
Pipeline insertion:
- Telegram ingestion → network/cascade analytics → CIB detector

---

## 3) Practitioner frameworks & operational taxonomies

### 3.1 EU DisinfoLab “CIB Detection Tree” — PDF (2024)
Link: https://www.disinfo.eu/wp-content/uploads/2024/08/20240805-CIB-detection-tree.pdf
Why it matters: operational decision tree; excellent for policy checks + analyst SOPs.
Signals/features:
- Structured gating: coordination evidence thresholds, authenticity markers, intent/impact checks
Eval ideas:
- Inter-annotator agreement on “tree decisions”; FP audits
Pipeline insertion:
- Governance policies (OPA) + analyst playbooks + UI checklisting

### 3.2 Influence ops model: Identification → Imitation → Amplification — Intelligence & NatSec (2024)
Link: https://www.tandfonline.com/doi/full/10.1080/02684527.2023.2300933
Why it matters: phases/tactics taxonomy for campaign lifecycle modeling.
Signals/features:
- Phase markers: seeding, mimicry, amplification, narrative pollution
Eval ideas:
- Detect phase transitions; compare predicted vs known timelines
Pipeline insertion:
- Campaign timeline module → “phase labeling” on narrative clusters

---

## 4) Explainable / LLM-augmented IO detection

### 4.1 X-Troll: explainable detection of state-sponsored trolls — arXiv (2025)
Link: https://arxiv.org/html/2508.16021v1
Why it matters: explainability tied to propaganda/appraisal theory; helps governability.
Signals/features:
- Explanation spans; propaganda technique cues; appraisal dimensions
Eval ideas:
- Explanation faithfulness; human utility scoring; calibration
Pipeline insertion:
- Explainable classifier → audit trail + evidence bundle fields

---

## Appendix A — “What to build” checklist from this reading list

1) Frame extractor that outputs:
- (value / moral eval / causality / remedy) + actor roles + stance

2) Frame graph / narrative graph:
- nodes: frames, values, actors, claims, events
- edges: supports/attacks, causes, endorses, amplifies, imitates

3) CIB detector feature registry:
- temporal coordination
- text/URL reuse
- account/profile similarity
- network coordination
- cross-platform linkage

4) Campaign lifecycle labeling:
- Identification → Imitation → Amplification → (optional) Pollution/Confusion

5) Explainable outputs suitable for governance:
- evidence IDs, explanations, confidence, reproducibility hooks

---

## Appendix B — Suggested Summit folders

- docs/research/NARRATIVE_IO_READING_LIST.md (this file)
- docs/research/FEATURES_FRAME_CIB.yml (feature registry)
- policy/cib/ (OPA/Rego rules that reference the feature registry)
- eval/narratives/ (benchmarks + datasets + evaluation harness)
