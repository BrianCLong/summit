---
title: Summit Mock API (Docker)
emoji: 🐳
sdk: docker
pinned: false
---

# Summit Mock API (Docker Space)

Single-container **FastAPI** app that mocks a minimal GraphQL endpoint for demos.

## Endpoints

- `GET /` — simple UI
- `POST /graphql` — mock GraphQL (accepts `{query, variables}`)
- `GET /healthz` — health check (HF probes `$PORT`)

## One-liner: create Space + push (Docker)

```bash
USER="BrianCLong" SPACE="summit-mock-docker" && \
huggingface-cli repo create "$SPACE" --type space -y || true && \
git init && git add . && git commit -m "init docker mock space" && git branch -M main && \
git remote add origin "https://huggingface.co/spaces/$USER/$SPACE" 2>/dev/null || git remote set-url origin "https://huggingface.co/spaces/$USER/$SPACE" && \
git push -u origin main
```
