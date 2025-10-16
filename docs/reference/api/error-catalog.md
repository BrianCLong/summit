---
title: API Error Catalog
summary: Standard error formats, codes, and troubleshooting guidance for IntelGraph APIs.
version: latest
lastUpdated: 2025-09-07
owner: api
---

## Error envelope

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "<human readable>",
    "correlationId": "<uuid>",
    "details": {}
  }
}
```

## Common codes

| Code                 | When it happens                   | HTTP | Action                  |
| :------------------- | :-------------------------------- | ---: | :---------------------- |
| `INVALID_ARGUMENT`   | Bad field, type, or missing param |  400 | Fix request; see schema |
| `UNAUTHENTICATED`    | Missing/invalid token             |  401 | Re-auth; refresh token  |
| `PERMISSION_DENIED`  | Caller lacks rights               |  403 | Request access/role     |
| `RESOURCE_NOT_FOUND` | ID/path not found                 |  404 | Verify ID/route         |
| `ABORTED`            | Concurrency conflict              |  409 | Retry with backoff      |
| `INTERNAL`           | Unexpected server error           |  500 | Retry; contact support  |
