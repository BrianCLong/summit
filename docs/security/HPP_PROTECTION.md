# HTTP Parameter Pollution (HPP) Protection

## Overview

This document details the implementation of **HTTP Parameter Pollution (HPP)** protection in the IntelGraph Server.

**HTTP Parameter Pollution** is a web attack where an attacker sends multiple HTTP parameters with the same name. If the application does not handle this correctly, it can lead to:
- Bypassing input validation (e.g., WAFs).
- Unexpected application behavior (e.g., retrieving the wrong user record).
- Type errors (receiving an array instead of a string).

We use the [`hpp`](https://www.npmjs.com/package/hpp) middleware to protect against this vulnerability.

## Implementation

The `hpp` middleware is integrated into the Express application pipeline in `server/src/app.ts`.

It is placed **after** the body parser and **before** the application routes to ensure that `req.query` and `req.body` (if configured) are sanitized before they reach the controllers.

### Configuration

In `server/src/app.ts`:

```typescript
import hpp from 'hpp';

// ... other imports and setup

// Load Shedding / Overload Protection (Second, to reject early)
app.use(overloadProtection);

// HPP Protection
// By default, this will convert parameter arrays in req.query back to the last value.
app.use(hpp());

// ... security headers and routes
```

### How it Works

By default, Express populates `req.query` with an array if multiple parameters with the same name are present in the URL.

**Without HPP Protection:**
Request: `GET /search?q=apple&q=banana`
`req.query`: `{ q: ['apple', 'banana'] }`

If the application expects `q` to be a string, this can cause a crash or logic error.

**With HPP Protection:**
Request: `GET /search?q=apple&q=banana`
`req.query`: `{ q: 'banana' }` (Only the last value is kept)

This ensures that `req.query` parameters remain strings (or their expected type) and not arrays, unless explicitly allowed.

## Usage Examples

### 1. Standard Protection (Default)

Automatically handles duplicate query parameters by selecting the last occurrence.

```bash
# Request
curl "http://localhost:4000/api/search?category=books&category=electronics"

# Server Logic
console.log(req.query.category);
// Output: 'electronics'
```

### 2. Whitelisting (Future Configuration)

If specific endpoints require array input for query parameters, `hpp` can be configured to whitelist specific keys.

*Note: Currently, we use the default configuration which enforces single values for all parameters. If array support is needed, the middleware configuration in `app.ts` needs to be updated:*

```typescript
// Example of allowing arrays for 'ids'
app.use(hpp({
  whitelist: [ 'ids' ]
}));
```

## Testing Instructions

You can verify the protection using `curl` or any HTTP client.

### Prerequisites
- Ensure the server is running (`pnpm start` or `pnpm dev` in `server/`).

### Test Case: Duplicate Query Parameters

1. **Send a request with duplicate parameters:**

   ```bash
   curl -v "http://localhost:4000/health?test=1&test=2"
   ```

2.  **Verify Server Behavior:**
    - Without HPP: The application might process `['1', '2']`.
    - With HPP: The application processes `'2'`.

    *Note: Since `/health` might not echo parameters back, you may need to observe logs or use an endpoint that reflects input if available. For development verification, you can add a temporary log in a route.*

### Automated Verification

We have verified this implementation by ensuring the middleware is loaded. In a CI/CD environment, you can use integration tests (like the one we used during development) to assert that `req.query.param` is a string, not an array.

```typescript
// Example Test Assertion
it('should flatten duplicate query parameters', async () => {
  const res = await request(app).get('/test?param=a&param=b');
  // Expecting the last value
  expect(res.body.query.param).toBe('b');
});
```
