# Sample Execution Tool Integration

**Type**: Infrastructure Automation

## Manifest
```json
{
  "partnerId": "auto-bot",
  "tier": 3,
  "capabilities": ["execute.resize"],
  "claims": {
    "never": ["decide", "retry"]
  }
}
```

## Receipt Format
```json
{
  "commandId": "cmd-123",
  "executedAt": "2023-10-27T10:00:00Z",
  "status": "success",
  "logs": "resized instance to large",
  "signature": "sha256:..."
}
```
