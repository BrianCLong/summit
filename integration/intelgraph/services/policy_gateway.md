# Policy Gateway

## Responsibility

- Evaluate access policies for evidence artifacts.
- Issue policy decision tokens for downstream services.

## Inputs

- Subject context (role, organization).
- Purpose of use.
- Artifact metadata (type, sensitivity).

## Outputs

- Signed policy decision token.
- Denial reason codes when access is blocked.

## Observability

- Metrics: `policy.evaluate.count`, `policy.evaluate.denied`.
- Logs: policy version, subject, purpose.
