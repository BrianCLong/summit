# DAST Runbook

This runbook documents authenticated DAST scanning for staging, including baseline and incremental modes.

## Scope & Safety
- Target: `https://staging.intelgraph.local` behind VPN; CI workflow uses `DAST_TARGET` secret.
- Rate limits: 5 req/s, ZAP spider depth 3.
- Authentication: OIDC login flow using service account credentials in `DAST_USERNAME`/`DAST_PASSWORD` secrets.
- Allowed traffic: staging only; production is explicitly blocked via pre-flight host allowlist.

## Modes
- **Baseline:** Weekly regression scan via `.github/workflows/dast.yml` with ZAP baseline rules.
- **Incremental:** On every service PR touching server/routes, run `zap-api-scan` limited to changed endpoints derived from `git diff --name-only`.

## Workflow
1. Export auth cookie using `tools/security/dast/login_and_export.sh`.
2. Run ZAP scan with context file `tools/security/dast/context.yaml` and ruleset `tools/security/dast/policies/api-policy.yaml`.
3. Collect HTML/JSON reports; upload as artifacts.
4. Post findings to the ticketing webhook with severity mapping: Informational→info, Low→minor, Medium→major, High/Critical→blocker.
5. SLA timers: High/Critical due in 48h, Medium in 7d; tracked in `tools/security/dast/findings.jsonl`.
6. False positives can be suppressed by adding entries to `tools/security/dast/false-positives.yaml` with justification and expiry; expired suppressions automatically removed.

## Reproduction Steps
```bash
pnpm dlx @zaproxy/zap-baseline \
  -t "https://staging.intelgraph.local" \
  -g tools/security/dast/context.yaml \
  -P 8081 \
  -z "-config replacer.full_list\(0\).description=Auth" \
  -r dast-report.html
```

## Fix Guidance
- Prioritize auth bypass, injection, and leakage findings.
- When rate limits are triggered, widen retry intervals instead of disabling controls.
- Include remediation PR link in the DAST ticket to automatically close the issue when merged.
