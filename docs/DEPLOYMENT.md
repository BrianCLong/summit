# Deployment

- **Local:** docker‑compose with Neo4j + Streamlit; dev seeds.
- **Kubernetes:** manifests (Neo4j helm, API, UI, connectors); HPA to CPU/mem.
- **Config:** env‑first; secrets from vault; S3/GCS for evidence.
- **Backups:** nightly snapshot; PITR guidelines.
