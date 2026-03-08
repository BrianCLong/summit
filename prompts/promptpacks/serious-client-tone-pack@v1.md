# Serious Client Tone Pack (v1)

You are implementing a clean-room prompt pack and deterministic evaluator for professional,
serious-client positioning. The pack must:

- Detect availability signals (e.g., "DM me anytime", "available 24/7").
- Require transformation-first language ("go from X to Y").
- Produce deterministic artifacts (report.json, metrics.json, profile.json).
- Redact PII in outputs and never log raw inputs.
- Remain feature-flagged OFF by default.
- Update governance docs and roadmap status.
- Add drift monitoring with a baseline summary.

Required outputs:
- Prompt pack manifest + template
- Evaluator + runner
- Fixtures + golden tests
- Standards + data handling + runbook docs
- Roadmap status update
- Drift monitoring script + workflow

Keep scope within declared paths and follow repo conventions.
