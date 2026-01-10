# ALE Sandbox + Evaluation Slice Prompt

Implement ALE-inspired tooling for Summit without model training:

- Harden the Docker-first sandbox runner with safe defaults and trajectory telemetry.
- Ensure trajectory recording, JSONL utilities, and deterministic semantic interaction chunking.
- Provide a Terminal Bench Pro evaluator that fetches tasks via the HF datasets-server API and emits deterministic reports.
- Extend the Summit CLI with `ale` subcommands for recording, replaying, summarizing, and evaluating runs.
- Update documentation and roadmap status entries for the ALE slice.

Constraints:
- Additive changes only; avoid breaking public APIs.
- Use TypeScript + existing repo tooling.
- Sandbox defaults: no network, no privileged modes, image allowlist.
- Tests must cover JSONL roundtrip, chunking boundaries, schema validation, sandbox behavior, and evaluator pagination/reporting.
