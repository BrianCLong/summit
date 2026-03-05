# Maestro Spec Interview Data Handling

## Classification

- Interview transcript input: **Confidential**.
- Spec bundle artifacts: **Internal**.
- Task seeds: **Internal**.

## Logging Controls

Never log:

- API keys
- Access tokens
- Secrets
- User private notes

## Retention Guidance

- Keep raw interview inputs only as long as operationally required.
- Keep deterministic artifacts for audit and reproducibility windows.
- Apply least-privilege access to artifact directories.

## Security Posture

- Deny by default when mandatory sections or IDs are missing.
- Treat unresolved blocking questions as deployment blockers unless explicitly in MVS mode.
