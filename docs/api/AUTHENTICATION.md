# API Authentication Guide

## Overview

Summit API Gateway supports multiple authentication methods designed for secure intelligence operations:

1. **JWT (JSON Web Tokens)** - For user authentication
2. **OAuth 2.0 / OpenID Connect** - For third-party integrations
3. **API Keys** - For service-to-service authentication
4. **mTLS (Mutual TLS)** - For high-security environments

## JWT Authentication

### Token Structure

Summit uses JWT tokens with the following claims:

```json
{
  "sub": "user123",
  "email": "analyst@summit.gov",
  "roles": ["analyst", "admin"],
  "scopes": ["investigations:read", "investigations:write"],
  "iss": "summit-api",
  "aud": "summit-users",
  "exp": 1735689600,
  "iat": 1735686000
}
```

### Obtaining Tokens

**Login Request:**

```bash
curl -X POST https://api.summit.gov/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "analyst@summit.gov",
    "password": "your-password"
  }'
```

**Response:**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900,
  "tokenType": "Bearer"
}
```

### Using Tokens

Include the access token in the Authorization header:

```bash
curl -X GET https://api.summit.gov/api/v1/investigations \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Refreshing Tokens

When the access token expires, use the refresh token:

```bash
curl -X POST https://api.summit.gov/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

## OAuth 2.0

### Authorization Code Flow (Recommended)

**Step 1: Generate Authorization URL**

```bash
https://api.summit.gov/oauth/authorize?
  response_type=code&
  client_id=YOUR_CLIENT_ID&
  redirect_uri=https://your-app.com/callback&
  scope=investigations:read investigations:write&
  state=random-state-string&
  code_challenge=PKCE_CODE_CHALLENGE&
  code_challenge_method=S256
```

**Step 2: Exchange Code for Token**

```bash
curl -X POST https://api.summit.gov/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=AUTH_CODE" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "redirect_uri=https://your-app.com/callback" \
  -d "code_verifier=PKCE_CODE_VERIFIER"
```

### Client Credentials Flow

For service-to-service authentication:

```bash
curl -X POST https://api.summit.gov/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "scope=api:read api:write"
```

### PKCE (Proof Key for Code Exchange)

Generate PKCE parameters:

```javascript
// Generate code verifier
const codeVerifier = crypto.randomBytes(32).toString('base64url');

// Generate code challenge
const codeChallenge = crypto
  .createHash('sha256')
  .update(codeVerifier)
  .digest('base64url');
```

## API Keys

### Creating API Keys

**Via Portal:**
1. Log in to https://api.summit.gov/portal
2. Navigate to "API Keys"
3. Click "Create New Key"
4. Set name, scopes, and expiration
5. Copy the key (shown only once!)

**Via API:**

```bash
curl -X POST https://api.summit.gov/api/keys \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production Integration",
    "scopes": ["investigations:read"],
    "expiresIn": 31536000000,
    "rateLimit": {
      "requests": 1000,
      "window": 60000
    }
  }'
```

### Using API Keys

**Header Method (Recommended):**

```bash
curl -X GET https://api.summit.gov/api/v1/investigations \
  -H "X-API-Key: sk_live_..."
```

**Query Parameter Method:**

```bash
curl -X GET "https://api.summit.gov/api/v1/investigations?api_key=sk_live_..."
```

### API Key Format

```
sk_live_YOUR_SECRET_KEY_HERE_REPLACE_WITH_ACTUAL_KEY_FROM_PORTAL
│   │    │
│   │    └─ Key secret (32 bytes, base64url)
│   └────── Environment (live/test)
└────────── Prefix
```

### Key Rotation

Rotate keys regularly for security:

```bash
curl -X POST https://api.summit.gov/api/keys/key_123/rotate \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## mTLS Authentication

### Certificate Requirements

- X.509 certificates
- 2048-bit or higher RSA keys
- Valid certificate chain
- Allowed CN (Common Name)
- Allowed Organization

### Configuration

**Server Configuration:**

```typescript
import https from 'https';
import fs from 'fs';

const server = https.createServer({
  cert: fs.readFileSync('server-cert.pem'),
  key: fs.readFileSync('server-key.pem'),
  ca: fs.readFileSync('ca-cert.pem'),
  requestCert: true,
  rejectUnauthorized: true,
}, app);
```

**Client Request:**

```bash
curl -X GET https://api.summit.gov/api/v1/investigations \
  --cert client-cert.pem \
  --key client-key.pem \
  --cacert ca-cert.pem
```

### Certificate Validation

The gateway validates:
- Certificate not expired
- Valid certificate chain
- CN in allowed list
- Organization in allowed list
- Certificate not revoked

## Scopes and Permissions

### Available Scopes

| Scope | Description |
|-------|-------------|
| `investigations:read` | Read investigations |
| `investigations:write` | Create/update investigations |
| `investigations:delete` | Delete investigations |
| `entities:read` | Read entities |
| `entities:write` | Create/update entities |
| `relationships:read` | Read relationships |
| `relationships:write` | Create/update relationships |
| `reports:read` | Read reports |
| `reports:write` | Create reports |
| `admin:*` | Full administrative access |

### Requesting Multiple Scopes

```bash
scope=investigations:read investigations:write entities:read
```

### Scope Hierarchy

Wildcards are supported:

- `investigations:*` - All investigation permissions
- `*:read` - Read access to all resources
- `*` - Full access (admin only)

## Role-Based Access Control (RBAC)

### Default Roles

1. **admin** - Full system access
2. **analyst** - Investigation analysis and entity management
3. **viewer** - Read-only access
4. **api_consumer** - API access for integrations

### Custom Roles

Define custom roles via API:

```bash
curl -X POST https://api.summit.gov/api/roles \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "investigator",
    "permissions": [
      {"resource": "investigations", "action": "read"},
      {"resource": "investigations", "action": "create"},
      {"resource": "entities", "action": "read"}
    ]
  }'
```

## Security Best Practices

### 1. Token Storage

**DO:**
- Store tokens in secure, httpOnly cookies
- Use secure session storage
- Encrypt tokens at rest

**DON'T:**
- Store tokens in localStorage
- Log tokens
- Expose tokens in URLs

### 2. Token Expiration

- Access tokens: 15 minutes
- Refresh tokens: 7 days
- API keys: 1 year maximum

### 3. Rate Limiting

All authentication endpoints are rate limited:

- Login: 5 attempts per 15 minutes
- Token refresh: 10 per hour
- Password reset: 3 per hour

### 4. Audit Logging

All authentication events are logged:
- Successful logins
- Failed login attempts
- Token generation
- Token revocation
- API key usage

### 5. IP Allowlisting

For high-security environments, restrict access by IP:

```bash
curl -X POST https://api.summit.gov/api/keys/key_123/allowlist \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ips": ["203.0.113.0/24", "198.51.100.42"]
  }'
```

## Troubleshooting

### Invalid Token

**Error:**
```json
{
  "error": "invalid_token",
  "message": "The access token is invalid or expired"
}
```

**Solution:**
- Check token expiration
- Verify token signature
- Ensure correct issuer/audience
- Try refreshing the token

### Insufficient Scopes

**Error:**
```json
{
  "error": "insufficient_scope",
  "message": "Required scope: investigations:write"
}
```

**Solution:**
- Request token with required scopes
- Contact admin to grant permissions

### Rate Limited

**Error:**
```json
{
  "error": "rate_limit_exceeded",
  "retryAfter": 300
}
```

**Solution:**
- Wait for specified seconds
- Reduce request rate
- Request higher rate limit tier

## Code Examples

### JavaScript/TypeScript

```typescript
import axios from 'axios';

class SummitAPIClient {
  private accessToken: string;

  async login(email: string, password: string) {
    const response = await axios.post('https://api.summit.gov/auth/login', {
      email,
      password,
    });

    this.accessToken = response.data.accessToken;
    return response.data;
  }

  async getInvestigations() {
    const response = await axios.get(
      'https://api.summit.gov/api/v1/investigations',
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    );

    return response.data;
  }
}
```

### Python

```python
import requests

class SummitAPIClient:
    def __init__(self):
        self.access_token = None
        self.base_url = 'https://api.summit.gov'

    def login(self, email, password):
        response = requests.post(
            f'{self.base_url}/auth/login',
            json={'email': email, 'password': password}
        )
        response.raise_for_status()

        data = response.json()
        self.access_token = data['accessToken']
        return data

    def get_investigations(self):
        response = requests.get(
            f'{self.base_url}/api/v1/investigations',
            headers={'Authorization': f'Bearer {self.access_token}'}
        )
        response.raise_for_status()
        return response.json()
```

### cURL

```bash
# Store token in variable
TOKEN=$(curl -X POST https://api.summit.gov/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"analyst@summit.gov","password":"password"}' \
  | jq -r '.accessToken')

# Use token
curl -X GET https://api.summit.gov/api/v1/investigations \
  -H "Authorization: Bearer $TOKEN"
```

## Support

For authentication issues:
- Email: auth-support@summit.gov
- Documentation: https://docs.summit.gov/api/auth
- Portal: https://api.summit.gov/portal
