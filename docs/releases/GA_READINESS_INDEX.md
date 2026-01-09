# GA Readiness Index

## Production Risk Envelope

The **Production Risk Envelope** defines the acceptable risk boundaries for deployments to the Summit platform. It classifies changes based on their impact (blast radius) and type, enforcing strict guardrails for high-stakes environments like GA.

### Policy Location
The definitive policy is located at: [`configs/risk/production-risk-envelope.yaml`](../../configs/risk/production-risk-envelope.yaml).

### Risk Levels

| Risk Level | Description | Required Gates |
| :--- | :--- | :--- |
| **Low** | Routine changes with minimal impact (e.g., UI tweaks, docs). | GA Gate |
| **Medium** | Moderate impact (e.g., localized code changes, additive config). | GA Gate, Dry-Run |
| **High** | Significant impact (e.g., core modules, schema changes, >5 modules). | GA Gate, Dry-Run, Evidence Bundle, War Room |
| **Blocked** | Changes not permitted in the target channel (e.g., schema breaking in GA). | N/A (Deployment Prevented) |

### Validation
Risk is automatically evaluated during:
1.  **GA Gate (`make ga`)**: Pre-flight check before promotion.
2.  **Release Governance**: CI/CD pipeline step blocking invalid releases.
3.  **Manual Check**: `node scripts/risk/validate_change_risk.mjs --files <file-list> --channel <channel>`

See [Risk & Incident Readiness](./RISK_AND_INCIDENT_READINESS.md) for more details.
