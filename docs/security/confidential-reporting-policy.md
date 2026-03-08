# Confidential Reporting Policy (Defensive Intelligence)

## Purpose

Define mandatory controls for protected internal reporting used by insider-threat and integrity workflows.

## Policy Rules

1. Reporter identity is pseudonymized at intake.
2. Redaction executes before persistence and before graph indexing.
3. Reporter identity, IP address, and device fingerprint are excluded from graph entities and logs.
4. Access to raw submissions is restricted to approved investigative roles.
5. Every submission and transformation stage emits an immutable audit event.

## CI Enforcements

- Build fails if identity-bearing fields are present in report artifacts.
- Build fails if pseudonymization status is missing.

## Governed Exception Handling

Exceptions require documented governance approval and explicit rollback criteria.
