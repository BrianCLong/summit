# Rules Engine v1

The Rules Engine evaluates streaming counters and scheduled graph patterns.

## DSL
```
when counter("ip_comm", window="5m") > 100 then alert("Suspected beaconing")
```

### Windows & Cooldowns
Rules may define sliding windows and cooldown periods to avoid alert storms.

### Dedupe & Dry-Run
Alerts sharing a `dedupeKey` are suppressed for the window. Setting `dryRun` records matches without emitting alerts.

