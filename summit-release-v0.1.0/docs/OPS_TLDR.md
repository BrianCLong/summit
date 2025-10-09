# Summit v0.1.0 — Ops TL;DR

## Start
```bash
make up && make verify     # core
make app && make smoke     # app
```

## Stop / Cleanup
```bash
make down                  # stop + remove
make nuke                  # scoped cleanup (root-owned leftovers)
```

## Health quickies
```bash
curl -fsS localhost:18081/health
curl -fsS localhost:18082/health
make logs                  # follow logs
```

## DR
```bash
make dr-drill              # monthly; proves restore path
```

## Evidence / Audit
```bash
make evidence              # collect digests, SBOM refs, compose pointers
```

## Upgrades / Rollbacks
```bash
# Upgrade: bump digests -> make app
# Rollback: revert digests -> make app
```

## Alerts (if obs enabled)
- API down (>2m) => page
- 5xx > 5% for 10m => warn

## Safety
- No force-push to release tags
- Images pinned by digest
- No secrets in images; use .env