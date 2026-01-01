# Entitlements & Enforcement

Summit enforces entitlements based on your active plan. This ensures fair usage and system stability.

## Enforcement Mechanisms

### Policy-As-Code
We use Open Policy Agent (OPA) to enforce entitlements at the infrastructure level. Every request is checked against your plan's policies.

### Limits
- **API Requests**: Throttled per minute. Exceeding limits will result in `429 Too Many Requests`.
- **Storage**: Write operations will be blocked if storage limits are exceeded.
- **Seats**: You cannot add more users than your plan allows.

### Feature Gating
- **SSO**: Only available on Pro and Enterprise.
- **Audit Logs**: Retention periods are strictly enforced. Older logs are archived or deleted based on policy.

## Checking Your Usage
You can view your current usage and limits in the Admin Dashboard under "Billing & Usage".
The system provides real-time signals on your consumption relative to your quota.
