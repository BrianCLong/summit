# Historical Security Incidents for Regression Replay

This directory contains definitions of historical security incidents or vulnerability patterns that must be blocked. The `replay-harness.test.ts` script iterates over these files and executes the requests against the application, asserting that they are handled correctly.

## Format

Each file should be a JSON file with the following structure:

```json
{
  "id": "unique-id",
  "description": "Description of the vulnerability",
  "steps": [
    {
      "method": "POST",
      "path": "/api/endpoint",
      "headers": {
        "Content-Type": "application/json"
      },
      "body": {
        "key": "malicious payload"
      },
      "expect": {
        "status": 403,
        "bodyContains": "Error message"
      }
    }
  ]
}
```
