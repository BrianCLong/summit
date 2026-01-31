# Contributing to Summit

Welcome to the Summit platform! We build intelligence tools for high-stakes environments, so we value **reliability, clarity, and provenance** above all else.

Whether you are a human developer or an AI agent, this guide will help you contribute effectively.

## 🌟 Core Philosophy

1.  **Deployable-First**: The `main` branch must always be deployable. If the build breaks, fixing it is the top priority.
2.  **The Golden Path**: We protect the core workflow: **Investigation → Entities → Relationships → Copilot → Results**.
3.  **Provable Changes**: Every change must be verifiable via tests (`make smoke`).

## 🚀 Getting Started

If you are new here, please start with our **[Developer Onboarding Guide](docs/ONBOARDING.md)**. It will get you from `git clone` to a running stack in under 30 minutes.

### The "Golden Path" Command

```bash
make bootstrap && make up && make smoke
```

This sequence is our contract. If it passes, your environment is healthy.

## 🔖 Contribution Playbooks

For ready-to-use templates that keep issues and PRs crisp, copy the relevant playbook from **[Contribution Playbooks](docs/CONTRIBUTION_PLAYBOOKS.md)**:

- **Feature**: scope, rollout, observability, and Definition of Done checklists.
- **Bugfix**: reproduction, guardrails, regression coverage, and backport plan.
- **Documentation**: audience, coverage, link verification, and asset expectations.

## 🛠 Development Workflow

### 1. Issue & Branching

- **Pick an Issue**: Check our [Roadmap](docs/roadmap.md) or [Issues](https://github.com/BrianCLong/summit/issues).
- **Branch Naming**: Use the format `type/scope/description`.
  - `feat/ingest/add-rss-connector`
  - `fix/graph/node-expansion-crash`
  - `docs/api/update-schema`

### 2. Making Changes

- **Atomic PRs**: One feature or fix per PR. Avoid "kitchen sink" PRs.
- **Conventional Commits**: We strictly enforce [Conventional Commits](https://www.conventionalcommits.org/).
  - `feat: ...`, `fix: ...`, `docs: ...`, `test: ...`, `chore: ...`
- **Testing**:
  - **Unit**: `pnpm test` (Jest)
  - **E2E**: `pnpm e2e` (Playwright)
  - **Smoke**: `make smoke` (Core integration loop)

### 3. Submission

- Open a Pull Request against `main`.
- Fill out the PR template completely.
- Ensure all CI checks pass (Lint, Unit, Golden Path).

## 🤖 Guidelines for External Contributors (Bots & Co-authors)

We welcome contributions from AI agents and automated systems. To reduce friction and ensure safety, please follow these rules:

### For AI Agents & Bots

1.  **Read the Instructions**: You **MUST** read and adhere to [`AGENTS.md`](AGENTS.md). It contains specific directives for code generation, architectural boundaries, and prohibited actions.
2.  **Honor the Quality Charter**: Follow the Agent Quality Charter (in `AGENTS.md`)—no debug print statements or commented-out code; run `pnpm format:check` and `pnpm lint` (treat warnings as failures) locally before opening a PR.
3.  **Sign Your Work**: All commits must be signed.
4.  **Context Awareness**: Do not hallucinate dependencies or APIs. Verify existence before importing.
5.  **No-Op Changes**: If you need to force a review on an existing file without functional changes, add a non-breaking comment or whitespace change to trigger the diff.

### Co-authoring

When collaborating with an AI or another human, use the `Co-authored-by` trailer in your commit message to give credit.

```text
feat: implement new graph algorithm

Implemented PageRank using the new GDS library.

Co-authored-by: Copilot <copilot@github.com>
Co-authored-by: Alice Smith <alice@example.com>
```

### The "Council of Solvers"

Major architectural changes are reviewed by our internal "Council of Solvers" (a set of specialized AI agents). If your PR receives automated feedback from "Jules" or "Amp", treat it as you would a human code review.

## 🔐 Secrets Handling & Shell Hygiene

Summit treats secret handling as a production safety requirement. Before contributing, review the
[Summit Readiness Assertion](docs/SUMMIT_READINESS_ASSERTION.md) and keep all credentials out of
commands, history files, and logs.

### Non-Negotiables

1. **Never put secrets in commands.** Use env files, keyrings, or credential helpers.
2. **Prefer `.env` + process env:** load with a tool, not inline.
3. **Use secret managers:** 1Password CLI, Bitwarden CLI, AWS Secrets Manager, GCP Secret Manager,
   Azure Key Vault, Doppler, etc.
4. **For Git remotes/registries:** use token helpers (e.g., `gh auth login`, `npm login --auth-type=web`,
   `docker login` with a credential store).

### Bash History Hardening

Add the following to `~/.bashrc` (or `~/.bash_profile` on macOS):

```bash
# Don't save commands that start with a space
export HISTCONTROL=ignorespace:erasedups

# Avoid recording commands likely to contain secrets
export HISTCONTROL=$HISTCONTROL:ignoreboth
export HISTIGNORE='*sudo -S*:*password*:*token*:*secret*'

# Reduce history retention
export HISTSIZE=2000
export HISTFILESIZE=4000
```

Reload your shell with:

```bash
source ~/.bashrc
```

### Cleanup Checklist

- Search shell history for leaks and delete them.
- Rotate any secret you discover in history or logs.
- Keep `.env` files out of version control and set strict permissions.

## 📦 Release Cadence & CI/CD

- **Release Cadence**: Weekly cut to staging each Tuesday 18:00 UTC; production releases every other Thursday after a 48-hour soak and green merge-train. Emergencies use the hotfix path below.
- **Branch Policies**:
  - `main` is always deployable and protected (PR + CI required; no direct commits).
  - Short-lived work branches follow `type/scope/description` (e.g., `feat/ingest/add-rss-connector`, `fix/api/auth-refresh`), rebased on `main` before merging.
  - Release branches use `release/vX.Y` when stabilization is needed; only cherry-picked fixes and release-note updates land there.
  - Hotfixes branch from `main` as `hotfix/<issue>` and are cherry-picked onto the active `release/vX.Y` branch after verification.
- **Release Captain**: Our automated Release Captain ("Jules") manages the merge train, tagging, and release freezes during incidents.
- **Sprints**: We operate on a sprint cadence (currently Q4 2025 Strategic Sprints).
- **CI Gates**:
  - **Fast Lane**: Lint & Unit tests (blocking).
  - **Golden Path**: Full stack integration test (blocking).
  - **Security**: SAST/DAST & Secret Scanning (blocking).

## ⚖️ Governance

- **Code of Conduct**: Please adhere to our [Code of Conduct](CODE_OF_CONDUCT.md).
- **License**: Contributions are accepted under the terms in [`CONTRIBUTOR_LICENSE_AGREEMENT.md`](CONTRIBUTOR_LICENSE_AGREEMENT.md).

Thank you for building with us!
