# @summit/authentication

Enterprise authentication and authorization package supporting OAuth 2.0, JWT, API keys, and mTLS.

## Installation

```bash
pnpm add @summit/authentication
```

## Usage

### JWT Authentication

```typescript
import { JWTManager } from '@summit/authentication';

const jwtManager = new JWTManager({
  secret: process.env.JWT_SECRET,
  issuer: 'my-api',
  expiresIn: '15m',
});

const { accessToken, refreshToken } = jwtManager.generateTokenPair({
  sub: 'user123',
  roles: ['admin'],
  scopes: ['read', 'write'],
});
```

### OAuth 2.0

```typescript
import { OAuthProvider } from '@summit/authentication';

const oauth = new OAuthProvider({
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  redirectUri: 'https://yourapp.com/callback',
  // ...
});
```

### API Keys

```typescript
import { APIKeyManager } from '@summit/authentication';

const apiKeyManager = new APIKeyManager();

const { apiKey, key } = apiKeyManager.createAPIKey({
  name: 'Production Key',
  userId: 'user123',
  scopes: ['read'],
});
```

## Documentation

See [Authentication Guide](../../docs/api/AUTHENTICATION.md) for complete documentation.
