# Credential Broker Design

**Status**: v0.1 (Draft)
**Owner**: Jules
**Audience**: Security Engineers

## 1. Overview

The Credential Broker is a **Zero Trust** component. Agents **never** hold long-lived credentials (like AWS keys or Database passwords).

Instead, they request **short-lived**, **scope-bound** tokens just-in-time (JIT) to perform a specific action.

## 2. Broker Lifecycle

The lifecycle of a credential request:

1.  **Request**: Agent asks for a credential.
    *   `{"service": "aws-s3", "action": "list-buckets", "resource": "bucket-123"}`
2.  **Policy Check**: Switchboard validates the request against the OPA policy.
    *   *Check*: Is this agent allowed to list this bucket?
3.  **Issuance**: If allowed, the Broker mints a temporary token.
    *   *Example*: AWS STS `AssumeRole`.
    *   *Expiry*: 15 minutes (configurable).
4.  **Use**: The agent uses the token immediately.
5.  **Revocation/Expiry**: The token expires automatically. Manual revocation is possible via the Broker API.

## 3. Scope Model

Credentials are strictly scoped.

*   **Capability-Bound**: Tied to the specific verb/resource requested.
    *   *Good*: `s3:GetObject` on `bucket-a/file.txt`.
    *   *Bad*: `s3:*` on `*`.
*   **Time-Bound**: Valid for the minimum necessary duration (e.g., 5 mins).
*   **Tenant-Bound**: Cannot be used across tenant boundaries.

## 4. No-Ambient-Credentials

**Enforcement Pattern**:
*   Agents run in containers/VMs with **no** environment variables containing secrets.
*   The only way to get a secret is to call the Switchboard API.
*   The API call is authenticated via mTLS or a platform-injected identity token.

## 5. Audit Logging

Every credential issuance is logged immutably.

**Log Schema**:
*   `timestamp`: When issued.
*   `agent_id`: Who asked.
*   `scope`: What was granted.
*   `expiry`: When it dies.
*   `request_id`: The trace ID of the action.

**Must Not Log**:
*   The actual secret value (obviously).

## 6. Failure Handling

If the upstream provider (e.g., AWS IAM) fails:
1.  **Retry**: Exponential backoff (max 3 retries).
2.  **Fallback**: None. Fail closed.
    *   *Reason*: Security > Availability. Do not fall back to a less secure method.
3.  **Alert**: Trigger a high-priority alert ("Credential Minting Failure").

## 7. Interfaces (Pluggable)

The Broker supports multiple backends via a standard interface:

```typescript
interface CredentialProvider {
  mint(scope: string, duration: number): Promise<Secret>;
  revoke(tokenId: string): Promise<void>;
  rotate(secretId: string): Promise<void>;
}
```

**Supported Providers**:
*   AWS Secrets Manager / STS
*   HashiCorp Vault
*   Google Secret Manager
*   Azure Key Vault
*   Env Var Injection (Dev/Test only)
