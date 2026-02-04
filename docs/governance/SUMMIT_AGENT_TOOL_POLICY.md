# Summit Agent Tool Policy (v1)

This policy defines which developer/CI tools AI agents (Codex, Claude Code, Gemini, Qwen) may invoke, under what constraints, and how evidence must be produced.

## 1. Core principles

1. Least privilege: agents may invoke only the minimum tool surface to complete work.
2. Determinism: agents must prefer pinned tools and deterministic commands.
3. Evidence: any agent-run action that affects code, artifacts, or security posture must emit auditable evidence.
4. Safety: agents must not exfiltrate secrets, credentials, or proprietary data; must not run destructive commands outside approved paths.

## 2. Execution modes

### 2.1 Local developer workstation (trusted operator present)
Agents may run allowlisted tools and may propose commands that require human approval.

### 2.2 CI / controlled runners
Agents must not run interactive auth flows. Agents may run only non-interactive allowlisted tools. All outputs are captured.

## 3. Allowlist by category

### 3.1 Source control & repo inspection (Allowed)
- git (read-only by default; write operations limited to committed work)
- gh (read-only operations: view PRs/issues/workflows)
- git-sizer (analysis)

Constraints:
- No force-push.
- No rewriting history unless explicitly authorized.

### 3.2 Build/test/lint (Allowed)
- node/pnpm/npm (workspace commands only)
- actionlint, act (local-only; CI parity)
- pre-commit
- language linters/formatters where present

Constraints:
- No network downloads during build unless part of declared dependency install.
- Outputs must be reproducible.

### 3.3 Security & supply chain (Allowed, with evidence)
- syft, grype, trivy
- gitleaks
- cosign, slsa-verifier
- ossf-scorecard
- oras (artifact transport)

Evidence requirements:
- Store tool outputs under `evidence/` or `reports/` (repo convention), plus a summary entry in the security ledger if applicable.
- Include tool versions via `scripts/devstation/verify-tools.sh`.

### 3.4 Policy & config validation (Allowed)
- opa, conftest, regal, cue
- kubeconform, kube-linter

Constraints:
- Policy changes must include tests and example fixtures.

### 3.5 Cloud & cluster operations (Restricted)
- kubectl, helm, k9s, kustomize
- aws, gcloud, az
- terraform, tflint, tfsec

Default: NOT allowed for autonomous execution.
Allowed only when:
- Running against an explicitly approved sandbox environment, and
- With human operator approval, and
- With commands logged to an immutable transcript.

### 3.6 Prohibited tools/behaviors (Always prohibited)
- Direct credential scraping (e.g., reading `~/.ssh`, browser profiles, keychains)
- Unscoped destructive commands (`rm -rf /`, disk formatting, user deletion)
- Network scanning outside explicit scope
- Any attempt to disable security controls, tamper with evidence, or bypass gates

## 4. Evidence bundle requirements (when agents change code)

Every agent-authored PR must include:
1. Toolchain evidence: `devstation.evidence.json` (or CI equivalent)
2. Deterministic command transcript (commands run and relevant outputs)
3. Security checks relevant to change scope (e.g., SBOM/vuln scan for dependency changes)

## 5. Policy enforcement hooks (recommended)

- CI job: run `scripts/devstation/verify-tools.sh` and publish evidence artifact
- Pre-merge gate: require security scans on dependency or workflow changes
- Agent invocation wrapper: enforce allowlist/denylist + path constraints
