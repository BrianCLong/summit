# Auth & Security Hardening

## Overview
The authentication system has been hardened to follow best practices, including:
- **HttpOnly Cookies**: Tokens are now stored in secure, HttpOnly cookies instead of local storage.
- **Step-up Authentication**: Critical actions now require step-up authentication (MFA/WebAuthn).
- **Session Rotation**: Refresh tokens are used for session rotation.

## Authentication Flow

1. **Login**:
   - `POST /auth/login` with email/password.
   - Server returns `access_token` (1h) and `refresh_token` (7d) in HttpOnly cookies.
   - `SameSite=Strict` is used in production.

2. **Token Verification**:
   - Middleware checks `Authorization: Bearer <token>` header FIRST (for API clients).
   - Middleware checks `access_token` cookie SECOND (for Web UI).

3. **Logout**:
   - `POST /auth/logout` clears the cookies.

## Step-up Authentication

Sensitive actions (e.g., changing admin config) require a higher assurance level (Level 2).

### How it works
1. User attempts a sensitive action (e.g., `POST /admin/config`).
2. Middleware `requireStepUp(2)` checks for `mfa_token` cookie or `x-mfa-level` header.
3. If missing or insufficient, returns `401 Unauthorized` with `{ error: 'step_up_required', level: 2 }`.
4. Frontend prompts user for WebAuthn/FIDO2 verification.
5. Client calls `POST /webauthn/challenge` to get a challenge.
6. Client signs challenge and calls `POST /webauthn/verify`.
7. If valid, server sets a short-lived `mfa_token` cookie.
8. Client retries the original action.

### Adding a Sensitive Action

To protect a new route, wrap it with the `requireStepUp` middleware:

```typescript
import { requireStepUp } from '../middleware/stepup';

router.post('/dangerous-action', requireStepUp(2), (req, res) => {
  // ...
});
```

## Testing
- Run `npm test` in `server/` to run the auth test suite (`server/tests/auth.test.ts`).
- Ensure `NODE_ENV=test` is set.
