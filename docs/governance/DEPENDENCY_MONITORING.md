# Dependency Monitoring

This document outlines the strategy and process for monitoring and updating dependencies in the Summit repository.

## Enabled Tool: Renovate

We use [Renovate](https://www.mend.io/free-developer-tools/renovate/) to automate dependency updates. It is configured in the `.github/renovate.json` file. Dependabot is intentionally disabled for `npm` and `github-actions` to avoid conflicts and redundant pull requests.

## Cadence

Renovate runs on the following schedule to open pull requests for outdated dependencies:

- After 10 PM and before 5 AM (Eastern Time) every weekday.
- Every weekend.

This schedule is designed to minimize disruption during core working hours. Lock file maintenance is scheduled for Sunday before 3 AM.

## How to Temporarily Disable in an Incident

If dependency updates are causing instability or interfering with an ongoing incident, Renovate can be temporarily disabled.

To disable Renovate, add the following line to the top of the `.github/renovate.json` file:

```json
"enabled": false,
```

**Important:** Remember to remove this line to re-enable Renovate once the incident is resolved. Create a follow-up ticket to ensure this happens.

## Ownership and Triage SLA

- **Assignees:** Initial PRs are assigned to BrianCLong as a default point of contact. The relevant `CODEOWNERS` are expected to review and merge the PRs.
- **Triage SLA:**
  - **Security Updates (`security` label):** Triage and merge within **24 hours**. These are often auto-merged if tests pass.
  - **Major Version Updates (`major-update` label):** Triage and begin migration planning within **5 business days**. These require manual review and will not be auto-merged.
  - **Minor and Patch Updates:** Triage and merge within **2 business days**. Many of these are auto-merged for known-safe packages.

## PR Labels and Merging

Renovate automatically labels PRs based on the type of update:

- `dependencies`: Applied to all Renovate PRs.
- `security`: For vulnerability alerts.
- `major-update`: For major version bumps requiring manual intervention.
- `dev-deps`: For development dependencies.
- `github-actions`: For updates to GitHub Actions.
- `react-19-compat`, `apollo-v5-compat`, `otel-v2-compat`: For specific ecosystems that require careful review.

**Auto-merging** is enabled for patch and minor updates of pre-approved, low-risk packages (e.g., internal tooling, linters) and security patches where possible. All major version updates require a manual review and merge.
