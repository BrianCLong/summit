# Environment Variables Schema

> Source of truth for IntelGraph environment configuration

| Variable | Required | Default | Description | Security Notes |
|---|---|---:|---|---|
| NODE_ENV | no | development | Node environment flag | Do not rely on this for security gates. |
| PORT | no | 4000 | API server port |  |
| CLIENT_PORT | no | 3000 | Web client dev port |  |
| NEO4J_URI | yes | bolt://neo4j:7687 | Neo4j connection URI | Use service DNS inside docker; never embed creds in URI. |
| NEO4J_USERNAME | yes | neo4j | Neo4j username | Store password in Secrets Manager / Vault. |
| NEO4J_PASSWORD | yes | (none) | Neo4j password | Rotate regularly. |
| POSTGRES_URL | yes | postgres://intelgraph:password@postgres:5432/intelgraph_dev | Postgres DSN | Use RDS/IAM where possible. |
| REDIS_URL | no | redis://redis:6379 | Redis connection | For dev only; enable TLS in prod. |
| JWT_SECRET | yes | (none) | JWT signing secret | 256-bit random; rotate. |
| JWT_PUBLIC_KEY | yes | (none) | JWT public key for ML service | RSA public key for verification. |
| JWT_PRIVATE_KEY | yes | (none) | JWT private key | RSA private key for signing. |
| ML_WEBHOOK_SECRET | yes | (none) | ML webhook HMAC secret | 256-bit random; rotate. |
| USE_SPACY | no | false | Enable spaCy NLP processing | Requires model download. |
| OPENAI_API_KEY | no | (none) | AI services key | Scope and rotate. |
| LOG_LEVEL | no | info | Pino/Winston log level |  |
| CORS_ORIGIN | no | http://localhost:3000 | Allowed origin | Use exact origins in prod. |

## Security Practices
- Commit only `.env.example`; NEVER commit real `.env`
- Use `.pre-commit` + `.githooks/forbid-env.sh` to block mistakes
- Provision secrets via AWS Secrets Manager / SSM / Vault
- Inject secrets via CI/CD or init containers

## Required for ML Integration
```bash
# Generate JWT keypair for ML service
openssl genrsa -out jwt-private.pem 2048
openssl rsa -in jwt-private.pem -pubout -out jwt-public.pem

# Set in environment
export JWT_PRIVATE_KEY="$(cat jwt-private.pem)"
export JWT_PUBLIC_KEY="$(cat jwt-public.pem)"
export ML_WEBHOOK_SECRET="$(openssl rand -hex 32)"
```