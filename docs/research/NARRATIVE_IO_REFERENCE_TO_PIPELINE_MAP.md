# Reference → Signals → Evaluation → Summit insertion point (Mapping Table)

| Reference | Key contribution | Signals / features to extract | Evaluation hooks | Summit insertion point |
|---|---|---|---|---|
| arXiv 2025 Narrative framing framework | Frames as values + components | value labels; causal attribution; remedy; moral eval; actor roles | frame F1; paraphrase stability; cross-domain transfer | Frame extractor → Frame graph builder |
| ACL SRW 2024 multilingual disinfo framing | Multilingual framing alignment | cross-lingual frame mapping; language-conditioned frame distributions | x-lingual consistency; language holdout | Multilingual embeddings → frame alignment |
| ACL 2023 beyond topical frames | Rhetorical/linguistic framing | evidentiality; implied causality; evaluative language cues | rhetorical ablation; robustness to keyword noise | Rhetoric/stance module feeding frame inference |
| Data in Brief 2025 framing dataset | Supervised framing dataset | labels + metadata for stratified tests | domain shift; calibration; error slices by outlet | Eval harness dataset + baselines |
| Springer 2025 framing-driven misinfo | Frame-informed misinfo detection | frame-conditioned misinfo score; narrative coherence vs factual anchors | compare vs topic-only; precision uplift | Misinfo model consuming frame outputs |
| SAGE 2025 framing element networks | Network framing method | framing-element co-occurrence networks; community structure | community stability; temporal delta | Graph analytics on framing networks |
| arXiv 2024 coordination survey | Coordination taxonomy | feature checklist by coordination class | class-based red-team suite; organic burst FP audit | CIB feature registry + governance rules |
| EPJDS 2025 Bayesian unsupervised CIB | Unsupervised cluster detection | latent coordination clusters; posterior confidence | stability under sampling; temporal holdout | Unsupervised detector → analyst queue |
| ACM 2025 cross-platform CIB | Cross-platform similarity linkage | cross-platform similarity edges; URL/text reuse | linkage P/R; duplication resistance | Cross-platform link graph → campaign stitching |
| Nature 2025 Telegram coordination | Telegram-scale network/cascades | repost/forward cascades; channel clusters | cascade anomaly; churn robustness | Telegram ingestion → cascade analytics |
| EU DisinfoLab 2024 CIB tree | Operational decision framework | thresholded decision signals; authenticity/intent checks | inter-annotator agreement; FP audits | OPA policies + analyst checklist UI |
| TandF 2024 lifecycle model | Campaign phases | phase markers: seeding/mimicry/amplification | phase transition detection | Timeline module on narrative clusters |
| arXiv 2025 X-Troll | Explainable troll detection | explanation spans; propaganda cues; appraisal dims | faithfulness + human utility + calibration | Explainable classifier → audit trail/evidence |
