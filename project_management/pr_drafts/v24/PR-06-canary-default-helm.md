# PR 6 — Canary by Default in Helm Charts

Title: feat(delivery): enable canary + analysis in charts/maestro (values-canary overlay)

Files:

- charts/maestro/values-canary.yaml (new)
- (docs update) charts/maestro/README.md (append usage)

Patch: add the canary overlay YAML (from kit) and docs:

```
helm upgrade maestro charts/maestro -f values.yaml -f values-canary.yaml
```

Acceptance: canary weight steps and analysis run on stage; rollback drill executed.

---

Shared: See SHARED-SECTIONS.md for risk, evidence, and operator commands.
