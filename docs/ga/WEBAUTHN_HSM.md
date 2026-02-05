# WebAuthn + HSM Credential Storage (GA)

> **Version**: 1.0  
> **Last Updated**: 2026-02-05  
> **Status**: Ready (enablement requires tenant policy + HSM provisioning)

## Scope

Provide WebAuthn step-up enforcement and HSM-backed key operations for sensitive actions.

## In-Repo Implementation

- WebAuthn middleware: `server/src/auth/webauthn/middleware.ts`
- Step-up policy references: `policies/webauthn_stepup.rego`
- HSM endpoints: `server/src/routes/v4/zero-trust.ts`
- HSM operational runbook: `server/src/conductor/runbooks/key-ceremony-runbook.json`

## Enablement

1. Provision HSM credentials and secrets per tenant.
2. Enable WebAuthn step-up for sensitive routes via policy.
3. Verify step-up enforcement in staging before production.
