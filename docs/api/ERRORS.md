# Error Reference

Summit APIs use standard HTTP status codes and a consistent JSON error format to communicate issues.

## Error Response Format

All API errors return a JSON object following this structure:

```json
{
  "ok": false,
  "error": "error_code",
  "message": "Human-readable error message",
  "details": {},
  "timestamp": "2025-01-15T10:30:00Z"
}
```

- `ok`: Always `false` for error responses.
- `error`: A machine-readable string identifying the error type.
- `message`: A human-readable description of the error.
- `details`: (Optional) Additional context or validation errors.
- `timestamp`: The time the error occurred (ISO 8601).

---

## HTTP Status Codes

| Status Code | Description                                                                                              | Common Error Codes                                       |
| ----------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `400`       | **Bad Request** - The request was invalid or cannot be otherwise served.                                 | `validation_error`, `missing_required`, `invalid_format` |
| `401`       | **Unauthorized** - Authentication is required and has failed or has not yet been provided.               | `unauthorized`, `invalid_token`, `token_expired`         |
| `403`       | **Forbidden** - The request was valid, but the server is refusing action.                                | `forbidden`, `insufficient_permissions`                  |
| `404`       | **Not Found** - The requested resource could not be found.                                               | `not_found`, `resource_not_found`                        |
| `429`       | **Too Many Requests** - The user has sent too many requests in a given amount of time.                   | `rate_limit_exceeded`                                    |
| `500`       | **Internal Server Error** - A generic error message, given when an unexpected condition was encountered. | `internal_error`, `server_failure`                       |

---

## Detailed Error Codes

### Validation Errors (`400`)

Returned when the request body or parameters do not meet the schema requirements.

**Example Details:**

```json
{
  "ok": false,
  "error": "validation_error",
  "message": "Invalid request format",
  "details": {
    "fields": ["bearerToken", "query"]
  }
}
```

### Rate Limiting (`429`)

Returned when the client has exceeded their allocated request quota.

**Headers:**

- `X-RateLimit-Limit`: Maximum requests per window.
- `X-RateLimit-Remaining`: Remaining requests in current window.
- `X-RateLimit-Reset`: Time (Unix timestamp) when the limit resets.

---

## GraphQL Errors

GraphQL responses may contain an `errors` array alongside the `data` object.

```json
{
  "data": null,
  "errors": [
    {
      "message": "Entity not found",
      "locations": [{ "line": 2, "column": 3 }],
      "path": ["entity"],
      "extensions": {
        "code": "NOT_FOUND"
      }
    }
  ]
}
```

- `message`: Description of the error.
- `locations`: Source location in the GraphQL query.
- `path`: The path to the field that errored.
- `extensions.code`: The machine-readable error code.
