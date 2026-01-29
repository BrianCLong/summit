# Intent Decomposition (Summit/Maestro)

## Summit Readiness Assertion
This implementation aligns with the Summit Readiness Assertion and codifies decomposition, provenance, and governance artifacts for intent extraction. The present system mandates deterministic prompts, policy-aware outputs, and evidence-backed summaries.

## System Design

### Architecture (text diagram)
```
UI Frames + Actions
  └─> Stage 1 Summarizer (3-screen window)
        ├─ produces StepSummary (factual + speculation)
        └─ writes summary store (JSONL / feature store)
             └─ Stage 2 Intent Extractor (factual-only)
                  └─ IntentStatement (policy-gated)
                       └─ Consumers (assist, retrieval, memory)

Evaluation Harness
  └─ Bi-Fact (atomic facts + entailment) + error propagation reports
```

### Privacy boundaries
- **On-device (default):** UIFrame screenshots/embeddings, accessibility trees, action streams, stage-1 summarization, speculation channel.
- **Server-permitted (policy-gated):** StepSummaryFactual, IntentStatement, Bi-Fact evaluation outputs, telemetry aggregates.
- **Policy gates:** all exports require policy engine approval (OPA). Redaction rules strip PII/sensitive intents (medical/legal/financial) before server transit.
- **Redaction strategy:** replace sensitive substrings with category tags (e.g., `[PII:EMAIL]`), drop raw screenshots, and store only vetted atomic facts.

### Latency + cost targets
- **Stage 1:** ≤120 ms p95 on-device for 3-screen window with quantized 1.5B–3B MLLM.
- **Stage 2:** ≤60 ms p95 with 0.5B–1.5B intent model.
- **Evaluation:** offline/CI, batch-mode.
- **Efficiency levers:** token-limited prompts, batching per trajectory, prompt caching, INT4 quantization, distillation to compact sequence-to-sequence heads, and reuse of cached factual summaries.

### Failure modes & mitigations
| Failure Mode | Mitigation |
| --- | --- |
| UI ambiguity / hidden elements | Use accessibility-tree-first summarization; emit high uncertainty and abstain.
| Missing screens | Allow null previous/next frames; mark inferred fields with higher uncertainty.
| Noisy action logs | Align actions to timestamps and confidence-weight actions vs UI state.
| Partial trajectories | Stage 2 abstains and emits "unknown / need more context".
| Adversarial UI / dark patterns | Run adversarial UI tests; enforce policy-aware intent redaction.
| Multilingual UI | Locale passed end-to-end; stage 1 runs language-id and locale-aware tokenizers.

## Data Model (JSON Schemas)
Schemas live in `packages/intent-decomposition/schemas/`:
- `ui-frame.schema.json`
- `ui-action.schema.json`
- `step-summary.schema.json`
- `step-summary-factual.schema.json`
- `intent-statement.schema.json`
- `bifact-eval.schema.json`

Each schema embeds versioning and provenance fields for determinism.

## Stage 1 Prompt + Runtime
- Prompt template: `packages/intent-decomposition/prompts/stage1-summary.md`
- Sliding window: previous/current/next frames plus action slice.
- Output JSON with factuality guardrails, evidence pointers, and uncertainty per field.

Runtime entrypoint:
```bash
summit-intent summarize \
  --input ./trajectory.json \
  --output ./summaries.json \
  --prompt packages/intent-decomposition/prompts/stage1-summary.md \
  --model llama3.2-vision
```

## Stage 2 Prompt + Fine-Tune Plan

### Baseline prompt (inference)
- Prompt template: `packages/intent-decomposition/prompts/stage2-intent.md`
- Input: StepSummaryFactual only (speculation removed by `stripSpeculation`).

### Fine-tune plan
1. **Build training pairs:** (StepSummaryFactual sequence) → (CleanedGold intent).
2. **Label cleaning:** `summit-intent clean-labels` uses `prompts/label-cleaning.md` to remove unsupported details.
3. **Speculation firewall:** only factual summaries are serialized for training. Speculation is never written into training pairs.
4. **Model options:**
   - **On-device:** Qwen2.5 1.5B, Phi-3.5-mini, or Gemma 2B with INT4.
   - **Server:** Llama 3.2 3B, Mistral 7B distilled head.
5. **Inference:** decode with temperature 0.2, top-p 0.9. If evidence coverage < 0.6, output "unknown / need more context".

## Evaluation Harness (Bi-Fact)

### Pipeline
1. Extract atomic facts from reference and predicted intents via `prompts/bifact-extract.md`.
2. Entailment checks (both directions) via `prompts/bifact-entailment.md`.
3. Compute precision/recall/F1 and produce error propagation attribution.

CLI:
```bash
summit-intent eval \
  --predicted ./predicted.json \
  --reference ./reference.json \
  --stage1 ./summaries-factual.json \
  --output ./bifact.jsonl \
  --extract-prompt packages/intent-decomposition/prompts/bifact-extract.md \
  --entail-prompt packages/intent-decomposition/prompts/bifact-entailment.md \
  --model qwen2.5-judge
```

### CI gate criteria (default)
- Bi-Fact F1 ≥ 0.72
- Hallucination rate ≤ 0.12
- Missed-fact rate ≤ 0.18
- Abstain rate ≤ 0.20 on gold trajectories with ≥3 steps

The CLI produces dashboard-ready JSONL and optional JUnit XML via `--junit` for CI gating.

## Product Integration
- **Next-best-action:** use IntentStatement with policy checks to surface suggestions.
- **Proactive assist offers:** gate via policy engine and confidence threshold.
- **Retrieval constraints:** filter doc retrieval to intents and atomic facts only.
- **Memory writes:** store only vetted atomic facts, never raw screens or action streams.
- **Audit logs:** store policy decision id, redactions, and prompt hashes for traceability.

## Moats (10+)
1. **Federated on-device fine-tuning with DP noise** — validate with differential privacy budget tests.
2. **Atomic-fact memory store** — unit tests ensure no screenshots or raw UI are stored.
3. **Cross-app intent stitching with provenance boundaries** — integration tests verify app isolation.
4. **Dual-judge evaluation with disagreement handling** — evaluation tests compare judge outputs.
5. **Hard-negative mining from near-miss intents** — training pipeline tests ensure negatives are injected.
6. **Active learning loop with single clarifying question** — UI tests verify fallback prompt flow.
7. **Adversarial UI robustness suite** — red-team test data ensures resilience to dark patterns.
8. **Accessibility-tree-first fallback** — unit tests ensure summarizer works without screenshots.
9. **Policy-aware intent redaction** — policy tests confirm sensitive details are removed.
10. **Streaming intent deltas** — integration tests verify incremental updates across steps.
11. **Evidence pointer validation** — schema tests ensure all entries include element references.
12. **Prompt-hash gating** — CI checks block unregistered prompt changes.

## Repository Integration Paths
- Package: `packages/intent-decomposition/`
- Prompts: `packages/intent-decomposition/prompts/`
- Schemas: `packages/intent-decomposition/schemas/`
- CLI: `packages/intent-decomposition/src/cli.ts`

## Minimal Runbook
1. Create trajectories JSON (UIFrame + UIAction).
2. Run stage 1 summaries.
3. Strip speculation and run stage 2 intent extraction.
4. Evaluate with Bi-Fact harness.

Example flow:
```bash
summit-intent summarize --input trajectory.json --output summaries.json --prompt packages/intent-decomposition/prompts/stage1-summary.md --model llama3.2-vision
summit-intent extract --input summaries.json --output intent.json --prompt packages/intent-decomposition/prompts/stage2-intent.md --model qwen2.5
summit-intent eval --predicted intent.json --reference gold.json --stage1 summaries-factual.json --output bifact.jsonl --extract-prompt packages/intent-decomposition/prompts/bifact-extract.md --entail-prompt packages/intent-decomposition/prompts/bifact-entailment.md --model qwen2.5-judge
```

The `eval` command accepts either `StepSummaryFactual` or full `StepSummary` files; speculation will be stripped automatically when present.
