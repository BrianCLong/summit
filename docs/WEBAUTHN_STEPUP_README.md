# WebAuthn Step-Up Authentication

**Purpose**: Enforce step-up authentication for high-risk operations using WebAuthn.

**Status**: Implemented for October 2025 delivery

---

## Overview

Step-up authentication provides an additional layer of security for risky routes by requiring users to re-authenticate with WebAuthn (biometric or security key) before performing sensitive operations.

### Risky Routes Requiring Step-Up

The following routes require step-up authentication:

- `/api/export` - Data export operations
- `/api/delete` - Entity deletion
- `/api/admin/users` - User management
- `/api/admin/permissions` - Permission changes
- `/api/config/update` - System configuration changes
- `/api/secrets/create` - Secret creation
- `/api/secrets/update` - Secret updates
- `/api/credentials/rotate` - Credential rotation

### Risky GraphQL Mutations

The following GraphQL mutations require step-up:

- `deleteEntity` - Delete graph entities
- `exportData` - Export graph data
- `updateUserPermissions` - Modify user permissions
- `createSecret` - Create secrets
- `rotateCredentials` - Rotate credentials
- `updateSystemConfig` - Update system configuration

---

## Architecture

### Components

1. **OPA Policy** (`policies/webauthn_stepup.rego`)
   - Evaluates whether route requires step-up
   - Validates step-up authentication tokens
   - Generates audit evidence

2. **Backend Middleware** (`backend/middleware/webauthn-stepup.js`)
   - Intercepts requests to risky routes
   - Calls OPA for policy decision
   - Emits audit events
   - Returns 403 with explanation if step-up required

3. **WebAuthn Service** (`backend/services/webauthn.js`)
   - Generates registration/authentication options
   - Verifies WebAuthn assertions
   - Manages credential storage

4. **Frontend Modal** (`frontend/components/StepUpAuthModal.tsx`)
   - Prompts users for step-up authentication
   - Uses `@simplewebauthn/browser` for WebAuthn flow
   - Displays clear explanation of why step-up is required

5. **Protected Routes** (`backend/routes/risky-routes.js`)
   - All risky routes with step-up middleware applied

---

## Step-Up Authentication Flow

### 1. User Attempts Risky Action

User tries to access `/api/export` without step-up:

```bash
POST /api/export
Authorization: Bearer <regular_token>
```

### 2. Middleware Blocks Request

Middleware detects missing step-up and returns 403:

```json
{
  "error": "Forbidden",
  "message": "Step-up authentication required for this operation",
  "required_action": "webauthn_stepup",
  "route": "/api/export",
  "help": "This is a high-risk operation. Please authenticate with your security key or biometric device."
}
```

### 3. Frontend Shows Modal

`StepUpAuthModal` component displays explanation and triggers WebAuthn flow:

- Fetches authentication options from `/api/webauthn/authenticate/options`
- Calls `startAuthentication()` from `@simplewebauthn/browser`
- Device prompts user for biometric or security key
- Verifies assertion with `/api/webauthn/authenticate/verify`

### 4. User Re-Attempts with Step-Up Token

Request includes step-up token in header:

```bash
POST /api/export
Authorization: Bearer <regular_token>
X-StepUp-Auth: <base64_encoded_stepup_token>
```

### 5. Request Allowed + Audit Evidence Emitted

Middleware validates step-up token and allows request. Audit event emitted:

```json
{
  "action": "allowed_with_stepup",
  "route": "/api/export",
  "user": "user_123",
  "stepup_auth": {
    "timestamp": 1728000000000000000,
    "credential_id": "credential_abc123",
    "authenticator_data": "base64_data...",
    "attestation_reference": "attestation_ref_xyz"
  },
  "policy": "webauthn_stepup.rego",
  "timestamp": 1728000000000000000
}
```

---

## Step-Up Token Format

Step-up tokens are base64-encoded JSON:

```json
{
  "credential_id": "credential_abc123",
  "authenticator_data": "base64_authenticator_data",
  "client_data_json": "base64_client_data",
  "signature": "base64_signature",
  "timestamp": 1728000000000000000,
  "attestation_reference": "attestation_ref_xyz"
}
```

**Validity**: 5 minutes (300 seconds)

---

## DLP Policy Bindings

The OPA policy also detects sensitive data patterns in risky route requests:

### Sensitive Data Patterns

- SSN (Social Security Number)
- Credit Card numbers
- API_KEY
- SECRET
- PASSWORD
- PRIVATE_KEY

When sensitive data is detected, a DLP violation is logged (but request is still allowed if step-up is valid).

---

## Testing

### Integration Tests

Location: `tests/integration/webauthn-stepup.test.js`

**Acceptance Criteria 1**: Blocking without step-up
- ✅ Request without step-up returns 403
- ✅ Response includes clear explanation ("Why blocked?")
- ✅ Response includes `required_action: "webauthn_stepup"`
- ✅ Help text provided

**Acceptance Criteria 2**: Allowing with step-up
- ✅ Request with valid step-up token returns 200
- ✅ Audit evidence emitted with attestation reference
- ✅ Audit evidence includes credential_id, authenticator_data, timestamp
- ✅ Policy name included in audit evidence

### Manual Testing

```bash
# Test blocking without step-up
curl -X POST http://localhost:3000/api/export \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"format": "json", "entityIds": ["ent_001"]}'

# Expected: 403 Forbidden with explanation
```

---

## Configuration

### Environment Variables

```bash
# WebAuthn configuration
WEBAUTHN_RP_NAME="IntelGraph Platform"
WEBAUTHN_RP_ID="localhost"  # or your domain
WEBAUTHN_ORIGIN="http://localhost:3000"  # or your app URL
```

### OPA Policy Path

Policies are loaded from `policies/` directory.

---

## Deployment

### 1. Deploy OPA Policy

```bash
# Copy policy to OPA policies directory
cp policies/webauthn_stepup.rego /etc/opa/policies/

# Reload OPA
curl -X POST http://localhost:8181/v1/policies/webauthn_stepup \
  --data-binary @policies/webauthn_stepup.rego
```

### 2. Apply Middleware to Routes

See `backend/routes/risky-routes.js` for examples of applying middleware.

### 3. Deploy Frontend Modal

Ensure `StepUpAuthModal.tsx` is imported and used in your app:

```tsx
import { StepUpAuthModal } from './components/StepUpAuthModal';

// Use in your component
<StepUpAuthModal
  isOpen={showStepUp}
  onClose={() => setShowStepUp(false)}
  onSuccess={handleStepUpSuccess}
  onError={handleStepUpError}
  route={targetRoute}
  reason="Step-up authentication required"
  help="This operation requires additional security verification"
/>
```

---

## Audit Evidence

All step-up authentication attempts (allowed and denied) emit audit events:

### Allowed Events

```json
{
  "action": "allowed_with_stepup",
  "route": "/api/export",
  "user": "user_123",
  "stepup_auth": { ... },
  "policy": "webauthn_stepup.rego",
  "timestamp": 1728000000000000000
}
```

### Denied Events

```json
{
  "action": "denied_missing_stepup",
  "route": "/api/export",
  "user": "user_123",
  "denial_reason": {
    "blocked": true,
    "reason": "Step-up authentication required for this operation",
    "required_action": "webauthn_stepup",
    "help": "..."
  },
  "policy": "webauthn_stepup.rego",
  "timestamp": 1728000000000000000
}
```

---

## Security Considerations

### Fail-Closed Design

- If OPA policy evaluation fails → request denied
- If step-up token verification fails → request denied
- If WebAuthn service unavailable → request denied

### Token Expiry

Step-up tokens expire after 5 minutes to prevent replay attacks.

### Credential Storage

In production, store WebAuthn credentials in a secure database (not in-memory Map).

### HTTPS Required

WebAuthn requires HTTPS in production environments.

---

## Troubleshooting

### "Step-up authentication required" error

- **Cause**: Attempting to access risky route without step-up
- **Solution**: Trigger WebAuthn flow via frontend modal

### "Step-up authentication expired"

- **Cause**: Step-up token older than 5 minutes
- **Solution**: Re-authenticate with WebAuthn

### "Authentication verification failed"

- **Cause**: Invalid signature or credential
- **Solution**: Ensure credential is registered for the user

---

## Related Documentation

- [OPA Release Gate Policy](../policies/release_gate.rego)
- [Security Waivers Register](../SECURITY_WAIVERS.md)
- [WebAuthn Service Implementation](../backend/services/webauthn.js)

---

**Contact**: security@example.com
**Issue Tracking**: #10064
