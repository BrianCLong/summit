# Query-Time Pseudonymization Gateway (QPG)

The Query-Time Pseudonymization Gateway provides policy-driven, format-preserving tokenization and salted hashing for sensitive fields at the boundary of analytical workloads. Tokens are recoverable only via a split-key recovery vault that enforces quorum authorization.

## Features

- **Format-preserving tokenization** with deterministic outputs tied to tenant, purpose, and field context.
- **Salted hashing** for irreversible protection when reveal is not permitted.
- **Split-key recovery vault** requiring a quorum of hashed shares to reveal stored tokens.
- **Policy-driven transformations** loaded from `config/policies.yaml`.
- **TypeScript and Python client libraries** located under `sdk/qpg/`.

## Running the service

```bash
cd services/qpg
export QPG_TOKEN_SECRET="replace-me"
go run ./...
```

Command-line flags:

- `-policies` – Path to the policy configuration file (default `config/policies.yaml`).
- `-vault` – Path to the recovery share configuration file (default `config/vault.yaml`).
- `-addr` – Listen address (default `:8080`).

## API Overview

### `POST /tokenize`

```json
{
  "tenant": "acme",
  "purpose": "analytics",
  "payload": {
    "ssn": "123456789",
    "email": "user@example.com"
  }
}
```

Returns the payload with tokens or salted hashes applied according to policy.

### `POST /reveal`

```json
{
  "tenant": "acme",
  "purpose": "support",
  "field": "ticketId",
  "token": "ABC-123",
  "shares": ["alpha-key", "beta-key"]
}
```

Requires a quorum of valid shares and a policy that allows reveal for the requested field. Returns the original value when authorized.

## Testing

```bash
cd services/qpg
go test ./...
```
