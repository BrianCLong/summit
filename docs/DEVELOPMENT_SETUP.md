# Development Setup Guide

This guide details how to set up your local development environment for IntelGraph Summit.

## Prerequisites

- **Node.js**: v18+ (LTS recommended)
- **Docker**: v20+ (Desktop or Engine)
- **Docker Compose**: v2+
- **Make**: Standard GNU Make

## Quick Start

The fastest way to get started is using the `make` commands.

```bash
# 1. Clone the repository
git clone https://github.com/BrianCLong/summit.git
cd summit

# 2. Configure environment
cp .env.example .env

# 3. Start services
make up
```

## Detailed Setup

### 1. Environment Variables

Copy `.env.example` to `.env`. The defaults are configured for local development with Docker.

**Key Variables:**

- `PORT`: API server port (default: 4000)
- `NEO4J_URI`: Neo4j connection string (default: bolt://localhost:7687)
- `POSTGRES_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string

### 2. Docker Services

We use Docker Compose to run infrastructure dependencies:

- **Neo4j**: Graph database (Port 7474, 7687)
- **PostgreSQL**: Relational database (Port 5432)
- **Redis**: Cache and queue (Port 6379)
- **Adminer**: Database management UI (Port 8080)

To start only infrastructure (without the app):

```bash
docker compose up -d neo4j postgres redis
```

### 3. Running the Application

**Option A: Full Stack via Docker (Recommended)**

```bash
make up
```

This runs both the server and client in containers with hot-reloading enabled for `server/src` and `client/src`.

**Option B: Hybrid (Local Node + Docker Infra)**
If you prefer running Node locally for faster debugging:

1. Start infra:
   ```bash
   docker compose up -d neo4j postgres redis
   ```
2. Start Server:
   ```bash
   cd server
   npm install
   npm run dev
   ```
3. Start Client:
   ```bash
   cd client
   npm install
   npm run dev
   ```

## Verification

Run the smoke tests to verify everything is working:

```bash
make smoke
```

Or run the simple script:

```bash
node scripts/smoke-test-simple.js
```

## Common Commands

| Command        | Description                                 |
| :------------- | :------------------------------------------ |
| `make up`      | Start all services                          |
| `make down`    | Stop all services                           |
| `make restart` | Restart services                            |
| `make logs`    | Follow logs                                 |
| `make clean`   | Remove containers and volumes (resets data) |
| `make seed`    | Seed the database with demo data            |
| `make test`    | Run unit tests                              |

## IDE Setup

- **VS Code**: Recommended. Install "ESLint" and "Prettier" extensions.
- **TypeScript**: The project uses TypeScript. Ensure your editor uses the workspace version.

## Next Steps

- Read the [Architecture Guide](ARCHITECTURE.md)
- Check out the [API Reference](API_REFERENCE.md)
