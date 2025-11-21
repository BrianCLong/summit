# Data Trading Marketplace Service

A secure marketplace for seamless public/private sector data sharing, trading, and reuse with built-in consent management, privacy controls, and automated compliance/risk scoring.

## Quick Start

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build

# Start production server
pnpm start
```

## Docker

```bash
# Build and start with Docker Compose
pnpm docker:up

# Stop services
pnpm docker:down
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/v1/products` | GET | Search products |
| `/api/v1/products` | POST | Create product |
| `/api/v1/products/:id` | GET | Get product |
| `/api/v1/products/:id/publish` | POST | Publish product |
| `/api/v1/transactions` | POST | Initiate transaction |
| `/api/v1/transactions/:id` | GET | Get transaction |
| `/api/v1/transactions/:id/pay` | POST | Process payment |
| `/api/v1/consent` | POST | Record consent |
| `/api/v1/consent/:id` | DELETE | Revoke consent |
| `/api/v1/risk/assess` | POST | Assess dataset risk |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4100 | Server port |
| `NODE_ENV` | development | Environment |
| `POSTGRES_HOST` | localhost | PostgreSQL host |
| `POSTGRES_PORT` | 5432 | PostgreSQL port |
| `POSTGRES_DB` | intelgraph | Database name |
| `POSTGRES_USER` | postgres | Database user |
| `POSTGRES_PASSWORD` | postgres | Database password |
| `REDIS_HOST` | localhost | Redis host |
| `REDIS_PORT` | 6379 | Redis port |
| `CORS_ORIGINS` | http://localhost:3000 | Allowed CORS origins |
| `LOG_LEVEL` | info | Logging level |

## Architecture

See [DATA_TRADING_MARKETPLACE.md](../../docs/architecture/DATA_TRADING_MARKETPLACE.md) for full architecture documentation.
