# Clean PR Flow Prompt Pack

This guide bundles repeatable prompts for keeping PRs in the summit repository green and policy-aligned. Each prompt is designed for direct copy/paste into your preferred assistant.

## 1. Local dev pre-PR prompt
Use this before opening any PR, scoped to your staged changes:

> You are a senior engineer on the `BrianCLong/summit` repo.
> I am about to open a PR.
> 1) Inspect my staged changes and infer the intent of this change.
> 2) List all tests (unit, integration, snapshot, policy, etc.) that should pass for this change to be safe to merge in this repo.
> 3) Generate the exact commands to run those tests locally (use the repo’s existing tooling, not generic guesses).
> 4) Predict the most likely CI failures (lint, type, test, security, or OPA/policy gates) based on these diffs and point to risky files/lines.
> 5) Suggest minimal edits to fix those likely failures before I push.
> Answer in this structure:
> - Intent
> - Required checks
> - Local commands
> - Likely CI/policy issues
> - Concrete code edits (with file:line references)

## 2. PR description / body prompt
Use this to generate consistent PR descriptions that satisfy reviewers and policy gates:

> You are writing the PR description for a change in the `summit` repository.
> Analyze the git diff and output a PR body that:
> - Starts with a crisp one-sentence summary.
> - Lists implementation details as bullets.
> - Explicitly calls out breaking changes, migrations, or config/infra impacts.
> - Links or opens TODOs for missing tests, documentation, or policy wiring.
> - Contains a checklist of repo-standard gates, pre-filled with [x] or [ ] (tests, lint, security, OPA/policy, docs, release notes, etc.).
> Do NOT restate the diff; describe behavior and risks.
> Output only Markdown suitable for a GitHub PR body.

## 3. "Fix the red CI" prompt
Use this when a CI check fails and you need a quick triage plan:

> You are a CI triage engineer on the `summit` repo.
> Given:
> - The current PR title and description.
> - The diff (or key files).
> - The failing CI logs.
> 1) Classify the failure: lint / type / unit / integration / infra / OPA-policy / flaky / unrelated.
> 2) Explain the root cause in 1–2 sentences in plain language.
> 3) Point to the exact file/line(s) most likely responsible.
> 4) Propose specific code changes or config changes to make CI pass, minimizing the diff.
> 5) If the failure indicates a missing or overly strict policy, suggest how to tune the GitHub Actions or OPA policy for this repo without weakening critical protections.
> Answer in:
> - Classification
> - Root cause
> - Files/lines
> - Patch plan
> - (Optional) Policy/CI pipeline improvements

## 4. Code review / "ready to merge?" prompt
Use this as a final gate before requesting review or self-merging:

> Act as a code owner for the `summit` repo.
> Review the diff with these goals:
> - Confirm it matches the stated intent in the PR description.
> - Verify it meets the project’s standards for readability, modularity, and test coverage.
> - Check for violations of security, privacy, and operational policy that would be enforced by CI or OPA.
> - Identify any change that is risky for production (data shape changes, migrations, external API behavior, auth, or logging).
> For each risk, state:
> - Why it is risky.
> - Whether it is a blocker for merge or can be a follow-up.
> - The smallest change that would de-risk it now.
> End with a verdict:
> - “Approve to merge”, or
> - “Changes requested: …” (with a bullet list of required edits).

## 5. Hard-mode release / OPA gate prompt (optional)
Use this to design and maintain OPA policies that keep releases green-only:

> You are designing and maintaining OPA policies for the `summit` repo to enforce safe PRs and releases.
> 1) Infer the key safety invariants from this repo’s structure, workflows, and past CI configuration (e.g., tests that must pass, directories that require extra reviewers, migration guardrails, feature-flag expectations).
> 2) Propose a set of high-level policy rules that must be true before a PR can be merged or a release workflow can succeed.
> 3) For each rule, show:
>    - The intent in English.
>    - The signals that GitHub Actions can gather (checks, labels, paths, PR body content, approvals).
>    - A sketch of how this would be expressed in OPA/Rego and wired into a GitHub Action as a fail-closed gate.
> 4) Prioritize the rules into P0, P1, P2 with rationale, optimizing for “green when safe, red when dangerous,” not bureaucracy.
> Output: concise bullets plus example policy snippets, suitable to drop into `policy/` and CI workflows.

## Usage notes
- Treat each prompt as a reusable template; copy/paste directly into your assistant without modification unless your change needs extra context.
- Combine with the repo’s commit/branch conventions and CI instructions in `AGENTS.md` to stay aligned with enforcement tooling.
- Keep snapshots of prompt responses with your PR to simplify audits and CI triage.
