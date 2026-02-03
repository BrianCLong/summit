# Security Triage Runbook

This runbook standardizes the process for triaging and resolving security alerts, vulnerabilities, and governance gaps within the Summit ecosystem.

## 1. Core Triage Workflow

### “What do we do when a new alert appears?”

1.  **Acknowledge**: Record the alert in the `SECURITY_BACKLOG.md` (or relevant tracking system) within 4 hours for Critical/High alerts, and 24 hours for others.
2.  **Initial Assessment**:
    - Confirm if the alert is a true positive.
    - Determine the `affected_area` (e.g., `services/auth`, `infra/vpc`).
    - Identify the `owner` based on `CODEOWNERS`.
3.  **Containment**: If the alert indicates an active exploit or secret leak, immediately follow the [Security Incident Response Playbook](docs/runbooks/security-incident-response.md).
4.  **Remediation Planning**: Define the `fix_type` (config/docs/code) and assign a priority based on the classification below.

## 2. Classification and Prioritization

### “How do we classify and prioritize?”

We follow a risk-based approach combining CVSS scores with business context:

| Priority | Severity | Context                                                                  | SLA for Fix |
| :------- | :------- | :----------------------------------------------------------------------- | :---------- |
| **P0**   | Critical | Active exploit, secret leak in prod, or remote code execution (RCE).     | < 24 hours  |
| **P1**   | High     | Significant vulnerability in core service, transitive vuln in prod path. | < 7 days    |
| **P2**   | Medium   | Low-impact vulnerability, dev-only dependency vuln, or policy drift.     | < 30 days   |
| **P3**   | Low      | Minor documentation gap or informational scan result.                    | Best effort |

## 3. Evidence and Closure

### “What is the minimum evidence we attach before closing?”

Before closing an alert in the backlog or GitHub UI, the following evidence must be provided/linked:

1.  **Verification Scan**: Output from the relevant scanner (Trivy, Gitleaks, CodeQL) showing 0 findings for the affected area.
2.  **PR Link**: Reference to the atomic PR that implemented the fix.
3.  **Manual Validation (if applicable)**: A brief note or screenshot confirming the fix works in a non-prod environment.
4.  **Impact Assertion**: A statement confirming no breaking changes were introduced to runtime behavior (or that they were managed via governance).

## 4. CI Blockage and Outage Rules

### “What do we do when CI is blocked?”

- **Do NOT bypass gates**: Security gates (CodeQL, Trivy, Gitleaks) are mandatory. If CI is failing due to infrastructure issues, follow the [CI Unblocking Runbook](docs/runbooks/ci-unblocking.md).
- **Emergency Overrides**: Requires approval from at least two Release Captains and must be documented in the `SECURITY_BACKLOG.md` with a `fix_type: config (exception)` and a 7-day expiry.
- **Queue Congestion**: Prioritize security PRs (P0/P1) by using the `priority/security` label to move them to the front of the merge train.

### “What is considered ‘safe to merge’ during outages?”

During CI outages or "code freeze" periods, only the following are considered safe:

1.  **Documentation-only changes**: Updates to runbooks, READMEs, or policy docs.
2.  **Security Config updates**: Rotating leaked secrets, updating WAF rules, or pinning a SHA for a compromised GitHub Action.
3.  **Governance metadata**: Updating `CODEOWNERS` or `SECURITY_BACKLOG.md`.

_Note: No changes to `server/src`, `packages/_` runtime code, or core business logic are allowed during outages without a SEV1 incident declaration.\*

## 5. Specific Alert Handling

### Code Scanning (CodeQL / Gitleaks / Trivy)

- **True Positives**: Must be fixed in source. Do not use inline "ignore" comments unless a formal exception is recorded.
- **False Positives**: Mark as "False Positive" in the UI and provide a reasoning note. Add to `.trivyignore` or `.gitleaksignore` if persistent.

### Dependabot

- **Direct Prod Dependencies**: Highest priority. Update immediately.
- **Transitive Prod Dependencies**: Attempt to update the parent package or use `pnpm.overrides` as a temporary measure.
- **Dev Dependencies**: Triage as P2/P3. Group updates where possible to reduce CI noise.

### Supply-chain Provenance & SBOM

- Every release must have a generated SBOM and SLSA attestation.
- Failure to generate provenance blocks the release. See [PROVENANCE.md](docs/ga/PROVENANCE.md) for policy details.
