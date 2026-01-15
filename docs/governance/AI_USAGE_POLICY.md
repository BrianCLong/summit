# AI Usage Policy

**Authority:** Platform Engineering
**Version:** 1.0.0
**Effective Date:** 2026-01-15

## 1. Overview
This policy strictly governs the use of Generative AI (LLMs) within the automated CI/CD pipeline and runtime environment of IntelGraph. The goal is to ensure determinism, auditability, and cost control while enabling AI-assisted verification.

## 2. Core Principles
1.  **Determinism:** All AI operations in CI must be deterministic. If an operation produces variable output, it must be recorded and replayed.
2.  **Auditability:** Every AI decision affecting code or governance must be traceable to a specific model version, prompt, and input context.
3.  **Cost Control:** Live inference is forbidden in "Untrusted CI" (PR builds from forks). It is restricted to "Trusted CI" and "Release" pipelines.

## 3. Operational Modes

### 3.1 Record Mode (`ENABLE_QWEN_RECORD=true`)
-   **Allowed Contexts:** Local development, authorized admin sessions.
-   **Behavior:** Calls external LLM APIs (e.g., Qwen, GPT-4). Captures inputs (prompts) and outputs (responses) into a canonical JSON replay fixture.
-   **Artifacts:** Produces `replays/<service>/<scenario>.json`.

### 3.2 Replay Mode (`ENABLE_QWEN_REPLAY_ONLY=true`)
-   **Allowed Contexts:** All CI pipelines (PRs, Merges, Releases).
-   **Behavior:** Intercepts LLM calls. Hashes the input prompt + context. Lookups the response in the fixture.
-   **Failure Condition:** If a cache miss occurs (unknown prompt), the job **MUST FAIL** immediately with instructions to run Record Mode locally.
-   **Network Access:** Outbound internet access should be blocked for the replay process to ensure no accidental leakage.

## 4. Redaction & Privacy
-   All recorded fixtures must be scrubbed of secrets and PII before commit.
-   The `replay-scrubber` utility must run as a pre-commit hook on fixture files.

## 5. Enforcement
-   **Gate:** The "AI Determinism Gate" (CI job) enforces Replay Mode.
-   **Violation:** Any PR introducing a cache miss or non-deterministic behavior will be blocked.
