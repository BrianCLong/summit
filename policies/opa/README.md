# OPA Starter Bundles (Residency, DLP, CMK, Shadow Mode)

These Rego modules are minimal, production-lean starters. They expect inputs shaped like the DSLs you’ve defined (CBL targets, evidence packs, etc.).

- `residency.rego`: enforce region residency per artifact/tenant
- `dlp.rego`: block promotion if logs/artifacts flagged by DLP
- `cmk.rego`: require tenant CMK encryption at rest
- `policy_shadow.rego`: evaluate policies in **shadow** vs **enforce** and emit decision diffs

### Quick eval

```bash
opa eval -I -d . -i ./sample-inputs/promotion.json 'data.composer.decision'
```

### Bundle

```bash
# Create a bundle tar for distribution
opa build -b . -o composer-policy-bundle.tar.gz
```
