# QPG Client SDKs

This directory contains lightweight client helpers for interacting with the Query-Time Pseudonymization Gateway (QPG).

## TypeScript

Located in `sdk/qpg/typescript`.

- Install dependencies: `npm install`
- Build: `npm run build`
- Usage:

```ts
import { QpgClient } from "@summit/qpg-client";

const client = new QpgClient("http://localhost:8080", fetch);
const result = await client.tokenize({
  tenant: "acme",
  purpose: "analytics",
  payload: { ssn: "123456789" },
});
```

## Python

Located in `sdk/qpg/python`.

```python
from qpg import QpgClient

client = QpgClient("http://localhost:8080")
result = client.tokenize("acme", "analytics", {"ssn": "123456789"})
```
