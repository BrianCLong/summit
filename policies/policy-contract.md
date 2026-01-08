# Policy Input/Output Contract

This document defines the standard contract for OPA policy execution within CompanyOS. All policies must adhere to this interface to ensure compatibility with the Policy Gateway and Provenance Ledger.

## 1. Input Contract (`input`)

The policy engine receives a JSON object with the following structure:

```json
{
  "subject": {
    "id": "user-123",
    "roles": ["admin", "editor"],
    "attributes": {
      "clearance": "top-secret",
      "department": "ops"
    },
    "tenant_id": "tenant-abc"
  },
  "action": {
    "name": "document.delete",
    "method": "DELETE",
    "path": "/api/docs/123"
  },
  "resource": {
    "id": "doc-123",
    "type": "document",
    "labels": {
      "classification": "confidential",
      "owner": "team-x"
    },
    "owner_id": "user-456"
  },
  "context": {
    "time": "2023-10-27T10:00:00Z",
    "ip": "192.168.1.1",
    "approval_id": "approval-789" // Optional, present if pre-approved
  }
}
```

### Required Fields

- `subject.id`: Authenticated user or service ID.
- `subject.roles`: List of assigned roles.
- `subject.tenant_id`: Tenant context.
- `action.name`: The operation being attempted.
- `resource.type`: The type of resource being accessed.

## 2. Output Contract (`result`)

Policies must return a JSON object with the following structure:

```json
{
  "allow": false,
  "deny_reasons": [
    "Resource is classified but user lacks clearance",
    "Dual-control approval required for deletion"
  ],
  "obligations": [
    {
      "type": "log_audit",
      "level": "critical",
      "message": "Failed access attempt to confidential doc"
    },
    {
      "type": "require_approval",
      "approvers_count": 2,
      "roles": ["security_admin"]
    }
  ],
  "metadata": {
    "policy_version": "v1.2.3",
    "risk_score": 85
  }
}
```

### Fields

- `allow` (boolean): Whether the action is permitted.
- `deny_reasons` (array of strings): Human-readable reasons for denial.
- `obligations` (array of objects): Side effects or requirements that must be satisfied.
  - Common obligations: `log_audit`, `require_approval`, `redact_fields`.
- `metadata` (object): Arbitrary data for debugging or logging.

## 3. Obligations Format

Obligations instruct the enforcement point to take specific actions.

### 3.1. Require Approval

```json
{
  "type": "require_approval",
  "approvers_count": 1,
  "eligible_roles": ["manager"]
}
```

### 3.2. Redaction

```json
{
  "type": "redact_fields",
  "fields": ["ssn", "credit_card"]
}
```

### 3.3. Notify

```json
{
  "type": "notify",
  "channel": "slack",
  "target": "#security-alerts",
  "message": "High risk action attempted"
}
```

## 4. Policy Bundle Structure

Policies are organized into bundles. The core bundles are:

- `core/approvals`: Logic for granting/validating approvals.
- `core/deletes_dual_control`: Logic enforcing multi-party authorization for deletions.
- `core/exports_redaction`: Logic for data export controls and redaction.

Each bundle should expose a `main` rule or a standardized `allow` rule.
