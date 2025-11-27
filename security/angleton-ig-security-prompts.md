# Angleton IG: High-Leverage Security Prompts

Use these prompts directly in Angleton IG to drive repeatable security coverage across code, CI/CD, infrastructure, and process. Pilot them on low-risk repositories or services first to validate outputs, then integrate the highest-value flows into your regular security cadence.

## How to Use This Pack
- **Copy/paste ready:** Each prompt is structured for quick reuse. Replace placeholders (e.g., `<org/repo>`, `<name>`) before submitting.
- **Attach inputs:** When possible, include links to the PR, workflow YAML, SBOM, or service docs so the assistant can ground responses.
- **Act on diffs:** Favor prompts that return concrete artifacts (patches, runbooks, checklists) you can apply immediately.
- **Track outcomes:** Log fixes landed, time-to-remediation, and false positives to refine which prompts enter your rituals.

## Priority Prompt Pack

1. **Pre-merge risk gate for PRs**
   **Prompt:**
   > Pre-merge risk gate for PR #<n> in repo <org/repo>.
   > Inputs: summarize the diff, secret-scan the changes, map any new attack paths, verify supply-chain attestations and SBOMs if available, and propose a minimal set of merge-blocking checks with a PR comment bundle.

2. **Supply-chain sweep**
   **Prompt:**
   > Supply-chain sweep (last 7 days) for these repos: <list repos>.
   > Use SBOMs, dependency locks, and any available attestations.
   > Output: new/changed dependencies, CVEs with risk ranking, suggested version bumps, and ready-to-apply PR patch sets.

3. **Assume-breach drill: token leak**
   **Prompt:**
   > Assume-breach drill: token leak in service <name>.
   > Inputs: brief description of what the service does and where tokens live.
   > Output: 30-minute containment plan, rotation plan, IAM tightening diff, and a safe rollback method.

4. **Counter-influence anomaly scan**
   **Prompt:**
   > Counter-influence anomaly scan (tickets & PRs).
   > Inputs: recent PR/ticket summaries or export.
   > Output: flag coordination patterns, reviewer anomalies, unexplained label churn, and propose non-accusatory training and process changes.

5. **Harden this workflow**
   **Prompt:**
   > Harden this GitHub Actions workflow for least privilege and supply-chain safety.
   > Input: YAML below.
   > Output: a minimal diff that adds OIDC, tight permissions, cache/dependency safety, artifact signing & verification, and freeze-window checks.

6. **Red team (defensive only) my service**
   **Prompt:**
   > Red team (defensive only) my service.
   > Inputs: service path, main routes/APIs, and auth model.
   > Output: threat model, abuse cases, authZ test ideas, and a patch set (code + OPA + tests) that raises baseline security without changing business behavior.

7. **Secrets exposure triage**
   **Prompt:**
   > Secrets exposure triage for repo <org/repo> (last 30 days).
   > Inputs: summary of any secret scanner outputs if you have them.
   > Output: rank findings by blast radius, suggest immediate containment and rotation steps, and propose long-term guardrails (pre-commit, CI gates, one-time provisioning flow).

8. **Infra blast-radius review**
   **Prompt:**
   > Infra blast-radius review for environment <prod/stage> on AWS.
   > Inputs: high-level description of EKS/EC2, IAM roles, NetworkPolicies/SecurityGroups.
   > Output: likely lateral-movement paths, prioritized IAM and network-tightening changes, and a staged rollout plan.

9. **Data & DLP review**
   **Prompt:**
   > DLP and access review for dataset <name>.
   > Inputs: what data it holds (PII/PHI/etc), where it’s stored (Postgres/S3/etc), and who currently accesses it.
   > Output: classify sensitivity, propose access model (ABAC/roles), redaction/tokenization ideas, and CI/CD checks to prevent accidental leakage.

10. **Tabletop drill: critical service outage / compromise**
    **Prompt:**
    > Tabletop drill: compromise of critical service <name>.
    > Inputs: what the service does, main dependencies, and SLOs.
    > Output: containment steps, communication plan, staged recovery (1%→10%→50%→100%), and evidence to collect for a post-incident review.

## How to Operationalize
- **Pilot quickly:** Run each prompt once on a low-risk repo/service to confirm outputs are actionable. Capture the best patterns as templates.
- **Embed in rituals:** Add 3–5 prompts to sprint rituals, release gates, or weekly security reviews so teams reuse them without rewording.
- **Track value:** Log time-to-action (e.g., number of PR-ready diffs, remediation SLAs) to prioritize the most effective prompts.
- **Create feedback loops:** Keep a shared doc or ticket label to record which prompts delivered useful diffs/runbooks, then prune or refine underperforming prompts.
