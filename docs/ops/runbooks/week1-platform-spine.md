# Runbook: Week 1 Platform Spine

## Booting locally
```bash
# Start infrastructure
docker-compose up -d

# Start API
uvicorn api.main:app --reload
```

## Toggling Features
Set environment variables:
- `MULTIPRODUCT_ENABLED=true`
- `FACTGOV_ENABLED=true`

## Artifact Generation
Run `python scripts/generate_platform_artifacts.py` to generate deterministic CI metadata.
