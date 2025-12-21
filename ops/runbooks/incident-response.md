# Incident Response Runbook
- Detection: triage alerts from Grafana/Prometheus and OSSF security workflows.
- Containment: isolate affected services via feature flags and Helm toggles; rotate credentials.
- Eradication: patch vulnerabilities, revoke compromised tokens, and verify JWKS keys.
- Recovery: restore from clean backups and run provenance verifier against restored manifests.
- Post-incident: conduct blameless RCA within 72 hours; capture follow-up actions and SLO impacts.
