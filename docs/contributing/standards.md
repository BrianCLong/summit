# Code Style & Contribution Standards

To maintain code quality and reliability, all contributors must follow Summit's defined coding, documentation, and PR standards.

## 1. Branch Naming Conventions

Use the format `type/scope/description` for short-lived feature and fix branches:
- `feat/ingest/add-rss-connector`
- `fix/graph/node-expansion-crash`
- `docs/api/update-schema`

*Release and Hotfix Branches:*
- Release branches use `release/vX.Y` when stabilization is needed.
- Hotfixes branch from `main` as `hotfix/<issue>` and are cherry-picked onto the active `release/vX.Y` branch.

## 2. Commit Message Format

Summit strictly enforces [Conventional Commits](https://www.conventionalcommits.org/).

**Format:**
```
type(scope): description

body (optional)

footer (optional)
```

**Types:**
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `test`: Adding missing tests or correcting existing tests
- `chore`: Other changes that don't modify src or test files
- `refactor`: A code change that neither fixes a bug nor adds a feature

**Co-authoring:**
When collaborating with an AI or another human, use the `Co-authored-by` trailer to give credit:
```text
feat(graph): implement new graph algorithm

Implemented PageRank using the new GDS library.

Co-authored-by: Copilot <copilot@github.com>
Co-authored-by: Alice Smith <alice@example.com>
```

All commits **must be signed**.

## 3. Code Style & Linting

Before creating a PR, always check your code formatting and linting:

- **Format:** `pnpm format:check`
- **Lint:** `pnpm lint` (Treat warnings as failures locally)

### Specific Development Standards
- TypeScript test imports must explicitly use `import type` to prevent Node runner errors.
- Do not log or put secrets in the shell history.
- Python imports require correct `PYTHONPATH` references.

### Security Vulnerability Scans
In CI workflows, Trivy vulnerability scanning is implemented as two separate steps:
- A `warn` step on HIGH severity (`exit-code: 0`).
- A `block` step on CRITICAL severity (`exit-code: 1`).

## 4. Documentation Standards

### Research Artifacts
Research artifacts in `docs/research/` must include a metadata section explicitly detailing 'Assumptions', 'Limitations', and 'Explicit Non-Claims' (or 'Limitations and Further Questions') as per the rules defined in `docs/research/ARTIFACT_STANDARDS.md`.

### Runbooks and Deployments
When writing or updating deployment documentation (`docs/deployment/`), **do not** include actual secrets, PagerDuty keys, or webhook URLs. General deployment guides must be kept strictly separated from operator guides (`docs/operators/`), runbooks (`docs/runbooks/`), and playbooks (`docs/playbooks/`).
Prometheus/Alertmanager alert rules must include `runbook_url` annotations pointing to documentation in the `docs/runbooks/` directory, using the domain format `https://runbooks.intelgraph.io/`.

## 5. Architecture Decision Record (ADR) Process

When making major architecture changes, start by drafting an ADR.
The "Council of Solvers" (a set of specialized AI agents) automatically reviews PRs involving major architectural changes. If your PR receives automated feedback from "Jules" or "Amp", address the feedback as you would a human review.

Ensure ADRs address the core workflow: **Investigation → Entities → Relationships → Copilot → Results**.

## 6. PR Process and Review Expectations

- **Atomic PRs:** One feature or fix per PR. Avoid large "kitchen sink" PRs.
- **PR Template:** You must fill out the GitHub PR template completely (`.github/pull_request_template.md`).
- **Evidence Bundles:** Attach proofs (tests, screenshots) as required by `docs/evidence-bundle-spec.md`.
- **CI Gates:** Ensure all Fast Lane (Lint & Unit), Golden Path, and Security CI checks pass. `main` is always deployable and protected (PR + CI required; no direct commits).

*Note: Automated issue and pull request lifecycle management is handled by a stale bot configured in `.github/workflows/stale.yml`, typically applying a 30-day warning period and a 7-day closure grace period.*

## 7. Security Vulnerabilities

Security vulnerabilities for the Summit project are reported to `security@summit.ai`, with internal routing and incident response managed by the `@intelgraph-security` team. Do NOT use public issue templates to report security vulnerabilities; use the private reporting mechanisms outlined in `SECURITY.md`.
