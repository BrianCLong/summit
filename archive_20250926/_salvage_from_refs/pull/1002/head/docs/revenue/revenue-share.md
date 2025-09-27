# Revenue Share (Test Mode)

Revenue share distributes template earnings between IntelGraph and publishers.

```
net = floor(grossCents * (sharePct / 100))
```

- `grossCents`: total revenue attributed to template.
- `sharePct`: publisher percentage (e.g., 70).
- `net`: amount credited to publisher; payouts are simulated only.

Reports aggregate `epsilonSpent` versus `netCents` per template.
