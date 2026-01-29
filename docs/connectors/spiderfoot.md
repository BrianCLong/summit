# SpiderFoot Connector

This connector imports SpiderFoot JSON exports into Summit's normalized OSINT event stream.

## Usage

### 1. Export from SpiderFoot
- Run SpiderFoot scan.
- Go to "Scan" -> "Export" -> "JSON".
- Save as `spiderfoot_export.json`.

### 2. Import into Summit
Use the `connectors.spiderfoot.import_spiderfoot` module.

```python
from connectors.spiderfoot import load_export, normalize, write_normalized

export = load_export("spiderfoot_export.json")
events = normalize(export)
write_normalized(events, "normalized_events.json")
```

## Safety
- Ensure targets are authorized.
- Use passive scan modes by default.
