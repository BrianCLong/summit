# Switchboard Evidence Contract (GA)

## Scope

This contract defines the evidence artifact layout for the Summit Switchboard control plane.
Evidence artifacts are deterministic and disallow timestamps outside `stamp.json`.

## Evidence IDs

- `EVD-SWITCHBOARD-MCP-REGISTRY-001`
- `EVD-SWITCHBOARD-MCP-ROUTER-001`
- `EVD-SWITCHBOARD-MCP-POLICY-001`
- `EVD-SWITCHBOARD-MCP-HEALTH-001`
- `EVD-SWITCHBOARD-MCP-TOKEN-001` (Lane 2, gated)

## Required Files (per evidence ID)

```
index.json
report.json
metrics.json
stamp.json
```

## Determinism Rules

- `stamp.json` is the only artifact permitted to include timestamps.
- `report.json`, `metrics.json`, and `index.json` must be deterministic.
- Evidence is invalid if timestamps appear outside `stamp.json`.

## Example Layout

```
evidence/
  EVD-SWITCHBOARD-MCP-REGISTRY-001/
    index.json
    report.json
    metrics.json
    stamp.json
```
