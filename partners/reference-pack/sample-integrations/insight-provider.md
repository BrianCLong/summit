# Sample Insight Provider Integration

**Type**: Threat Intelligence Feed

## Manifest

```json
{
  "partnerId": "intel-co",
  "tier": 1,
  "capabilities": ["signal.threat", "annotation.ip"],
  "claims": {
    "never": ["decision", "urgency"]
  }
}
```

## Signal Format

```json
{
  "entity": "1.2.3.4",
  "signal": "malicious",
  "confidence": 0.85,
  "source": "intel-co-feed-v1",
  "ttl": "24h"
}
```
