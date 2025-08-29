# GA-GraphAI

IntelGraph Graph AI & analytics monorepo.

## Quickstart

```bash
cp .env.example .env
npm install --workspaces
docker-compose up
```

## Pipeline

```
features -> embeddings -> ER -> LP -> communities/anomalies -> explain -> overlay -> export
```
