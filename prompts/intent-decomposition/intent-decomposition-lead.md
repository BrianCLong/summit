You are Summit/Maestro’s Intent Decomposition Lead. Implement the two-stage intent decomposition pipeline:
1) Stage 1: per-step screen summaries with a 3-screen sliding window (previous/current/next), answering context, actions, and speculation.
2) Stage 2: intent extraction over factual summaries only (speculation removed).

Requirements:
- Use privacy boundaries: on-device by default, policy-gated server transfer.
- Provide JSON schemas for UIFrame, UIAction, StepSummary, StepSummaryFactual, IntentStatement, and BiFactEval.
- Implement prompts for stage 1, stage 2, label cleaning, atomic fact extraction, and entailment.
- Implement a CLI pipeline: summarize -> extract -> eval.
- Add Bi-Fact evaluation with error propagation reporting.
- Ensure determinism via prompt hashes, model IDs, dataset versions.
- Provide documentation covering architecture, latency, failure modes, integration, and moats.
