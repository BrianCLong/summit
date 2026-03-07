# Safety Research Selection & Claims Lock

## Sprint N+58 — AI Safety Research Translation

**Status:** Draft / Active
**Lead:** Jules
**Date:** October 2025

---

## 1. Research Artifacts

We have selected three high-signal safety research artifacts for this sprint. We focus on practical, shippable controls over theoretical alignment.

### Artifact A: "Constitutional AI / RLAIF" (Anthropic/DeepMind)

- **Source:** _Constitutional AI: Harmlessness from AI Feedback_ (Bai et al., 2022) / _RLAIF_ (Lee et al., 2023)
- **Specific Claim:** Explicitly defined "constitution" or policy guidelines during generation (or as a critique step) reduce harmful outputs more reliably than implicit instruction tuning alone.
- **Translation Hypothesis:** A **"Constitution Check"** guardrail that validates system outputs against a specific set of safety principles before returning them to the user will reduce policy violations.
- **Assumptions:**
  - A smaller, cheaper model (or the same model in a second pass) can effectively critique the output of the primary generation.
  - Latency overhead of a second pass is acceptable for high-stakes domains (like PsyOps defense).
- **Owner:** Jules

### Artifact B: "Indirect Prompt Injection Defense" (Security Research)

- **Source:** _Not what you’ve signed up for: Compromising Real-World LLM-Integrated Applications with Indirect Prompt Injection_ (Greshake et al., 2023)
- **Specific Claim:** Strictly separating untrusted data (e.g., retrieved content) from system instructions prevents the model from interpreting data as commands.
- **Translation Hypothesis:** An **"Input Sanitization & Boundary"** layer that tags and isolates retrieved content before it reaches the prompt context will prevent indirect injection.
- **Assumptions:**
  - We can reliably identify the boundary between "system instruction" and "user/retrieved data".
  - The LLM respects XML/delimiter boundaries when instructed.
- **Owner:** Jules

### Artifact C: "Hallucination Detection via Consistency Checks" (Self-Consistency)

- **Source:** _Self-Consistency Improves Chain of Thought Reasoning in Language Models_ (Wang et al., 2022)
- **Specific Claim:** Generating multiple responses and checking for consistency (or cross-referencing with a knowledge graph) significantly reduces hallucination rates in factual queries.
- **Translation Hypothesis:** A **"Fact Verification"** step that checks generated claims against the internal Knowledge Graph (Neo4j) will reduce hallucination.
- **Assumptions:**
  - The Knowledge Graph is ground truth.
  - We can map unstructured text claims to structured graph queries.
- **Owner:** Jules

---

## 2. Selected Mechanism for Implementation

For this sprint, we will focus on **Artifact B: Indirect Prompt Injection Defense** and **Artifact A: Constitutional Check** as a combined **"Input/Output Safety Layer"**.

We will implement a **"Safety Boundary"** mechanism in `ContentAnalyzer` and `DefensivePsyOpsService`.

### Mechanism Design: `SafetyBoundary`

- **Enforcement Point:** `server/src/services/SafetyBoundary.ts` (New Service)
- **Function:**
  1.  **Input:** Wraps user input in distinct XML tags (`<user_input>`) and system instructions in (`<system_instructions>`) to enforce separation (Artifact B).
  2.  **Output:** Performs a heuristic or model-based "Constitution Check" (Artifact A) on the output to ensure it doesn't violate specific safety policies (e.g., "Do not generate disinformation").
- **Bounded Scope:** Applied to "High Risk" interactions, initially enforced in `GeopoliticalOracleService` (Phase 1).
- **Failure Mode:** Fail-closed. If input is malformed or output violates constitution, return a standard error.

---

## 3. Evaluation Strategy

- **Metric:**
  - **Injection Success Rate (ISR):** % of adversarial prompts that successfully override system instructions.
  - **Refusal Rate (RR):** % of benign queries rejected (False Positives).
- **Harness:** A test suite of known injection attacks (Jailbreakbench/Greshake set) run against the `SafetyBoundary`.
