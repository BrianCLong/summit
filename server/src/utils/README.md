# Security Utilities

This directory contains security utilities for the IntelGraph platform.

## Modules

### crypto-secure-random.ts

Cryptographically secure random number generation utilities.

**Functions:**
- `randomString(length, encoding)` - Generate a cryptographically secure random string
- `randomInt(min, max)` - Generate a cryptographically secure random integer
- `randomFloat()` - Generate a cryptographically secure random float between 0 and 1
- `randomUUID()` - Generate a cryptographically secure UUID v4
- `generateToken(bytes)` - Generate a cryptographically secure token
- `generateId(prefix)` - Generate a cryptographically secure ID for database records

**Usage:**
```typescript
import { randomString, randomUUID, generateToken } from '@/utils/crypto-secure-random';

const token = generateToken(32);
const sessionId = randomUUID();
const apiKey = randomString(64);
```

**Security:** Never use Math.random() for security-sensitive operations. Always use these utilities instead.

### input-sanitization.ts

Comprehensive input validation and sanitization utilities to prevent common vulnerabilities.

**Functions:**

#### String Sanitization
- `sanitizeString(input)` - Sanitize string input to prevent XSS
- `sanitizeHTML(input, allowedTags)` - Sanitize HTML content
- `sanitizeEmail(email)` - Validate and sanitize email addresses
- `sanitizeURL(url, allowedProtocols)` - Validate and sanitize URLs

#### Path and File Security
- `sanitizeFilePath(path, allowedBasePath)` - Sanitize file paths to prevent path traversal

#### Injection Prevention
- `sanitizeSQL(input)` - Additional SQL injection protection (use parameterized queries!)
- `sanitizeShellInput(input)` - Sanitize shell command input
- `sanitizeNoSQL(input)` - Sanitize NoSQL query input

#### Type Validation
- `validateInteger(input, min, max)` - Validate integer input
- `validateFloat(input, min, max)` - Validate float input
- `validateBoolean(input)` - Validate boolean input
- `validateUUID(input, version)` - Validate UUID

#### JSON and Object Security
- `sanitizeJSON(input)` - Sanitize JSON input with prototype pollution protection
- `sanitizeObject(obj)` - Sanitize object to remove dangerous properties

#### Other Utilities
- `sanitizeRateLimitKey(key)` - Sanitize rate limit keys
- `InputValidator` - Comprehensive input validation class

**Usage:**
```typescript
import {
  sanitizeString,
  validateEmail,
  sanitizeFilePath,
  InputValidator
} from '@/utils/input-sanitization';

// Basic sanitization
const safeName = sanitizeString(userInput);

// Email validation
try {
  const email = validateEmail(userEmail);
} catch (error) {
  // Handle invalid email
}

// Path traversal prevention
const safePath = sanitizeFilePath(userPath, '/uploads');

// Comprehensive validation
const validator = new InputValidator();
const name = validator.validateString(input.name, 'name', {
  minLength: 1,
  maxLength: 100
});
const age = validator.validateInteger(input.age, 'age', 0, 120);

if (validator.hasErrors()) {
  const errors = validator.getErrors();
  // Handle validation errors
}
```

**Security Best Practices:**
1. Always validate input at the boundary (API endpoints, forms)
2. Use parameterized queries for SQL (sanitization is a backup)
3. Sanitize output when rendering to prevent XSS
4. Never trust user input
5. Use allow-lists instead of deny-lists when possible

## Examples

### Preventing SQL Injection

✅ **Good:**
```typescript
// Use parameterized queries
const result = await db.query(
  'SELECT * FROM users WHERE email = $1',
  [email]
);
```

❌ **Bad:**
```typescript
const result = await db.query(
  `SELECT * FROM users WHERE email = '${email}'`
);
```

### Preventing XSS

✅ **Good:**
```typescript
import { sanitizeHTML } from '@/utils/input-sanitization';

const safeHTML = sanitizeHTML(userInput, ['b', 'i', 'p']);
element.innerHTML = safeHTML;
```

❌ **Bad:**
```typescript
element.innerHTML = userInput;
```

### Preventing Path Traversal

✅ **Good:**
```typescript
import { sanitizeFilePath } from '@/utils/input-sanitization';

const safePath = sanitizeFilePath(userPath, '/uploads');
const file = await fs.readFile(safePath);
```

❌ **Bad:**
```typescript
const file = await fs.readFile(`/uploads/${userPath}`);
```

### Secure Random Generation

✅ **Good:**
```typescript
import { generateToken } from '@/utils/crypto-secure-random';

const sessionToken = generateToken(32);
```

❌ **Bad:**
```typescript
const sessionToken = Math.random().toString(36);
```

## Testing

Test security utilities with:

```bash
# Run security linting
pnpm run security:lint

# Run all tests
pnpm test
```

## Related Documentation

- [Security Guidelines](../../../docs/SECURITY.md)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
