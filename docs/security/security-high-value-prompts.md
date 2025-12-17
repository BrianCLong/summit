# Security Program High-Value Prompts (Set 2)

These prompts extend the initial ten security prompts by focusing on governance, observability, incident learning, and people/process risks. Use them to drive deeper reviews and create actionable backlogs.

11) **Logging & observability hardening**

```
**Prompt:**
> Observability hardening review for service <name>.
> Inputs: what the service does, current logging/metrics/traces stack, and an example of a recent incident.
> Output: minimum critical security logs, fields needed for forensics, suggested log retention, and alerts that detect abuse (auth failures, unusual access, data exfil patterns).
```

12) **IAM & least-privilege review**

```
**Prompt:**
> IAM least-privilege review for environment <prod/stage>.
> Inputs: summary of main IAM roles/policies (humans, CI/CD, services).
> Output: over-broad roles list, suggested policy diffs to reduce scope/lifetime, and a phased rollout plan with blast-radius analysis.
```

13) **Regression shield for past incidents**

```
**Prompt:**
> Regression shield for incident <short name>.
> Inputs: brief incident summary and root cause.
> Output: concrete tests, CI checks, and policies that would have prevented or detected the incident faster, plus a small backlog of follow-up hardening tasks.
```

14) **Onboarding security checklist**

```
**Prompt:**
> Design a security-first onboarding checklist for new engineers.
> Inputs: stack overview (GitHub/AWS/etc), main repos/services.
> Output: a checklist covering access requests, key policies, security training, and guardrails (pre-commit hooks, MFA/WebAuthn, secrets practices).
```

15) **Offboarding and access revocation**

```
**Prompt:**
> Harden offboarding process for departing staff/contractors.
> Inputs: systems in use (IdP, GitHub, AWS, SaaS tools).
> Output: time-bound step-by-step revocation plan, logs to verify, and checks to ensure keys/tokens/repos and third-party access are fully cleaned up.
```

16) **Third-party / SaaS risk review**

```
**Prompt:**
> Third-party/SaaS risk review for vendor <name>.
> Inputs: what data they see, what permissions they have (SCIM, SSO, repo access, etc.), and how critical they are.
> Output: risk assessment, least-privilege recommendations, contract/DPAs to verify, and monitoring you should enable (login audits, anomalous access).
```

17) **Data classification & tagging program**

```
**Prompt:**
> Design a lightweight data classification and tagging scheme for the org.
> Inputs: typical data types (source, PII, logs, metrics, financial, etc.).
> Output: 3–5 classification levels, example mappings, tagging rules (labels/metadata), and how to enforce them in CI/CD, storage, and tickets.
```

18) **Policy drift & exception management**

```
**Prompt:**
> Policy drift and exception review for our current security/infra policies.
> Inputs: examples of current policies and known exceptions.
> Output: where practice diverges from policy, a simple exception workflow, and a plan to either tighten controls or update policies to reflect reality.
```

19) **Risk-based backlog builder**

```
**Prompt:**
> Build a risk-ranked security backlog from these findings.
> Inputs: a list of existing issues/findings from scanners, audits, and incidents.
> Output: combined risk scoring (likelihood × impact), grouping into epics, and a 30/60/90-day implementation roadmap with “quick wins” flagged.
```

20) **Quiet insider / misuse detection (defensive only)**

```
**Prompt:**
> Design defensive-only patterns to detect potential insider misuse or compromised accounts *without* targeting individuals.
> Inputs: types of sensitive actions (mass exports, permission changes, prod data reads), and available audit logs.
> Output: anonymized/aggregate detection ideas, thresholds and alerts, and training/process changes that reduce risk without harassment or surveillance abuse.
```
