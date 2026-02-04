# Runbook: Week 1 Platform Spine

## Booting Locally
1. Ensure Python 3.11+ is installed.
2. Install dependencies: `pip install -r requirements.in`.
3. Start the FastAPI app: `uvicorn api.main:app --reload`.
4. The API will be available at `http://localhost:8000`.

## Enabling Multi-Product Mode
To enable multi-product routers, set the following environment variables:
```bash
export MULTIPRODUCT_ENABLED=true
export FACTGOV_ENABLED=true
```

## Running Migrations
1. Ensure the database is accessible.
2. Run migrations using Alembic (if configured):
   ```bash
   cd api
   alembic upgrade head
   ```

## Generating Deterministic Artifacts
Run the verification script to generate artifacts:
```bash
python scripts/generate_platform_artifacts.py
```
Artifacts will be written to `artifacts/platform/`.

## Toggling Feature Flags Safely
Always toggle flags in a development environment before promoting to production.
Ensure `artifacts/platform/metrics.json` reflects the expected flag status.
