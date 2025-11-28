# API Documentation Portal

The API documentation portal brings together the OpenAPI source of truth, interactive explorers, authentication guidance, rate limiting policies, and versioning rules so integrators can discover and exercise the IntelGraph Platform APIs quickly.

## Assets & entry points
- **OpenAPI source**: [`openapi/spec.yaml`](../openapi/spec.yaml) – canonical contract used by Swagger UI and ReDoc.
- **Swagger UI explorer**: `GET /api/docs` – interactive “Try it out” console backed by the live server.
- **ReDoc reference**: `GET /api/docs/redoc` – reader-friendly reference docs for the same spec.
- **Raw specs**: `GET /api/docs/openapi.json` and `GET /api/docs/openapi.yaml` for tooling and SDK generation (served with `Cache-Control: no-store` and strong ETags to avoid stale explorers).

## Running the explorer locally
1. Install dependencies and start the API:
   ```bash
   cd server
   npm install
   npm run dev
   ```
2. Open http://localhost:4000/api/docs for Swagger UI or http://localhost:4000/api/docs/redoc for ReDoc.
3. Use the “Authorize” button to paste a JWT bearer token; requests are executed against your running server.

## Authentication quick start
All protected endpoints use JWT bearer tokens defined in the OpenAPI security scheme. Include the token on every request:

```http
Authorization: Bearer <your-jwt-token>
```

Re-authenticate or refresh tokens when you receive `401 Unauthorized` responses.

## Example requests
Below are ready-to-run calls that align with the OpenAPI contract.

### cURL (fetch a case)
```bash
curl -X GET "http://localhost:4000/api/cases/123" \
  -H "Authorization: Bearer $INTELGRAPH_TOKEN" \
  -H "Accept: application/json"
```

### JavaScript (create a case)
```javascript
import fetch from 'node-fetch';

const response = await fetch('http://localhost:4000/api/cases', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.INTELGRAPH_TOKEN}`,
  },
  body: JSON.stringify({
    title: 'Suspicious Transaction Pattern Analysis',
  }),
});

const result = await response.json();
console.log(result);
```

### Python (classify a prompt for safety)
```python
import os
import requests

resp = requests.post(
    "http://localhost:4000/api/copilot/classify",
    headers={
        "Authorization": f"Bearer {os.environ['INTELGRAPH_TOKEN']}",
        "Content-Type": "application/json",
    },
    json={
        "prompt": "Show me entities related to case #123",
    },
)
resp.raise_for_status()
print(resp.json())
```

## Rate limiting
The global and route-specific limits described in [`docs/API_RATE_LIMITING.md`](./API_RATE_LIMITING.md) apply to all explorer traffic. Watch the `X-RateLimit-*` headers in Swagger UI responses to understand your remaining budget per tier.

## Versioning & deprecation
The contract published at `/api/docs/openapi.json` follows the SemVer policy outlined in [`docs/API_VERSIONING_STRATEGY.md`](./API_VERSIONING_STRATEGY.md). Breaking changes ship only in new major versions (e.g., `/v2/**`), minor versions add backward-compatible fields, and deprecations include the warning headers documented in the strategy guide.

## Generating SDKs from the spec
Because the portal exposes the raw OpenAPI document, you can feed it directly into generators:
```bash
npx openapi-generator-cli generate \
  -i http://localhost:4000/api/docs/openapi.json \
  -g typescript-fetch \
  -o ./sdk/ts
```
Swap the generator flag to produce Python (`python`), Go (`go`), or other supported clients.
