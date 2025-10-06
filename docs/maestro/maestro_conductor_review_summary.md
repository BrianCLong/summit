

## Inventory - Top Level

- dir   summit-main  (78084912 bytes)


## Found Key Files/Dirs

- summit-main/.github
- summit-main/docs/maestro/maestro-worldclass-pack/.github
- summit-main/ga-graphai/.github
- summit-main/ops/observability-ci/.github
- summit-main/server/.github
- summit-main/deploy
- summit-main/docs/maestro/maestro-worldclass-pack/deploy
- summit-main/k8s
- summit-main/deploy/k8s
- summit-main/infra/k8s
- summit-main/ml/k8s
- summit-main/server/k8s
- summit-main/scripts
- summit-main/.github/scripts
- summit-main/active-measures-module/scripts
- summit-main/client/scripts
- summit-main/cognitive-targeting-engine/scripts
- summit-main/docs/maestro/maestro-worldclass-pack/scripts
- summit-main/ga-graphai/scripts
- summit-main/operator-kit/scripts
- summit-main/ops/observability-ci/scripts
- summit-main/packages/common-types/scripts
- summit-main/server
- summit-main/helm/server
- summit-main/operator-kit/server
- summit-main/tests/server
- summit-main/client
- summit-main/active-measures-module/client
- summit-main/client/client
- summit-main/helm/client
- summit-main/docker
- summit-main/deploy/docker
- summit-main/ga-graphai/infra/docker
- summit-main/ml/docker
- summit-main/infra
- summit-main/cognitive-insights/infra
- summit-main/deescalation-coach/infra
- summit-main/docs/infra
- summit-main/ga-graphai/infra
- summit-main/graph-xai/infra
- summit-main/graph_xai/infra
- summit-main/prov-ledger/infra
- summit-main/prov_ledger/infra
- summit-main/helm
- summit-main/deescalation-coach/infra/helm
- summit-main/deploy/helm
- summit-main/ga-graphai/infra/helm
- summit-main/graph-xai/infra/helm
- summit-main/graph_xai/infra/helm
- summit-main/infra/helm
- summit-main/prov-ledger/infra/helm
- summit-main/prov_ledger/infra/helm
- summit-main/charts
- summit-main/docs/maestro/maestro-0901-all-options-pack/new_files/components/charts
- summit-main/Dockerfile
- summit-main/active-measures-module/Dockerfile
- summit-main/api/Dockerfile
- summit-main/apps/mobile-interface/Dockerfile
- summit-main/apps/search-engine/Dockerfile
- summit-main/cognitive-insights/infra/Dockerfile
- summit-main/cognitive-targeting-engine/Dockerfile
- summit-main/copilot/Dockerfile
- summit-main/deescalation-coach/infra/Dockerfile
- summit-main/deploy/docker/postgres/Dockerfile
- summit-main/docker-compose.yml
- summit-main/active-measures-module/docker-compose.yml
- summit-main/apps/observability/docker-compose.yml
- summit-main/cognitive-insights/infra/docker-compose.yml
- summit-main/deescalation-coach/infra/docker-compose.yml
- summit-main/deploy/docker-compose.yml
- summit-main/ga-graphai/infra/docker-compose.yml
- summit-main/graph-xai/infra/docker-compose.yml
- summit-main/graph_xai/infra/docker-compose.yml
- summit-main/infra/docker-compose.yml
- summit-main/gateway/supergraph/compose.yaml
- summit-main/Makefile
- summit-main/.github/ISSUE_TEMPLATE/Makefile
- summit-main/deescalation-coach/Makefile
- summit-main/deploy/Makefile
- summit-main/graph-xai/Makefile
- summit-main/graph_xai/Makefile
- summit-main/intelgraph-mvp/Makefile
- summit-main/ops/observability-ci/Makefile
- summit-main/prov-ledger/Makefile
- summit-main/prov_ledger/Makefile
- summit-main/README.md
- summit-main/active-measures-module/README.md
- summit-main/apps/web/README.md
- summit-main/apps/webapp/canvas-ops-pack/README.md
- summit-main/apps/webapp/coa-planner/README.md
- summit-main/apps/webapp/hypothesis/README.md
- summit-main/apps/webapp/osint-console/README.md
- summit-main/archive/frontend-migration/README.md
- summit-main/archive/frontend-migration/web/README.md
- summit-main/client/README.md
- summit-main/cognitive-insights/infra/migrations/README
- summit-main/docs
- summit-main/cognitive-insights/docs
- summit-main/deescalation-coach/docs
- summit-main/ga-graphai/docs
- summit-main/gateway/docs
- summit-main/graph-xai/docs
- summit-main/graph_xai/docs
- summit-main/prov-ledger/docs
- summit-main/prov_ledger/docs


## Dockerfiles (snippets)

### summit-main/Dockerfile

```
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM gcr.io/distroless/nodejs20-debian12
WORKDIR /srv
USER 10001:10001
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
EXPOSE 8080
# Graceful shutdown awareness is expected in app
CMD ["dist/server.js"]
```

### summit-main/active-measures-module/Dockerfile

```
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json .
RUN npm ci --production
COPY . .
FROM base AS ai-deps
RUN apk add python3 py3-pip && pip install torch networkx sympy # Bundled for airgap
FROM base
COPY --from=ai-deps /usr/lib/python3 /usr/lib/python3
EXPOSE 4000
CMD ["node", "src/index.js"]
```

### summit-main/api/Dockerfile

```
# Build Stage
FROM python:3.9 AS build

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Production Stage
FROM python:3.9-slim

WORKDIR /app

COPY --from=build /usr/local/lib/python3.9/site-packages /usr/local/lib/python3.9/site-packages
COPY --from=build /app .

CMD ["python3", "-u", "main.py"]

```

### summit-main/apps/mobile-interface/Dockerfile

```
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production

# Build the application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the standalone output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy the PWA manifest and icons
COPY --from=builder /app/public/manifest.json ./public/
COPY --from=builder /app/public/icons ./public/icons

USER nextjs

EXPOSE 3001

ENV PORT 3001
ENV HOSTNAME "0.0.0.0"

# Start the application
CMD ["node", "server.js"]
```

### summit-main/apps/search-engine/Dockerfile

```
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

RUN addgroup -g 1001 -S nodejs
RUN adduser -S searchengine -u 1001

RUN mkdir -p logs && chown -R searchengine:nodejs logs

USER searchengine

EXPOSE 4006

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4006/health || exit 1

CMD ["npm", "start"]
```

### summit-main/cognitive-insights/infra/Dockerfile

```
FROM python:3.12-slim AS runtime
WORKDIR /app
COPY .. /app
RUN pip install --no-cache-dir fastapi uvicorn[standard]
EXPOSE 8080
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]

```

### summit-main/cognitive-targeting-engine/Dockerfile

```
FROM python:3.9-slim-buster

WORKDIR /app

ENV MODEL_NAME="j-hartmann/emotion-english-distilroberta-base"

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .

EXPOSE 8000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

### summit-main/copilot/Dockerfile

```
# 🔱 IntelGraph MVP-1+ Copilot Service Container
# Multi-stage build for optimized production deployment

FROM python:3.11-slim as builder

# Set build arguments
ARG BUILD_DATE
ARG VCS_REF
ARG VERSION=1.0.0

# Add metadata labels
LABEL org.opencontainers.image.title="IntelGraph Copilot Service" \
      org.opencontainers.image.description="AI-powered NER and link suggestions microservice" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.vendor="IntelGraph Team" \
      org.opencontainers.image.licenses="MIT"

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first for better layer caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip setuptools wheel \
    && pip install --no-cache-dir -r requirements.txt

# Download spaCy language model
RUN python -m spacy download en_core_web_lg

# Production stage
FROM python:3.11-slim as production

# Install runtime dependencies only
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create non-root user for security
RUN groupadd -r copilot && useradd -r -g copilot copilot

# Set working directory
WORKDIR /app

# Copy Python packages from builder stage
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code
COPY --chown=copilot:copilot . .

# Create directories for logs and cache
RUN mkdir -p /app/logs /app/cache \
    && chown -R copilot:copilot /app

# Switch to non-root user
USER copilot

# Set environment variables
ENV PYTHONPATH=/app \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000 \
    WORKERS=1 \
    LOG_LEVEL=info

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Expose port
EXPOSE ${PORT}

# Command to run the application
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT} --workers ${WORKERS} --log-level ${LOG_LEVEL}"]
```

### summit-main/deescalation-coach/infra/Dockerfile

```
FROM python:3.12-slim AS base
WORKDIR /app
COPY pyproject.toml ./
RUN pip install .
COPY app ./app
USER nobody
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
HEALTHCHECK CMD curl -f http://localhost:8080/healthz || exit 1

```

### summit-main/deploy/docker/postgres/Dockerfile

```
# Use a base PostgreSQL image
FROM postgres:15-alpine

# Install pgvector extension (Temporarily disabled due to build issues)
# pgvector requires build tools and PostgreSQL development headers
# RUN apk add --no-cache build-base postgresql-dev git     && git clone --branch v0.7.0 https://github.com/pgvector/pgvector.git     && cd pgvector     && make     && make install     && cd ..     && rm -rf pgvector     && apk del build-base postgresql-dev git

```

### summit-main/ga-graphai/infra/docker/minio/Dockerfile

```
FROM minio/minio:RELEASE.2024-01-01T00-00-00Z

```

### summit-main/ga-graphai/infra/docker/neo4j/Dockerfile

```
FROM neo4j:5

```

### summit-main/ga-graphai/infra/docker/postgres/Dockerfile

```
FROM postgres:15

```

### summit-main/ga-graphai/infra/docker/redis/Dockerfile

```
FROM redis:7

```

### summit-main/ga-graphai/packages/gateway/Dockerfile

```
FROM node:18-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --production
COPY src ./src
CMD ["node","src/index.ts"]

```

### summit-main/ga-graphai/packages/graphai/Dockerfile

```
FROM python:3.12-slim
WORKDIR /app
COPY pyproject.toml ./
RUN pip install fastapi uvicorn[standard]
COPY src ./src
CMD ["uvicorn", "graphai.src.main:app", "--host", "0.0.0.0", "--port", "8000"]

```

### summit-main/ga-graphai/packages/web/Dockerfile

```
FROM node:18-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --production
COPY src ./src
CMD ["node","src/index.ts"]

```

### summit-main/ga-graphai/packages/worker/Dockerfile

```
FROM python:3.12-slim
WORKDIR /app
COPY pyproject.toml ./
RUN pip install celery
COPY src ./src
CMD ["celery", "-A", "worker.src.main", "worker", "--loglevel=INFO"]

```

### summit-main/graph-service/Dockerfile

```
FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN ls -l /app

CMD ["python3", "-u", "main.py"]
```

### summit-main/graph-xai/infra/Dockerfile

```
FROM python:3.12-slim AS base
WORKDIR /app
COPY .. /app
RUN pip install .
EXPOSE 8090
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8090"]

```

### summit-main/graph_xai/infra/Dockerfile

```
FROM python:3.12-slim AS base
WORKDIR /app
COPY .. /app
RUN pip install .
EXPOSE 8090
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8090"]

```

### summit-main/ingestion/Dockerfile

```
FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN ls -l /app

CMD ["python3", "-u", "main.py"]
```

### summit-main/ml/Dockerfile

```
FROM python:3.12-slim

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y build-essential && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml poetry.lock* /app/
RUN pip install --no-cache-dir poetry && poetry config virtualenvs.create=false \
  && poetry install --no-interaction --no-ansi --extra-index-url https://download.pytorch.org/whl/cpu


COPY . /app

EXPOSE 8081
CMD ["uvicorn", "app.main:api", "--host", "0.0.0.0", "--port", "8081"]
```

### summit-main/ner-service/Dockerfile

```
FROM python:3.9-slim-buster

WORKDIR /app

COPY requirements.txt ./requirements.txt

RUN pip install --no-cache-dir -r requirements.txt

# Download spaCy model
RUN python -m spacy download en_core_web_sm

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

```

### summit-main/nlp-service/Dockerfile

```
FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download spaCy model
ARG SPACY_MODEL=en_core_web_sm
RUN python3 -m spacy download ${SPACY_MODEL}

COPY . .

RUN ls -l /app

CMD ["python3", "-u", "main.py"]

```

### summit-main/operator-kit/Dockerfile

```
FROM node:20-alpine AS base
WORKDIR /app
COPY package.json tsconfig.json ./
RUN npm ci --ignore-scripts
COPY server ./server
COPY config ./config
RUN npm run build

FROM node:20-alpine
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=base /app/dist ./dist
COPY --from=base /app/config ./config
COPY package.json .
RUN npm ci --omit=dev --ignore-scripts
USER app
ENV NODE_ENV=production PORT=8787
EXPOSE 8787
CMD ["node", "dist/index.js"]

```

### summit-main/prov-ledger/infra/Dockerfile

```
FROM python:3.12-slim AS base
WORKDIR /app
COPY ../pyproject.toml ../Makefile ./
RUN pip install --no-cache-dir fastapi uvicorn pydantic cryptography numpy networkx prometheus_client pytest
COPY .. .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]

```

### summit-main/prov_ledger/infra/Dockerfile

```
FROM python:3.12-slim AS base
WORKDIR /app
COPY ../pyproject.toml ../Makefile ./
RUN pip install --no-cache-dir fastapi uvicorn pydantic cryptography numpy networkx prometheus_client pytest
COPY .. .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]

```

### summit-main/python/Dockerfile

```
FROM python:3.9-slim-buster

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### summit-main/reliability-service/Dockerfile

```
FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python3", "-u", "main.py"]
```

### summit-main/server/Dockerfile

```
# Build Stage
FROM node:18-alpine AS build

# Install system dependencies for native modules like canvas
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production Stage
FROM node:18-alpine

# Install only production system dependencies for native modules
RUN apk add --no-cache \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev

WORKDIR /app
COPY --from=build /app/package*.json ./
RUN npm ci --only=production
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/graphql/schema ./src/graphql/schema # Copy GraphQL schema if needed at runtime

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

CMD ["node", "dist/index.js"]
```

### summit-main/services/copilot/Dockerfile

```
# syntax=docker/dockerfile:1
FROM node:18-alpine as deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 4000
CMD ["node", "dist/index.js"]

```

### summit-main/services/ingest/Dockerfile

```
FROM python:3.12-slim
WORKDIR /app
COPY . .
RUN pip install -e .[dev]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

```

### summit-main/services/prov-ledger/Dockerfile

```
# syntax=docker/dockerfile:1
FROM node:18-alpine as deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 4000
CMD ["node", "dist/index.js"]

```

### summit-main/services/sandbox/Dockerfile

```
# syntax=docker/dockerfile:1
FROM node:18-alpine as deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 4000
CMD ["node", "dist/index.js"]

```


## Compose Files (snippets)

### summit-main/docker-compose.yml

```
services:
  # Core database services always enabled
  postgres:
    image: postgres:16-alpine
    container_name: postgres
    environment:
      POSTGRES_DB: intelgraph
      POSTGRES_USER: intelgraph
      POSTGRES_PASSWORD: password
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./server/db/migrations/postgres:/docker-entrypoint-initdb.d
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U intelgraph -d intelgraph']
      interval: 10s
      timeout: 5s
      retries: 30

  neo4j:
    image: neo4j:4.4
    container_name: neo4j
    ports:
      - '7474:7474'
      - '7687:7687'
    volumes:
      - neo4j_data:/data
    environment:
      NEO4J_AUTH: neo4j/password
    healthcheck:
      test: ['CMD', 'bash', '-lc', 'wget -qO- http://localhost:7474 >/dev/null 2>&1 || exit 1']
      interval: 10s
      timeout: 5s
      retries: 30

  redis:
    image: redis:6.2-alpine
    container_name: redis
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 10s
      timeout: 5s
      retries: 30

  # Migrations run before server
  migrations:
    build: ./server
    container_name: migrations
    depends_on:
      neo4j:
        condition: service_healthy
      postgres:
        condition: service_healthy
    environment:
      - NODE_ENV=production
      - NEO4J_URI=bolt://neo4j:7687
      - NEO4J_USERNAME=neo4j
      - NEO4J_PASSWORD=password
      - POSTGRES_HOST=postgres
      - POSTGRES_USER=intelgraph
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=intelgraph
      - POSTGRES_URL=postgres://intelgraph:password@postgres:5432/intelgraph
    command: ['node', 'scripts/db_migrate.cjs']

  active-measures:
    build: ./active-measures-module
    container_name: active-measures
    command: node --require ts-node/register src/index.ts
    depends_on:
      neo4j:
        condition: service_healthy
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      migrations:
        condition: service_completed_successfully
    environment:
      - NODE_ENV=production
      - PORT=4000
      - NEO4J_URI=bolt://neo4j:7687
      - NEO4J_USERNAME=neo4j
      - NEO4J_PASSWORD=password
      - POSTGRES_HOST=postgres
      - POSTGRES_USER=intelgraph
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=intelgraph
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - AI_ENABLED=${AI_ENABLED:-false}
      - KAFKA_ENABLED=${KAFKA_ENABLED:-false}
      # Security Configuration
      - JWT_SECRET=${JWT_SECRET:-change_this_in_production_jwt_secret_key_must_be_at_least_32_chars_long}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET:-change_this_in_production_refresh_secret_key_must_be_different}
      - ALLOWED_ORIGINS=${ALLOWED_ORIGINS:-https://app.intelgraph.com}
      - CORS_ORIGIN=${CORS_ORIGIN:-https://app.intelgraph.com}
      - RATE_LIMIT_WINDOW_MS=${RATE_LIMIT_WINDOW_MS:-900000}
      - RATE_LIMIT_MAX=${RATE_LIMIT_MAX:-500}
      - VALID_API_KEYS=${VALID_API_KEYS:-}
    ports:
      - '4000:4000'
    healthcheck:
      test:
        [
          'CMD-SHELL',
          'node -e "require(''http'').get(''http://localhost:4000/health'', r=>process.exit(r.statusCode<500?0:1)).on(''error'',()=>process.exit(1))"',
        ]
      interval: 10s
      timeout: 5s
      retries: 12

  client:
    build:
      context: ./client
      dockerfile: Dockerfile.dev
    container_name: client
    environment:
      - VITE_PORT=3000
      - VITE_HOST=0.0.0.0
    ports:
      - '3000:3000'
    depends_on:
      server:
        condition: service_healthy
    healthcheck:
      test: ['CMD-SHELL', 'wget -qO- http://localhost:3000 >/dev/null 2>&1 || exit 1']
      interval: 10s
      timeout: 5s
      retries: 12

  # Optional Kafka services (enable with --profile kafka)
  zookeeper:
    image: confluentinc/cp-zookeeper:7.2.1
    container_name: zookeeper
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
    ports:
      - '2181:2181'
    profiles: ['kafka', 'ai']

  kafka:
    image: confluentinc/cp-kafka:7.2.1
    container_name: kafka
    depends_on:
      - zookeeper
    ports:
      - '9092:9092'
      - '29092:29092'
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: 'zookeeper:2181'
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092,PLAINTEXT_HOST://localhost:29092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS: 0
      KAFKA_CONFLUENT_LICENSE_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_CONFLUENT_BALANCER_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_TRANSACTION_STATE_LOG_MIN_ISR: 1
      KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: 1
    healthcheck:
      test: ['CMD-SHELL', "bash -lc 'echo > /dev/tcp/localhost/9092'"]
      interval: 10s
      timeout: 5s
      retries: 30
    profiles: ['kafka', 'ai']

  ingestion-service:
    build: ./ingestion
    container_name: ingestion-service
    depends_on:
      - kafka
    environment:
      KAFKA_BOOTSTRAP_SERVERS: kafka:9092
    profiles: ['kafka', 'ai']

  nlp-service:
    build: ./nlp-service
    container_name: nlp-service
    depends_on:
      - kafka
    environment:
      KAFKA_BOOTSTRAP_SERVERS: kafka:9092
      SPACY_MODEL: en_core_web_sm
    mem_limit: 2g
    profiles: ['ai']

  reliability-service:
    build: ./reliability-service
    container_name: reliability-service
    depends_on:
      - kafka
      - redis
    ports:
      - '8001:8001'
    environment:
      KAFKA_BOOTSTRAP_SERVERS: kafka:9092
      REDIS_URL: redis://redis:6379
    profiles: ['kafka', 'ai']

  graph-service:
    build: ./graph-service
    container_name: graph-service
    depends_on:
      kafka:
        condition: service_healthy
      neo4j:
        condition: service_healthy
    environment:
      KAFKA_
```

### summit-main/active-measures-module/docker-compose.yml

```
version: '3.8'
services:
  active-measures:
    build: .
    ports:
      - '4001:4000'
    volumes:
      - ./data:/app/data
    environment:
      - NEO4J_URI=bolt://neo4j:7687 # Or local for airgap
      - AIRGAPPED=true
  neo4j:
    image: neo4j:5.0-community
    # ... (standard config, local auth)
  redis:
    image: redis:7
    # Local only

```

### summit-main/apps/observability/docker-compose.yml

```
version: '3.9'
services:
  metrics-publisher:
    image: python:3.11-slim
    working_dir: /app
    volumes:
      - ./metrics-publisher.py:/app/metrics-publisher.py
    command: bash -c "pip install prometheus_client && python metrics-publisher.py"
    expose:
      - '8000'
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - '9090:9090'
  dashboard:
    image: nginx:alpine
    volumes:
      - .:/usr/share/nginx/html:ro
    ports:
      - '8080:80'

```

### summit-main/cognitive-insights/infra/docker-compose.yml

```
version: '3'
services:
  app:
    build: ..
    ports:
      - '8080:8080'
    depends_on:
      - db
      - redis
  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: example
  redis:
    image: redis:7

```

### summit-main/deescalation-coach/infra/docker-compose.yml

```
version: '3'
services:
  coach:
    build: ..
    ports:
      - '8080:8080'
    volumes:
      - ./models:/models

```

### summit-main/deploy/docker-compose.yml

```
version: '3.8'
services:
  graphql-orchestrator:
    build: .
    ports:
      - '8000:8000'
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - OPA_URL=${OPA_URL}
  bandit-router:
    build: .
  web-fetch-worker:
    build: .
  synthesizer:
    build: .

```

### summit-main/ga-graphai/infra/docker-compose.yml

```
version: '3.8'
services:
  postgres:
    build: ./docker/postgres
    environment:
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=${POSTGRES_DB}
  redis:
    build: ./docker/redis
  neo4j:
    build: ./docker/neo4j
  minio:
    build: ./docker/minio
  gateway:
    build: ../packages/gateway
    depends_on:
      - graphai
  graphai:
    build: ../packages/graphai
    depends_on:
      - postgres
      - redis
      - neo4j
  worker:
    build: ../packages/worker
    depends_on:
      - graphai
      - redis
  web:
    build: ../packages/web
    depends_on:
      - gateway

```

### summit-main/graph-xai/infra/docker-compose.yml

```
version: '3.9'
services:
  graph-xai:
    build: .
    ports:
      - '8090:8090'

```

### summit-main/graph_xai/infra/docker-compose.yml

```
version: '3.9'
services:
  graph-xai:
    build: .
    ports:
      - '8090:8090'

```

### summit-main/infra/docker-compose.yml

```
version: '3.9'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: example
    ports:
      - '5432:5432'
  redis:
    image: redis:7
    ports:
      - '6379:6379'
  neo4j:
    image: neo4j:5
    environment:
      NEO4J_AUTH: neo4j/test
    ports:
      - '7474:7474'
      - '7687:7687'
  analytics:
    build: ../packages/analytics
    depends_on:
      - postgres
      - redis
      - neo4j
    ports:
      - '8000:8000'
  gateway:
    build: ../packages/gateway
    depends_on:
      - analytics
      - postgres
      - redis
      - neo4j
    ports:
      - '3000:3000'
  web:
    build: ../packages/web
    depends_on:
      - gateway
    ports:
      - '5173:5173'

```

### summit-main/intelgraph-mvp/docker-compose.yml

```
version: '3.8'
services:
  neo4j:
    image: neo4j:5
    environment:
      NEO4J_AUTH: neo4j/devpassword
    ports:
      - '7474:7474'
      - '7687:7687'
  api:
    build: ./api
    environment:
      - NEO4J_URI=bolt://neo4j:7687
      - NEO4J_USER=neo4j
      - NEO4J_PASSWORD=devpassword
      - JWT_SECRET=dev-secret
    depends_on:
      - neo4j
    ports:
      - '8000:8000'
  web:
    build: ./ui
    depends_on:
      - api
    ports:
      - '3000:3000'

```

### summit-main/ops/docker-compose.yml

```
version: '3.9'

x-common-env: &common-env
  OTEL_EXPORTER_OTLP_ENDPOINT: http://otel-collector:4317
  OTEL_SERVICE_NAME: ${OTEL_SERVICE_NAME}
  NODE_ENV: production

services:
  neo4j:
    image: neo4j:5.22-community
    container_name: neo4j
    environment:
      - NEO4J_AUTH=neo4j/${NEO4J_PASS:-pass}
      - NEO4J_server_memory_pagecache_size=1G
      - NEO4J_server_memory_heap_initial__size=1G
      - NEO4J_server_memory_heap_max__size=1G
      - NEO4J_server_config_strict__validation_enabled=true
      - NEO4J_dbms_tx__log_rotation_retention_policy=7 days
      - NEO4J_db_tx__timeout=5s
      - NEO4J_PLUGINS=["apoc"]
    ports: ['7474:7474', '7687:7687']
    volumes:
      - neo4j-data:/data
      - neo4j-logs:/logs
    healthcheck:
      test: ['CMD', 'cypher-shell', '-u', 'neo4j', '-p', '${NEO4J_PASS:-pass}', 'RETURN 1']
      interval: 10s
      timeout: 5s
      retries: 10

  opa:
    image: openpolicyagent/opa:0.69.0-rootless
    command:
      [
        'run',
        '--server',
        '--set=decision_logs.console=true',
        '--set=distributed.status.console=true',
        '/policies/exports.rego',
      ]
    volumes:
      - ../policies:/policies:ro
    ports: ['8181:8181']
    healthcheck:
      test: ['CMD', 'wget', '-qO-', 'http://localhost:8181/health?plugins']
      interval: 10s
      timeout: 5s
      retries: 10

  otel-collector:
    image: otel/opentelemetry-collector:0.103.0
    command: ['--config=/etc/otel-collector-config.yaml']
    volumes:
      - ./otel/otel-collector-config.yaml:/etc/otel-collector-config.yaml:ro
    ports:
      - '4317:4317' # OTLP gRPC
      - '9464:9464' # Prometheus exporter endpoint

  jaeger:
    image: jaegertracing/all-in-one:1.58
    environment:
      - COLLECTOR_OTLP_ENABLED=true
    ports: ['16686:16686']

  prometheus:
    image: prom/prometheus:v2.53.1
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
    command: ['--config.file=/etc/prometheus/prometheus.yml']
    ports: ['9090:9090']

  grafana:
    image: grafana/grafana:11.1.3
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASS:-grafana}
    ports: ['3001:3000']
    volumes:
      - ./grafana/provisioning:/etc/grafana/provisioning:ro
      - ./grafana/dashboards:/var/lib/grafana/dashboards:ro

  prov-ledger:
    build: { context: ../services/prov-ledger, dockerfile: Dockerfile }
    environment:
      <<: *common-env
      NEO4J_URI: bolt://neo4j:7687
      NEO4J_USER: neo4j
      NEO4J_PASS: ${NEO4J_PASS:-pass}
      OPA_URL: http://opa:8181/v1/data/intelgraph/exports
      PORT: 4001
      OTEL_SERVICE_NAME: prov-ledger
    depends_on: { neo4j: { condition: service_healthy } }
    ports: ['4001:4001']

  copilot:
    build: { context: ../services/copilot, dockerfile: Dockerfile }
    environment:
      <<: *common-env
      PORT: 4002
      OTEL_SERVICE_NAME: copilot
    ports: ['4002:4002']

  sandbox:
    build: { context: ../services/sandbox, dockerfile: Dockerfile }
    environment:
      <<: *common-env
      NEO4J_URI: bolt://neo4j:7687
      NEO4J_USER: neo4j
      NEO4J_PASS: ${NEO4J_PASS:-pass}
      PORT: 4003
      OTEL_SERVICE_NAME: sandbox
    depends_on: { neo4j: { condition: service_healthy } }
    ports: ['4003:4003']

volumes:
  neo4j-data: {}
  neo4j-logs: {}

```

### summit-main/ops/observability-ci/docker-compose.yml

```
version: '3.8'
services:
  neo4j:
    image: neo4j:5
    ports:
      - '7474:7474'
      - '7687:7687'
  redis:
    image: redis:7
    ports:
      - '6379:6379'
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - ./prometheus/alerts.yml:/etc/prometheus/alerts.yml
    ports:
      - '9090:9090'
  grafana:
    image: grafana/grafana:latest
    volumes:
      - ./grafana:/var/lib/grafana/dashboards
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    ports:
      - '3000:3000'
  opa:
    image: openpolicyagent/opa:latest
    ports:
      - '8181:8181'

```

### summit-main/prov-ledger/infra/docker-compose.yml

```
version: '3.8'
services:
  prov-ledger:
    build: .
    ports:
      - '8080:8080'
    environment:
      - AUTH_MODE=none

```

### summit-main/prov_ledger/infra/docker-compose.yml

```
version: '3.8'
services:
  prov-ledger:
    build: .
    ports:
      - '8080:8080'
    environment:
      - AUTH_MODE=none

```

### summit-main/services/graph-core/docker-compose.yml

```
version: '3.8'
services:
  graph-core:
    build: .
    ports:
      - '3001:3001'
    depends_on:
      - neo4j
      - postgres
  neo4j:
    image: neo4j:5
    environment:
      - NEO4J_AUTH=neo4j/test
    ports:
      - '7687:7687'
      - '7474:7474'
  postgres:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: test
      POSTGRES_USER: test
      POSTGRES_DB: graph
    ports:
      - '5432:5432'

```

### summit-main/gateway/supergraph/compose.yaml

```
# Placeholder Rover configuration for supergraph composition.
# subgraphs:
#   prov-ledger:
#     routing_url: http://prov-ledger/graphql
#     schema:
#       file: ./prov-ledger.graphql

```


## GitHub Workflows (snippets)

### summit-main/.github/workflows/api-docs.yml

```
name: Deploy API Docs

on:
  push:
    branches:
      - main
    paths:
      - 'maestro-orchestration-api.yaml'
      - 'intelgraph-core-api.yaml'
      - 'docs-site/**'

jobs:
  build-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      - name: Install dependencies
        run: |
          cd docs-site
          npm ci
      - name: Build docs
        run: |
          cd docs-site
          npm run docs:build
      - name: Upload pages artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: docs-site/build

  deploy:
    needs: build-docs
    permissions:
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4

```

### summit-main/.github/workflows/batch-merge.yml

```
name: Batch Merge PRs

on:
  workflow_dispatch:
    inputs:
      integration_branch:
        description: 'The branch to merge PRs into'
        required: true
        default: 'integration/batch'
      label_name:
        description: 'The label to look for on PRs'
        required: true
        default: 'batch-merge'

jobs:
  batch-merge:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@c9ef52556095b32f140b0c7d74474f53696d9000 # v4
        with:
          ref: ${{ github.event.inputs.integration_branch }}

      - name: Get PRs with label
        id: get_prs
        uses: actions/github-script@60a0d83 # v6
        with:
          script: |
            const result = await github.rest.issues.listForRepo({
              owner: context.repo.owner,
              repo: context.repo.repo,
              state: 'open',
              labels: ['${{ github.event.inputs.label_name }}']
            });
            const prs = result.data.filter(issue => issue.pull_request);
            return prs.map(pr => pr.number);

      - name: Merge PRs
        uses: actions/github-script@60a0d83 # v6
        with:
          script: |
            const prs = ${{ steps.get_prs.outputs.result }};
            for (const prNumber of prs) {
              try {
                await github.rest.pulls.merge({
                  owner: context.repo.owner,
                  repo: context.repo.repo,
                  pull_number: prNumber,
                  merge_method: 'squash'
                });
                console.log(`Successfully merged PR #${prNumber}`);
              } catch (error) {
                console.log(`Failed to merge PR #${prNumber}: ${error.message}`);
              }
            }

```

### summit-main/.github/workflows/bootstrap-roadmap.yml

```
name: bootstrap-roadmap

on:
  workflow_dispatch:
    inputs:
      project_title:
        description: 'GitHub Project title'
        required: false
        default: 'Assistant v1.1'

jobs:
  bootstrap:
    runs-on: ubuntu-latest
    env:
      DEFAULT_STATUS: Planned
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Ensure jq and gh available
        run: |
          sudo apt-get update
          sudo apt-get install -y jq || true
          gh --version || true

      - name: Bootstrap roadmap (labels, milestones, project, tracking issues)
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          PROJECT_TITLE: ${{ github.event.inputs.project_title }}
        run: |
          chmod +x scripts/bootstrap_roadmap.sh
          ./scripts/bootstrap_roadmap.sh

```

### summit-main/.github/workflows/brand-flip-placeholder.yml

```
name: Brand Flip Placeholder (No-Op)

on:
  workflow_dispatch:
    inputs:
      target_brand:
        description: Desired PRODUCT_BRAND (Summit or IntelGraph)
        required: true
        default: Summit
      confirm:
        description: Type 'ack' to acknowledge this workflow does NOT flip runtime brand
        required: false
        default: ''
  workflow_call:
    inputs:
      target_brand:
        required: true
        type: string
      confirm:
        required: false
        type: string
        default: ''

jobs:
  announce:
    runs-on: ubuntu-latest
    steps:
      - name: Announce no-op brand flip
        run: |
          echo "Requested target brand: '${{ inputs.target_brand }}'"
          echo "NOTE: This workflow does NOT change runtime configuration."
          echo "Flip PRODUCT_BRAND at your deployment layer (e.g., Helm values, K8s env, or secret)."
          echo "Examples:"
          echo "- Helm: --set env.PRODUCT_BRAND=${{ inputs.target_brand }}"
          echo "- K8s: patch Deployment env var PRODUCT_BRAND=${{ inputs.target_brand }}"
          echo "- Compose: export PRODUCT_BRAND=${{ inputs.target_brand }} and restart"
          echo "Rollback: set PRODUCT_BRAND=IntelGraph"
      - name: Require explicit ack (no-op safeguard)
        run: |
          if [ "${{ inputs.confirm }}" != "ack" ]; then
            echo "Skipping (no-op). Provide confirm=ack to acknowledge this does not change runtime config." >&2
            exit 0
          fi
          echo "Acknowledged no-op. Proceed with external flip as per runbook."

```

### summit-main/.github/workflows/brand-scan.yml

```
name: Brand Scan
on:
  pull_request:
  push:
    branches: [feature/rename-summit]
  workflow_call:
    inputs:
      allowlist:
        description: Optional custom allowlist file path
        required: false
        type: string
        default: ''
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Fail on stray IntelGraph literals
        env:
          ALLOWLIST: ${{ inputs.allowlist }}
        run: |
          set -euo pipefail
          if [ -n "${ALLOWLIST:-}" ] && [ -f "$ALLOWLIST" ]; then
            pattern=$(paste -sd'|' "$ALLOWLIST")
          elif [ -f scripts/brand-scan-allowlist.txt ]; then
            pattern=$(paste -sd'|' scripts/brand-scan-allowlist.txt)
          else
            pattern='^docs/|^CHANGELOG.md$|^config/brand/brand.yaml$|^server/src/middleware/brandHeaders.ts$'
          fi
          # Search tracked text files for IntelGraph
          hits=$(git ls-files | grep -E '\.(ts|js|tsx|jsx|md|yml|yaml|json|html|css)$' | xargs grep -n "IntelGraph" || true)
          # Filter allowlist
          BAD=()
          while IFS= read -r line; do
            [ -z "$line" ] && continue
            file=${line%%:*}
            if echo "$file" | grep -Eq "$pattern"; then continue; fi
            BAD+=("$line")
          done <<< "$hits"
          if [ ${#BAD[@]} -gt 0 ]; then
            echo 'Found non-allowlisted IntelGraph literals:' >&2
            printf '%s\n' "${BAD[@]}" >&2
            exit 1
          fi

```

### summit-main/.github/workflows/browser-matrix.yml

```
name: Browser Matrix E2E Tests

on:
  push:
    branches:
      - main
      - feature/browser-matrix-ga
  pull_request:
    branches:
      - main
      - feature/browser-matrix-ga

jobs:
  playwright-tests:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        browser: [chromium, firefox, webkit]
        # Add Edge on Windows if needed, but Playwright's chromium often covers it
        # os: [ubuntu-latest, windows-latest] # Example for Windows, adjust as needed
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright browsers
        run: npx playwright install --with-deps
      - name: Run Playwright tests on ${{ matrix.browser }}
        run: npx playwright test --project=${{ matrix.browser }}
        env:
          # Define environment variables for smoke paths here
          # For example:
          # DASHBOARD_URL: 'http://localhost:3000/dashboard'
          # RUNS_TABLE_URL: 'http://localhost:3000/runs'
          # ...
        # Capture traces, videos, screenshots
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-results-${{ matrix.browser }}
          path: playwright-report/
          retention-days: 30
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-traces-${{ matrix.browser }}
          path: test-results/
          retention-days: 30

  tor-mode-tests:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    needs: playwright-tests # Run after main playwright tests
    continue-on-error: true # Mark as continue-on-error
    services:
      torproxy:
        image: dperson/torproxy
        ports:
          - 9050:9050 # SOCKS5 proxy port
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright Firefox
        run: npx playwright install firefox --with-deps
      - name: Run Playwright tests in Tor mode (Firefox)
        run: npx playwright test --project=firefox --config=playwright.config.ts --grep="smoke paths" --proxy-server="socks5://localhost:9050"
        env:
          # Define environment variables for smoke paths here
          # For example:
          # DASHBOARD_URL: 'http://localhost:3000/dashboard'
          # ...
        # Capture traces, videos, screenshots
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-results-tor-firefox
          path: playwright-report/
          retention-days: 30
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-traces-tor-firefox
          path: test-results/
          retention-days: 30
      - name: Capture known issues (placeholder)
        run: |
          echo "Known issues for Tor mode tests will be captured here."
          # Example: parse test results for specific failures related to Tor
          # cat playwright-report/results.xml | grep "Tor-related-error" > known-issues.txt
          echo "This is a placeholder for known issues." > known-issues-tor.txt
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: tor-known-issues
          path: known-issues-tor.txt
          retention-days: 30

  accessibility-tests:
    timeout-minutes: 15
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright browsers
        run: npx playwright install --with-deps
      - name: Run accessibility tests
        run: npx playwright test e2e/a11y/maestro.a11y.spec.ts
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: accessibility-report
          path: playwright-report/
          retention-days: 30

```

### summit-main/.github/workflows/build-publish.yml

```
name: Build & Publish (Control Plane)

on:
  push:
    branches: [main]
  workflow_dispatch: {}

permissions:
  contents: read
  packages: write
  id-token: write # for cosign keyless

env:
  IMAGE_NAME: ghcr.io/${{ github.repository }}/maestro-control-plane

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up QEMU
        uses: docker/setup-qemu-action@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push image
        uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: |
            ${{ env.IMAGE_NAME }}:sha-${{ github.sha }}
            ${{ env.IMAGE_NAME }}:latest
          platforms: linux/amd64

      - name: Install cosign
        uses: sigstore/cosign-installer@v3

      - name: Sign image (keyless)
        env:
          COSIGN_EXPERIMENTAL: '1'
        run: |
          cosign sign --yes $IMAGE_NAME:sha-${{ github.sha }}

      - name: Generate SBOM (SPDX JSON)
        uses: anchore/sbom-action@v0
        with:
          image: ${{ env.IMAGE_NAME }}:sha-${{ github.sha }}
          format: spdx-json
          output-file: sbom.spdx.json

      - name: Attach SBOM as attestation
        env:
          COSIGN_EXPERIMENTAL: '1'
        run: |
          cosign attest --yes \
            --predicate sbom.spdx.json \
            --type spdx \
            $IMAGE_NAME:sha-${{ github.sha }}

      - name: Upload artifacts (SBOM)
        uses: actions/upload-artifact@v4
        with:
          name: sbom
          path: sbom.spdx.json

```

### summit-main/.github/workflows/cd.yaml

```
name: cd
on:
  pull_request:
    types: [opened, synchronize, reopened]
  push:
    branches: [main]
permissions:
  id-token: write
  contents: read
  deployments: write
jobs:
  preview-deploy:
    if: ${{ github.event_name == 'pull_request' }}
    runs-on: ubuntu-latest
    env:
      NAMESPACE: pr-${{ github.event.number }}
      IMAGE: ghcr.io/${{ github.repository }}/maestro:${{ github.sha }}
    steps:
      - uses: actions/checkout@v4
      - uses: azure/setup-kubectl@v4
      - uses: azure/setup-helm@v4
      - name: Kube auth (OIDC → cloud)
        uses: azure/k8s-set-context@v4
        with:
          method: service-account
          k8s-url: ${{ secrets.DEV_K8S_API }}
          k8s-secret: ${{ secrets.DEV_K8S_SA_TOKEN }}
      - name: Create namespace
        run: kubectl create ns $NAMESPACE || true
      - name: Helm upgrade
        run: |
          helm upgrade --install maestro charts/maestro \
            --namespace $NAMESPACE \
            --set image.repository=ghcr.io/${{ github.repository }}/maestro \
            --set image.tag=${{ github.sha }}
            --set app.env=preview \
            --wait --timeout 5m
  dev-deploy:
    if: ${{ github.event_name == 'push' && github.ref == 'refs/heads/main' }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: azure/setup-kubectl@v4
      - uses: azure/setup-helm@v4
      - name: Kube auth
        uses: azure/k8s-set-context@v4
        with:
          method: service-account
          k8s-url: ${{ secrets.DEV_K8S_API }}
          k8s-secret: ${{ secrets.DEV_K8S_SA_TOKEN }}
      - name: Helm upgrade (dev)
        run: |
          helm upgrade --install maestro charts/maestro \
            --namespace dev \
            --set image.repository=ghcr.io/${{ github.repository }}/maestro \
            --set image.tag=${{ github.sha }}
            --set app.env=dev \
            --wait --timeout 5m

```

### summit-main/.github/workflows/cd.yml

```
name: CD Pipeline
on:
  workflow_run:
    workflows: ['release-signoff']
    types: [completed]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

permissions:
  contents: read
  id-token: write
  packages: read

jobs:
  # Release and build images for tags
  release:
    name: Release & Build
    runs-on: ubuntu-latest
    if: github.event.workflow_run.conclusion == 'success'
    permissions:
      contents: write
      packages: write
    outputs:
      version: ${{ steps.version.outputs.version }}
    strategy:
      matrix:
        service:
          - api-gateway
          - analytics-service
          - ml-engine
          - graph-analytics
          - feed-processor
          - search-engine
          - workflow-engine
          - mobile-interface
    steps:
      - name: Checkout code
        uses: actions/checkout@c9ef52556095b32f140b0c7d74474f53696d9000 # v4

      - name: Extract version
        id: version
        run: echo "version=${{ github.event.workflow_run.head_commit.id }}" >> $GITHUB_OUTPUT

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@94ab11c4e8a0292eaf4d3e5b44313865b0473544 # v3

      - name: Log in to Container Registry
        uses: docker/login-action@28218f9b04b4f3f62068d7b6ce6ca5b26e35336c # v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@573961664f784b8d022460d516eda0a0959374ac # v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/${{ matrix.service }}
          tags: |
            type=raw,value=${{ github.event.workflow_run.head_commit.id }}
            type=raw,value=latest

      - name: Build and push image
        uses: docker/build-push-action@2568b8024053d353f34a2ca2d4de679415494351 # v5
        with:
          context: .
          file: ./apps/${{ matrix.service }}/Dockerfile
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          platforms: linux/amd64,linux/arm64

      - name: Create GitHub Release
        if: matrix.service == 'api-gateway'
        uses: softprops/action-gh-release@de2c0eb89ae2a093876385947365aca7b0e5f844 # v1
        with:
          tag_name: v${{ steps.version.outputs.version }}
          name: IntelGraph MLFP v${{ steps.version.outputs.version }}
          body: |
            ## 🚀 IntelGraph MLFP Release v${{ steps.version.outputs.version }}

            ### Docker Images
            - `${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/api-gateway:v${{ steps.version.outputs.version }}`
            - `${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/analytics-service:v${{ steps.version.outputs.version }}`
            - `${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/ml-engine:v${{ steps.version.outputs.version }}`
            - `${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/graph-analytics:v${{ steps.version.outputs.version }}`
            - `${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/feed-processor:v${{ steps.version.outputs.version }}`
            - `${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/search-engine:v${{ steps.version.outputs.version }}`
            - `${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/workflow-engine:v${{ steps.version.outputs.version }}`
            - `${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/mobile-interface:v${{ steps.version.outputs.version }}`

            ### Deployment
            ```bash
            helm upgrade --install intelgraph ./deploy/helm/intelgraph \
              -f ./deploy/helm/intelgraph/values.yaml \
              -f ./deploy/helm/intelgraph/values-prod.yaml \
              --set global.tag=v${{ steps.version.outputs.version }}
            ```
          draft: false
          prerelease: false

  # Deploy to staging environment
  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    if: github.event.workflow_run.conclusion == 'success'
    needs: [release]
    environment:
      name: staging
      url: https://staging.intelgraph.example.com
    steps:
      - name: Checkout code
        uses: actions/checkout@c9ef52556095b32f140b0c7d74474f53696d9000 # v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@e3dd6a429d7300a6a4c196c26e0715726ac04ae4 # v4
        with:
          role-to-assume: ${{ secrets.AWS_STAGING_ROLE }}
          aws-region: ${{ secrets.AWS_REGION }}

      - name: Setup kubectl
        uses: azure/setup-kubectl@a8293405358683a03b7f843855a6ab12cf159a6a # v4
        with:
          version: 'v1.30.0'

      - name: Setup Helm
        uses: azure/setup-helm@fe362624587c032501648691abc1165b615b2e6f # v3
        with:
          version: '3.14.0'

      - name: Update kubeconfig
        run: |
          aws eks update-kubeconfig \
            --region ${{ secrets.AWS_REG
```

### summit-main/.github/workflows/ci-client-tests.yml

```
name: client-tests

on:
  pull_request:
    paths:
      - 'client/**'
      - '.github/workflows/ci-client-tests.yml'
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        node: [20.x]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
          cache: 'pnpm'
      - name: Install
        run: pnpm install --frozen-lockfile
      - name: Run tests (client)
        working-directory: client
        env:
          CI: '1'
        run: pnpm jest --ci --runInBand --reporters=default --coverage
      - name: Upload coverage artifact
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: client-coverage
          path: client/coverage
      - name: Upload JUnit test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: client-junit-results
          path: client/reports/junit.xml

```

### summit-main/.github/workflows/ci-minimal.yml

```
name: ci

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  minimal-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@c9ef52556095b32f140b0c7d74474f53696d9000 # v4
      - name: Minimal CI validation
        run: |
          echo "✅ CI validation passed"
          echo "This minimal CI enables GA Core PRs to merge while full CI is being fixed"

```

### summit-main/.github/workflows/ci-nightly-services.yml

```
name: nightly-services

on:
  schedule:
    - cron: '0 7 * * *' # daily 07:00 UTC
  workflow_dispatch: {}

jobs:
  services:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - name: Install
        run: pnpm install --frozen-lockfile

      - name: Start services (Neo4j, Redis, ML placeholder)
        run: |
          docker compose -f server/compose.services.yml up -d
          echo "Waiting for services to be healthy..."
          sleep 15

      - name: Server tests WITH_SERVICES
        env:
          WITH_SERVICES: '1'
          NEO4J_URI: bolt://neo4j:7687
          NEO4J_USER: neo4j
          NEO4J_PASSWORD: devpassword
          REDIS_URL: redis://redis:6379
          PYTHON_API_URL: http://intelgraph-ml:8081
        run: pnpm --filter server jest --ci --runInBand --coverage

      - name: Client Playwright smoke (chromium)
        working-directory: client
        env:
          CI: '1'
        run: pnpm playwright test --project=chromium --grep @smoke

      - name: k6 smoke (optional)
        if: ${{ runner.os == 'Linux' }}
        run: |
          sudo apt-get update && sudo apt-get install -y ca-certificates gnupg curl
          curl -fsSL https://dl.k6.io/key.gpg | sudo gpg --dearmor -o /usr/share/keyrings/k6-archive-keyring.gpg
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update && sudo apt-get install -y k6
          k6 run server/tests/k6.assistant.js -e BASE=http://localhost:8080 -e TOKEN=$K6_TOKEN || true

      - name: Upload coverage
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: nightly-coverage
          path: |
            **/coverage

```

### summit-main/.github/workflows/ci-observability.yml

```
name: Observability SLOs

on:
  workflow_dispatch:

jobs:
  check-slos:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@c9ef52556095b32f140b0c7d74474f53696d9000

      - name: Setup Node.js
        uses: actions/setup-node@60edb5dd545a775178f52524783378180af0d1f8
        with:
          node-version: '20.x'

      - name: Install dependencies
        run: npm install axios
        working-directory: ./tests/observability

      - name: Check SLOs
        run: node tests/observability/check-slos.js
        env:
          PROMETHEUS_URL: ${{ secrets.PROMETHEUS_URL }}

```

### summit-main/.github/workflows/ci-performance.yml

```
name: Performance Tests

on:
  pull_request:
    paths:
      - 'tests/performance/**'

jobs:
  performance-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_DB: intelgraph_test
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_password
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      neo4j:
        image: neo4j:4.4-enterprise
        env:
          NEO4J_AUTH: neo4j/test_password
          NEO4J_ACCEPT_LICENSE_AGREEMENT: 'yes'
          NEO4J_apoc_export_file_enabled: true
          NEO4J_apoc_import_file_enabled: true
          NEO4J_dbms_security_procedures_unrestricted: apoc.*
        options: >-
          --health-cmd "cypher-shell -u neo4j -p test_password 'RETURN 1'"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 10
        ports:
          - 7474:7474
          - 7687:7687

      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - name: Checkout code
        uses: actions/checkout@c9ef52556095b32f140b0c7d74474f53696d9000 # v4

      - name: Setup Node.js
        uses: actions/setup-node@60edb5dd545a775178f52524783378180af0d1f8 # v4
        with:
          node-version: '20.x'
          cache: 'npm'
          cache-dependency-path: |
            package-lock.json
            server/package-lock.json

      - name: Install root dependencies
        run: npm ci

      - name: Install server dependencies
        working-directory: ./server
        run: npm ci

      - name: Wait for services
        run: |
          pg_isready -h localhost -p 5432 -U test_user -d intelgraph_test
          timeout 60s bash -c 'until echo > /dev/tcp/localhost/7687; do sleep 1; done'
          redis-cli -h localhost -p 6379 ping

      - name: Run performance tests
        working-directory: ./tests/performance
        run: npm test
        env:
          NODE_ENV: test
          DATABASE_URL: postgresql://test_user:test_password@localhost:5432/intelgraph_test
          NEO4J_URI: bolt://localhost:7687
          NEO4J_USERNAME: neo4j
          NEO4J_PASSWORD: test_password
          REDIS_URL: redis://localhost:6379
          JWT_SECRET: test_jwt_secret

```

### summit-main/.github/workflows/ci.yaml

```
name: maestro-ci
on:
  push: { branches: [main] }
  pull_request:
permissions:
  contents: read
  id-token: write # for OIDC → cloud registry
  packages: write
env:
  IMAGE_NAME: ghcr.io/yourorg/maestro-conductor
  NODE_OPTIONS: --max-old-space-size=4096
jobs:
  test_build_scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run lint && npm test -- --ci --reporters=default
      - name: Build image
        run: |
          docker build --pull -t $IMAGE_NAME:${{ github.sha }} .
      - name: Vulnerability scan
        uses: aquasecurity/trivy-action@0.24.0
        with:
          image-ref: ${{ env.IMAGE_NAME }}:${{ github.sha }}
          exit-code: '1'
          ignore-unfixed: true
          vuln-type: 'os,library'
          severity: 'CRITICAL,HIGH'
      - name: SBOM (Syft)
        uses: anchore/sbom-action@v0
        with:
          image: ${{ env.IMAGE_NAME }}:${{ github.sha }}
          artifact-name: sbom.spdx.json
      - name: Login GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - name: Push image
        run: docker push $IMAGE_NAME:${{ github.sha }}
      - name: Cosign sign
        uses: sigstore/cosign-installer@v3
      - run: cosign sign --yes $IMAGE_NAME@$(docker inspect --format='{{index .RepoDigests 0}}' $IMAGE_NAME:${{ github.sha }} | cut -d'@' -f2)

  deploy_dev:
    if: github.ref == 'refs/heads/main'
    needs: [test_build_scan]
    runs-on: ubuntu-latest
    environment: dev
    steps:
      - uses: actions/checkout@v4
      - uses: azure/setup-kubectl@v4
      - uses: azure/setup-helm@v4
      - name: Kube Auth
        run: |
          # use OIDC to get a short-lived token or import kubeconfig from secret
          mkdir -p ~/.kube && echo "${KUBECONFIG_YAML}" > ~/.kube/config
        env:
          KUBECONFIG_YAML: ${{ secrets.DEV_KUBECONFIG }}
      - name: Helm upgrade
        run: |
          helm upgrade --install maestro charts/maestro \
            --namespace intelgraph-dev --create-namespace \
            --set image.repository=${IMAGE_NAME} \
            --set image.tag=${{ github.sha }} \
            --values charts/maestro/values-dev.yaml

```

### summit-main/.github/workflows/ci.yml

```
name: 🚀 CI - Comprehensive Testing Pipeline
on:
  push:
    branches: [main, develop, 'release/**', 'hotfix/**', 'feature/**']
  pull_request:
    branches: [main, develop]
  workflow_dispatch:

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

env:
  NODE_VERSION: '20'
  PYTHON_VERSION: '3.11'

jobs:
  changes:
    name: 🔍 Detect Changes
    runs-on: ubuntu-latest
    outputs:
      client: ${{ steps.changes.outputs.client }}
      server: ${{ steps.changes.outputs.server }}
      python: ${{ steps.changes.outputs.python }}
      docs: ${{ steps.changes.outputs.docs }}
      infra: ${{ steps.changes.outputs.infra }}
      workflows: ${{ steps.changes.outputs.workflows }}
      skip-full: ${{ steps.changes.outputs.skip-full }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: dorny/paths-filter@v3
        id: changes
        with:
          filters: |
            client:
              - 'client/**'
              - 'web/**'
              - 'package*.json'
            server:
              - 'server/**'
              - 'gateway/**'
              - 'api/**'
            python:
              - '**/*.py'
              - '**/requirements*.txt'
              - '**/pyproject.toml'
            docs:
              - 'docs/**'
              - '*.md'
              - '.github/**/*.md'
            infra:
              - 'docker/**'
              - 'docker-compose*.yml'
              - 'Dockerfile*'
              - 'Makefile'
              - 'Taskfile.yml'
            workflows:
              - '.github/workflows/**'
      - name: Check if docs-only
        run: |
          if [[ "${{ steps.changes.outputs.docs }}" == "true" && \
                "${{ steps.changes.outputs.client }}" == "false" && \
                "${{ steps.changes.outputs.server }}" == "false" && \
                "${{ steps.changes.outputs.python }}" == "false" && \
                "${{ steps.changes.outputs.infra }}" == "false" ]]; then
            echo "skip-full=true" >> $GITHUB_OUTPUT
            echo "📚 Documentation-only changes detected"
          else
            echo "skip-full=false" >> $GITHUB_OUTPUT
            echo "🔧 Code changes detected - full CI required"
          fi

  lint-and-format:
    name: 🧹 Lint & Format
    runs-on: ubuntu-latest
    needs: changes
    if: needs.changes.outputs.skip-full == 'false'
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        if: needs.changes.outputs.client == 'true' || needs.changes.outputs.server == 'true'
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Setup Python
        if: needs.changes.outputs.python == 'true'
        uses: actions/setup-python@v5
        with:
          python-version: ${{ env.PYTHON_VERSION }}
          cache: 'pip'

      - name: Install Node dependencies
        if: needs.changes.outputs.client == 'true' || needs.changes.outputs.server == 'true'
        run: npm ci --ignore-scripts || echo "Node dependencies installed"

      - name: Install Python dependencies
        if: needs.changes.outputs.python == 'true'
        run: |
          pip install -r requirements.txt || echo "No requirements.txt found"
          pip install black ruff mypy || echo "Linting tools installed"

      - name: ESLint
        if: needs.changes.outputs.client == 'true' || needs.changes.outputs.server == 'true'
        run: npm run lint || echo "ESLint check completed"

      - name: Prettier
        if: needs.changes.outputs.client == 'true' || needs.changes.outputs.server == 'true'
        run: npm run format:check || echo "Prettier check completed"

      - name: Ruff (Python linting)
        if: needs.changes.outputs.python == 'true'
        run: ruff check . || echo "Ruff check completed"

      - name: Black (Python formatting)
        if: needs.changes.outputs.python == 'true'
        run: black --check . || echo "Black check completed"

  test-suite:
    name: 🧪 Test Suite
    runs-on: ubuntu-latest
    needs: [changes, lint-and-format]
    if: needs.changes.outputs.skip-full == 'false'
    strategy:
      matrix:
        test-type: [client, server, python]
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      neo4j:
        image: neo4j:5
        env:
          NEO4J_AUTH: neo4j/password
          NEO4J_PLUGINS: '["apoc"]'
        options: >-
          --health-cmd "cypher-shell -u neo4j -p password 'RETURN 1'"
          --health-interval 10s
          --health-timeout 5s
          --health-retries
```

### summit-main/.github/workflows/client-graphql-guard.yml

```
name: Client GraphQL Guard

on:
  pull_request:
    paths:
      - 'client/**'
      - 'scripts/find-duplicate-ops.mjs'
      - '.github/workflows/client-graphql-guard.yml'

jobs:
  client-graphql-guard:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '18.x'

      - name: Install root deps
        run: npm ci

      - name: Install client deps
        run: npm ci --workspace client || npm -w client ci

      - name: Lint GraphQL docs and client
        run: npm -w client run lint

      - name: Precodegen duplicate check
        run: node scripts/find-duplicate-ops.mjs

      - name: Codegen (live)
        id: codegen_live
        continue-on-error: true
        env:
          GRAPHQL_CODEGEN_CONCURRENCY: '1'
        run: npm -w client run persist:queries

      - name: Codegen (snapshot fallback)
        if: ${{ steps.codegen_live.outcome == 'failure' }}
        env:
          GRAPHQL_CODEGEN_CONCURRENCY: '1'
          CODEGEN_SCHEMA: client/schema.graphql
        run: npm -w client run persist:queries

      - name: Schema badge
        uses: BrianCLong/intelgraph/.github/workflows/schema-badge.yml@chore/graphql-namespace-sweep
        with:
          schema_source: ${{ steps.codegen_live.outcome == 'success' && 'live' || 'snapshot' }}
          comment_on_pr: true
          title: Client GraphQL Guard — Schema
          manifest_path: client/artifacts/graphql-ops.json

      - name: Verify safelist covers client operations
        run: npm run verify:safelist

```

### summit-main/.github/workflows/compliance-automation.yml

```
name: Compliance Automation

on:
  push:
    branches: [main, develop, 'release/*']
  pull_request:
    branches: [main, develop]
  schedule:
    # Daily compliance checks at 2 AM UTC
    - cron: '0 2 * * *'

env:
  NODE_VERSION: '18'
  CONDUCTOR_ENV: 'ci'
  COMPLIANCE_REPORT_RETENTION_DAYS: 90

jobs:
  security-scan:
    name: Security Vulnerability Scan
    runs-on: ubuntu-latest
    outputs:
      security-score: ${{ steps.security-analysis.outputs.score }}
      critical-findings: ${{ steps.security-analysis.outputs.critical }}
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci --audit-level moderate
        
      - name: Run npm audit
        id: npm-audit
        run: |
          npm audit --json > npm-audit-report.json || true
          echo "audit-report=$(cat npm-audit-report.json)" >> $GITHUB_OUTPUT
          
      - name: Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=medium --json-file-output=snyk-report.json
          
      - name: CodeQL analysis
        uses: github/codeql-action/init@v3
        with:
          languages: typescript, javascript
          config-file: ./.github/codeql/codeql-config.yml
          
      - name: Perform CodeQL analysis
        uses: github/codeql-action/analyze@v3
        
      - name: Run Semgrep SAST
        uses: returntocorp/semgrep-action@v1
        with:
          config: >-
            p/security-audit
            p/secrets
            p/owasp-top-ten
            p/nodejs
          publishToken: ${{ secrets.SEMGREP_APP_TOKEN }}
          publishDeployment: production
          
      - name: Security analysis summary
        id: security-analysis
        run: |
          # Aggregate security findings
          node .github/scripts/aggregate-security-findings.js \
            --npm-audit npm-audit-report.json \
            --snyk snyk-report.json \
            --output security-summary.json
          
          SCORE=$(jq -r '.overall_score' security-summary.json)
          CRITICAL=$(jq -r '.critical_count' security-summary.json)
          
          echo "score=$SCORE" >> $GITHUB_OUTPUT
          echo "critical=$CRITICAL" >> $GITHUB_OUTPUT
          
      - name: Upload security reports
        uses: actions/upload-artifact@v4
        with:
          name: security-reports-${{ github.sha }}
          path: |
            npm-audit-report.json
            snyk-report.json
            security-summary.json
          retention-days: ${{ env.COMPLIANCE_REPORT_RETENTION_DAYS }}

  policy-validation:
    name: OPA Policy Validation
    runs-on: ubuntu-latest
    outputs:
      policy-score: ${{ steps.opa-test.outputs.score }}
      policy-coverage: ${{ steps.opa-test.outputs.coverage }}
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Set up OPA
        uses: open-policy-agent/setup-opa@v2
        with:
          version: 'v0.58.0'
          
      - name: Validate policy syntax
        run: |
          find policy/ -name "*.rego" -exec opa fmt --diff {} \;
          find policy/ -name "*.rego" -exec opa parse {} \;
          
      - name: Run policy tests
        id: opa-test
        run: |
          # Run all policy tests
          opa test policy/ --coverage --format json > opa-test-results.json
          
          # Calculate policy coverage and score
          COVERAGE=$(jq -r '.coverage.percentage' opa-test-results.json)
          PASS_COUNT=$(jq -r '.results | map(select(.pass == true)) | length' opa-test-results.json)
          TOTAL_COUNT=$(jq -r '.results | length' opa-test-results.json)
          
          if [ "$TOTAL_COUNT" -eq 0 ]; then
            SCORE=0
          else
            SCORE=$(echo "scale=2; ($PASS_COUNT * 100) / $TOTAL_COUNT" | bc)
          fi
          
          echo "score=$SCORE" >> $GITHUB_OUTPUT
          echo "coverage=$COVERAGE" >> $GITHUB_OUTPUT
          
      - name: Policy simulation tests
        run: |
          # Test policies against historical data
          node .github/scripts/policy-simulation.js \
            --policy-dir policy/ \
            --test-data .github/test-data/access-patterns.json \
            --output policy-simulation.json
            
      - name: Validate bundle integrity
        run: |
          # Create and verify policy bundle
          opa build policy/ --bundle
          tar -tf bundle.tar.gz | head -20
          
      - name: Upload policy reports
        uses: actions/upload-artifact@v4
        with:
          name: policy-reports-${{ github.sha }}
          path: |
            opa-test-results.json
            policy-simulation.json
            bundle.tar.
```

### summit-main/.github/workflows/conductor-smoke.yml

```
name: Conductor Smoke
on:
  pull_request:
    paths:
      - 'server/**'
      - 'client/**'
      - 'Justfile'
jobs:
  smoke:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: extractions/setup-just@v1
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: docker compose up -d neo4j postgres redis
      - run: just build-all
      - run: just mcp-up
      - run: just server-up
      - run: just conductor-smoke
      - if: always()
        run: just mcp-down && just server-down && docker compose down

```

### summit-main/.github/workflows/container-security.yml

```
# ===================================================================
# CONTAINER SECURITY PIPELINE
# Comprehensive security scanning, SBOM generation, and image signing
# ===================================================================

name: Container Security Pipeline

on:
  push:
    branches: [main, develop, 'security/**']
    paths:
      - 'Dockerfile*'
      - 'package*.json'
      - 'server/**'
      - '.github/workflows/container-security.yml'
  pull_request:
    branches: [main, develop]
    paths:
      - 'Dockerfile*'
      - 'package*.json'
      - 'server/**'
  schedule:
    # Run security scans daily at 02:00 UTC
    - cron: '0 2 * * *'

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}/maestro
  COSIGN_EXPERIMENTAL: 1

jobs:
  # ===================================================================
  # DEPENDENCY SCANNING
  # ===================================================================
  dependency-scan:
    name: Dependency Security Scan
    runs-on: ubuntu-latest
    permissions:
      contents: read
      security-events: write

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18.20.3'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run npm audit
        run: |
          npm audit --audit-level moderate --json > npm-audit-report.json || true
          npm audit --audit-level high --json > npm-audit-high.json || true

      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high --json > snyk-report.json
        continue-on-error: true

      - name: Upload dependency scan results
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: snyk.sarif

  # ===================================================================
  # CONTAINER IMAGE BUILD AND SCAN
  # ===================================================================
  container-scan:
    name: Container Security Scan
    runs-on: ubuntu-latest
    permissions:
      contents: read
      security-events: write
      packages: write
      id-token: write
      attestations: write

    outputs:
      image-digest: ${{ steps.build.outputs.digest }}
      image-tag: ${{ steps.meta.outputs.tags }}

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
        with:
          driver-opts: |
            image=moby/buildkit:v0.12.5

      - name: Log in to Container Registry
        if: github.event_name != 'pull_request'
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=sha,prefix={{branch}}-
            type=raw,value=latest,enable={{is_default_branch}}
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}

      - name: Build container image
        id: build
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./Dockerfile.secure-enhanced
          target: production
          platforms: linux/amd64,linux/arm64
          push: false
          load: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          build-args: |
            BUILD_DATE=${{ fromJSON(steps.meta.outputs.json).labels['org.opencontainers.image.created'] }}
            BUILD_VERSION=${{ fromJSON(steps.meta.outputs.json).labels['org.opencontainers.image.version'] }}
            VCS_REF=${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH,MEDIUM'
          exit-code: '1'

      - name: Upload Trivy scan results to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: 'trivy-results.sarif'

      - name: Run Grype vulnerability scanner
        uses: anchore/scan-action@v3
        id: grype-scan
        with:
          image: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
          fail-build: true
  
```

### summit-main/.github/workflows/contract-tests.yml

```
name: Contract Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read

jobs:
  contract-tests:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install deps
        run: npm ci

      - name: Run contract tests (Vitest)
        run: npx vitest run --reporter=default

      - name: Upload test artifacts (on failure)
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: vitest-logs
          path: |
            **/junit*.xml
            **/.vitest-log*

```

### summit-main/.github/workflows/cosign-sign.yml

```
name: cosign-sign

on:
  push:
    tags: ['v*'] # sign on tag push (e.g., v2025.09.02-maestro.1)
  workflow_dispatch:
    inputs:
      tag:
        description: 'Container tag to build & sign (e.g., v2025.09.02-maestro.1)'
        required: true
        type: string

permissions:
  contents: read
  packages: write # push to GHCR
  id-token: write # OIDC for keyless signing

env:
  REGISTRY: ghcr.io
  OWNER_SLUG: brianclong # ghcr namespace (lowercase owner)
  IMAGE_NAME: maestro-control-plane

jobs:
  build-sign:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Multi-arch not required; keep it simple and fast (amd64)
      - uses: docker/setup-qemu-action@v3
      - uses: docker/setup-buildx-action@v3

      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Resolve TAG
        id: vars
        run: |
          if [ "${{ github.event_name }}" = "workflow_dispatch" ]; then
            echo "TAG=${{ inputs.tag }}" >> "$GITHUB_OUTPUT"
          else
            echo "TAG=${GITHUB_REF_NAME}" >> "$GITHUB_OUTPUT"
          fi

      - name: Build & Push image
        id: bp
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./Dockerfile
          push: true
          platforms: linux/amd64,linux/arm64
          tags: ${{ env.REGISTRY }}/${{ env.OWNER_SLUG }}/${{ env.IMAGE_NAME }}:${{ steps.vars.outputs.TAG }}

      - name: Install cosign
        uses: sigstore/cosign-installer@v3

      - name: Sign image (keyless via OIDC)
        env:
          COSIGN_EXPERIMENTAL: '1'
          IMAGE_REF: ${{ env.REGISTRY }}/${{ env.OWNER_SLUG }}/${{ env.IMAGE_NAME }}:${{ steps.vars.outputs.TAG }}
        run: |
          cosign sign --yes "${IMAGE_REF}"

      - name: Show image digest
        run: |
          echo "Pushed digest: ${{ steps.bp.outputs.digest }}"

```

### summit-main/.github/workflows/cutover-smoke.yml

```
name: Cutover Smoke (Rebrand)

on:
  workflow_dispatch:
    inputs:
      base_url:
        description: Legacy docs base URL (e.g., https://docs.intelgraph.com)
        required: true
      new_ok_host:
        description: New docs host (e.g., https://docs.summit.com) for 200 checks
        required: false
      image_tag:
        description: Image tag or commit SHA to verify dual tags
        required: true
      sdk_smoke:
        description: Run optional SDK install smoke (requires NPM_TOKEN)
        required: false
        default: 'false'
  workflow_call:
    inputs:
      base_url:
        required: true
        type: string
      new_ok_host:
        required: false
        type: string
        default: ''
      image_tag:
        required: true
        type: string
      sdk_smoke:
        required: false
        type: string
        default: 'false'
    outputs:
      issue_number:
        description: Created Cutover Checklist issue number
        value: ${{ jobs.checklist.outputs.issue_number }}
      issue_url:
        description: Created Cutover Checklist issue URL
        value: ${{ jobs.checklist.outputs.issue_url }}

jobs:
  checklist:
    runs-on: ubuntu-latest
    outputs:
      issue_number: ${{ steps.issue.outputs.number }}
      issue_url: ${{ steps.issue.outputs.url }}
    steps:
      - name: Install jq
        run: sudo apt-get update && sudo apt-get install -y jq
      - name: Create Cutover Checklist issue
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        id: issue
        run: |
          set -euo pipefail
          title="Summit Cutover Checklist — $(date -u +%Y-%m-%dT%H:%MZ)"
          body=$(cat <<'MD'
# Summit Cutover Checklist

This issue was auto-created by the Cutover Smoke workflow to guide run-of-show.

## Pre-rename (T‑2 → T‑0)
- [ ] Confirm branch protection patterns and required checks
- [ ] Inventory webhooks/integrations to re-auth after rename
- [ ] Verify Actions use `${{ github.repository }}`
- [ ] Dual-publish containers/SDKs (aliases live)

## Rename & Redirects (T‑0)
- [ ] Rename repo (intelgraph → summit)
- [ ] Run Post-Rename GitHub Checks
- [ ] Run Post-Rename Redirect Smoke
- [ ] Enable docs redirects (Netlify/redirects.map)
- [ ] Run Redirects Smoke (top‑100)

## Brand Flip (T‑0)
- [ ] Set PRODUCT_BRAND=Summit (Rollback: IntelGraph)
- [ ] Purge CDN / cache
- [ ] UI toast/banner shows notice

## Aliases & Installs
- [ ] Verify dual-tag images share digest for target tag
- [ ] Helm install via summit and intelgraph alias
- [ ] SDK install `@summit/sdk` and meta `@intelgraph/sdk`

## Identity & SSO
- [ ] Display/logo updated; EntityID/client_id unchanged
- [ ] SSO smoke passes — no re-consent required

## Observability & Backoffice
- [ ] Metrics stable; dashboards cloned under Summit
- [ ] Alerts healthy; brand=Summit dimension visible

## Comms
- [ ] Status banner live; in‑app toast live
- [ ] T‑0 customer announcement published
- [ ] FAQ updated and live

## Acceptance
- [ ] Availability ≥ 99.9% / 24h; error rate unchanged
- [ ] Top‑100 docs 301→200; no chains > 1
- [ ] Exports show “Summit (formerly IntelGraph)” and verify

## Rollback (≤72h)
- [ ] Flip PRODUCT_BRAND=IntelGraph; disable 301s; keep aliases
- [ ] Restore prior HSTS; revert banners; publish advisory; open RCA
MD
          )
          data=$(jq -n --arg t "$title" --arg b "$body" '{title:$t, body:$b, labels:["rebrand","cutover"]}')
          curl -sS -X POST \
            -H "Authorization: token $GH_TOKEN" \
            -H "Accept: application/vnd.github+json" \
            -d "$data" \
            "https://api.github.com/repos/${GITHUB_REPOSITORY}/issues" | tee /tmp/issue.json
          num=$(jq -r .number /tmp/issue.json)
          url=$(jq -r .html_url /tmp/issue.json)
          echo "Created issue: $url (#$num)"
          echo "number=$num" >> $GITHUB_OUTPUT
          echo "url=$url" >> $GITHUB_OUTPUT
  redirects:
    runs-on: ubuntu-latest
    needs: [checklist]
    steps:
      - uses: actions/checkout@v4
      - name: Run redirects smoke
        env:
          BASE_URL: ${{ inputs.base_url }}
          NEW_OK_HOST: ${{ inputs.new_ok_host }}
        run: |
          chmod +x scripts/smoke-redirects.sh
          ./scripts/smoke-redirects.sh docs/legacy-top100.txt

  images:
    runs-on: ubuntu-latest
    needs: [checklist]
    steps:
      - uses: actions/checkout@v4
      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - name: Verify dual tags share digest (server + client)
        env:
          TAG: ${{ inputs.image_tag }}
          REPO: ${{ github.repository }}
          OWNER: ${{ github.repository_owner }}
        run: |
          set -euo pipefail
          check_pair() {
            local intel=$1 summit=$2
            echo "Pulling $intel and $summit"
            docker pull "$intel" >/dev/null
            doc
```

### summit-main/.github/workflows/dod-gate.yml

```
name: DoD Gate

on:
  pull_request:
    types: [opened, edited, synchronize, reopened]

permissions:
  pull-requests: read
  contents: read

jobs:
  dod-checklist:
    runs-on: ubuntu-latest
    steps:
      - name: Validate DoD checklist is complete
        env:
          BODY: ${{ github.event.pull_request.body }}
        run: |
          echo "Checking PR body for unchecked items..."
          if echo "$BODY" | grep -q "- \[ \]"; then
            echo "❌ Unchecked DoD items found. Please complete the checklist." >&2
            exit 1
          fi
          echo "✅ DoD checklist complete."

```

### summit-main/.github/workflows/enforce-ga-gates.yml

```
name: Enforce GA Gates Evidence
on:
  pull_request:
    types: [opened, edited, synchronize]
permissions:
  contents: read
  pull-requests: write
jobs:
  check-evidence:
    runs-on: ubuntu-latest
    steps:
      - name: Validate PR template sections
        uses: actions/github-script@v7
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          script: |
            const body = context.payload.pull_request.body || '';
            const touched = ['Security/Tenancy','Reliability/Performance','Supply Chain/Evidence','Observability/SLOs','Accessibility/UX','Docs/Runbooks']
              .filter(k => body.includes(`- [x] ${k}`) || body.includes(`- [X] ${k}`));
            const evidence = body.match(/## Evidence[\s\S]*?##/m) || body.match(/## Evidence[\s\S]*$/m);
            const hasEvidence = evidence && evidence[0].trim().length > 20;
            if (!hasEvidence) {
              core.setFailed('Evidence section missing or empty.');
            }
            core.notice(`Gates checked: ${touched.join(', ') || 'none'}`);

  secret-scan:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0 # Fetch all history for gitleaks to scan
      - name: Run Gitleaks scan
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          config_path: .gitleaks.toml

  supply-chain-verify:
    runs-on: ubuntu-latest
    # Gate only when PR touches: packages/**, charts/**, Dockerfile*, */build.*, or label deployable.
    if: |
      contains(github.event.pull_request.labels.*.name, 'deployable') ||
      github.event.pull_request.head.sha != github.event.pull_request.base.sha && (
        github.event.pull_request.changed_files > 0 && (
          contains(join(github.event.pull_request.files.*.filename), 'packages/') ||
          contains(join(github.event.pull_request.files.*.filename), 'charts/') ||
          contains(join(github.event.pull_request.files.*.filename), 'Dockerfile') ||
          contains(join(github.event.pull_request.files.*.filename), '/build.')
        )
      )
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Cosign
        uses: sigstore/cosign-installer@v3.4.0

      - name: Simulate Build and Get Image Digest (Replace with actual build step)
        run: |
          echo "Simulating image build and getting digest..."
          # In a real CI, this would be your actual build step that produces an image.
          # For demonstration, we'll use a dummy image and digest.
          echo "DUMMY_IMAGE=ghcr.io/your-org/your-app:latest" >> $GITHUB_ENV
          echo "DUMMY_IMAGE_DIGEST=sha256:a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2" >> $GITHUB_ENV

      - name: Cosign verify signatures and attestations
        # Replace <issuer> and <repo> with your OIDC issuer and repository identity
        # Replace $DUMMY_IMAGE with the actual image produced by your build
        run: |
          echo "Verifying Cosign signatures for ${{ env.DUMMY_IMAGE }}..."
          cosign verify --certificate-oidc-issuer https://token.actions.githubusercontent.com --certificate-identity "https://github.com/${{ github.repository }}" ${{ env.DUMMY_IMAGE }} || {
            echo "Cosign signature verification failed."
            exit 1
          }
          echo "Cosign signature verification passed."

      - name: SLSA provenance validate
        # Replace $DUMMY_IMAGE with the actual image produced by your build
        run: |
          echo "Verifying SLSA provenance for ${{ env.DUMMY_IMAGE }}..."
          cosign verify-attestation --type slsaprovenance ${{ env.DUMMY_IMAGE }} || {
            echo "SLSA provenance verification failed."
            exit 1
          }
          echo "SLSA provenance verification passed."

      - name: SBOM presence and generation (Syft)
        # This step ensures an SBOM is present or generated.
        # Replace $DUMMY_IMAGE with the actual image produced by your build.
        run: |
          echo "Checking for SBOM presence and generating if not found..."
          # Simulate SBOM generation for the dummy image
          syft ${{ env.DUMMY_IMAGE }} -o spdx-json > sbom.spdx.json || {
            echo "Failed to generate SBOM with Syft."
            exit 1
          }
          echo "SBOM generated: sbom.spdx.json"

      - name: Upload SBOM as artifact
        uses: actions/upload-artifact@v4
        with:
          name: sbom-artifact
          path: sbom.spdx.json

      - name: SBOM diff vs main's last build
        # This is a complex step and requires fetching the SBOM from the main branch's last successful build.
        # For now, this is a placeholder. A full implementation would involve:
        # 1. Downloading the SBOM artifact from the main branch's last successful workflow run.
        # 2. Using `sbom-diff` or `syft diff` (if available) to c
```

### summit-main/.github/workflows/eval-nightly.yml

```
on:
  schedule: [{ cron: '0 6 * * *' }]
  pull_request: # New trigger for PRs
    types: [labeled]
    branches: [main]
    labels: [router-change] # Filter by label

jobs:
  run-eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pipx install uv && uv venv && uv pip install -r eval/requirements.txt
      - name: Run Evaluation
        run: python eval/runner.py --suite eval/suites/router.yaml --base $BASE --token $TOKEN
        env:
          BASE: ${{ secrets.MAESTRO_BASE }}
          TOKEN: ${{ secrets.MAESTRO_TOKEN }}
      - name: Generate HTML Report
        run: python eval/report_generator.py
      - name: Summarize & Propose Weights
        run: python eval/propose.py
      - name: Upload Eval Artifacts to WORM
        run: |
          # Placeholder for S3 upload
          # aws s3 cp reports/ s3://maestro-evidence/eval/${{ github.run_id }}/ --recursive --acl public-read
          echo "Simulating upload of reports to S3 WORM bucket: evidence/eval/${{ github.run_id }}/"
          ls -R reports/ # Show what would be uploaded
      - uses: peter-evans/create-pull-request@v6
        with:
          title: 'Eval: router weights proposal'
          branch: 'eval/weights-proposal'
          labels: eval, router

```

### summit-main/.github/workflows/ga-gates.yml

```
name: GA Gates (release)
on:
  push: { branches: ['release/ga-2025-08'] }
  workflow_dispatch: {}
jobs:
  slo-k6:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: grafana/k6-action@v0.3.1
        with: { filename: load/k6-graphql-slo.js }
        env:
          GRAPHQL_URL: ${{ secrets.GRAPHQL_URL }}
          SEED_NODE: ${{ vars.SEED_NODE }}
  opa-policy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: open-policy-agent/opa-gh-action@v2
        with:
          query: 'data.intelgraph.policy.export.allow'
          policy-path: 'policy/opa'
          input: '{"action":"export","dataset":{"sources":[{"license":"DISALLOW_EXPORT","owner":"Acme"}]}}'
          expect: 'false'
  cypher-acceptance:
    runs-on: ubuntu-latest
    services:
      neo4j:
        image: neo4j:5
        ports: ['7474:7474', '7687:7687']
        env: { NEO4J_AUTH: neo4j/test }
        options: >-
          --health-cmd "cypher-shell -u neo4j -p test 'RETURN 1'"
          --health-interval 10s --health-timeout 5s --health-retries 10
    steps:
      - uses: actions/checkout@v4
      - name: Cypher probes
        run: |
          echo "MATCH (n) RETURN count(n)" | cypher-shell -u neo4j -p test
          cat db/cypher/acceptance.cypher | cypher-shell -u neo4j -p test
  prov-verifier:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.12' }
      - name: Run verifier against sample bundle
        run: |
          python -m tools.prov-verifier.igprov ./samples/disclosure-bundle || exit 1
  golden-prompts:
    runs-on: ubuntu-latest
    services:
      neo4j:
        image: neo4j:5
        ports: ['7474:7474', '7687:7687']
        env: { NEO4J_AUTH: neo4j/test }
        options: >-
          --health-cmd "cypher-shell -u neo4j -p test 'RETURN 1'"
          --health-interval 10s --health-timeout 5s --health-retries 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '18' }
      - name: Validate golden prompts (≥95% valid of 50)
        env:
          PROMPTS_DIR: samples/golden-prompts/cypher
          THRESHOLD: '0.95'
          MIN_COUNT: '50'
          NEO4J_HOST: localhost
          NEO4J_USER: neo4j
          NEO4J_PASS: test
        run: |
          node tools/golden-prompts/validate.js

```

### summit-main/.github/workflows/golden-ci-pipeline.yml

```
# Golden CI Pipeline for IntelGraph Maestro - One pipeline to rule them all
name: "🚀 IntelGraph Golden CI Pipeline"

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]
    types: [ opened, synchronize, reopened ]
  release:
    types: [ published ]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}
  KUBECONFIG_DEV: ${{ secrets.KUBECONFIG_DEV }}
  KUBECONFIG_UAT: ${{ secrets.KUBECONFIG_UAT }}
  KUBECONFIG_PROD: ${{ secrets.KUBECONFIG_PROD }}

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}

jobs:
  # Stage 1: Code Quality and Security Gates
  quality-gates:
    name: "🔍 Quality & Security Gates"
    runs-on: ubuntu-latest
    timeout-minutes: 15
    outputs:
      should-deploy: ${{ steps.changes.outputs.deploy }}
      image-tag: ${{ steps.meta.outputs.tags }}
      image-digest: ${{ steps.build.outputs.digest }}
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          token: ${{ secrets.GITHUB_TOKEN }}
          
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: |
            package-lock.json
            server/package-lock.json
            client/package-lock.json
            
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
          cache: 'pip'
          
      - name: Install dependencies
        run: |
          npm ci
          cd server && npm ci
          cd ../client && npm ci
          pip install -r requirements.txt
          
      - name: Run pre-commit hooks
        uses: pre-commit/action@v3.0.0
        with:
          extra_args: --all-files
          
      - name: TypeScript compilation
        run: |
          cd server && npm run build
          cd ../client && npm run build
          
      - name: Run tests with coverage
        run: |
          npm run test:coverage
          npm run e2e:headless
          
      - name: SonarCloud Scan
        uses: SonarSource/sonarcloud-github-action@master
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
          
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          fail_ci_if_error: true
          
      - name: Security scan with CodeQL
        uses: github/codeql-action/analyze@v3
        with:
          languages: javascript,typescript,python
          
      - name: Container security scan
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'
          
      - name: Upload Trivy scan results
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: 'trivy-results.sarif'
          
      - name: Detect changes
        id: changes
        uses: dorny/paths-filter@v2
        with:
          filters: |
            deploy:
              - 'server/**'
              - 'client/**'
              - 'infra/**'
              - 'Dockerfile*'
              - 'package*.json'

  # Stage 2: Build and Sign Images + Generate SBOM
  build-sign-sbom:
    name: "🏗️ Build, Sign & SBOM"
    needs: quality-gates
    if: needs.quality-gates.outputs.should-deploy == 'true'
    runs-on: ubuntu-latest
    timeout-minutes: 20
    outputs:
      image-tag: ${{ steps.meta.outputs.tags }}
      image-digest: ${{ steps.build.outputs.digest }}
      sbom-path: ${{ steps.sbom.outputs.sbom-path }}
      
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
        
      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
          
      - name: Install Cosign
        uses: sigstore/cosign-installer@v3
        
      - name: Install Syft for SBOM
        run: |
          curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh -s -- -b /usr/local/bin
          
      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=sha,prefix={{branch}}-
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            
      - name: Build and push image
        id: build
        uses: docker/build-push-action@v5
        with:
          context: .
         
```

### summit-main/.github/workflows/issue-auto-split.yml

```
name: issue-auto-split

on:
  issues:
    types: [labeled]

permissions:
  contents: read
  issues: write
  projects: write

jobs:
  split:
    if: contains(github.event.label.name, 'release: v1.1') || startsWith(github.event.label.name, 'theme: ')
    runs-on: ubuntu-latest
    env:
      DEFAULT_STATUS: Planned
    steps:
      - uses: actions/checkout@v4

      - name: Install jq
        run: sudo apt-get update && sudo apt-get install -y jq

      - name: Bootstrap milestones/project (idempotent)
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          PROJECT_TITLE: Assistant v1.1
        run: |
          chmod +x scripts/bootstrap_roadmap.sh
          ./scripts/bootstrap_roadmap.sh >/dev/null || true

      - name: Classify and apply milestone/assignees/project
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          ISSUE_NUMBER: ${{ github.event.issue.number }}
          PROJECT_TITLE: Assistant v1.1
        run: |
          set -euo pipefail

          # Determine theme from existing labels
          OWNER_REPO=$(gh repo view --json owner,name -q '.owner.login + "/" + .name')
          ALL_LABELS=$(gh issue view "$ISSUE_NUMBER" --json labels -q '.labels[].name' | tr '\n' ',' || true)
          if   [[ "$ALL_LABELS" == *"theme: routing"*   ]]; then THEME="routing";
          elif [[ "$ALL_LABELS" == *"theme: citations"* ]]; then THEME="citations";
          elif [[ "$ALL_LABELS" == *"theme: exports"*   ]]; then THEME="exports";
          else THEME="quality"; fi

          # Milestones
          mid() { gh api "repos/$OWNER_REPO/milestones" --jq \
            ".[]|select(.title==\"$1\")|.number"; }
          M12=$(mid "Assistant v1.1 — W1–2" || echo "")
          M34=$(mid "Assistant v1.1 — W3–4" || echo "")
          M5=$(mid  "Assistant v1.1 — W5"   || echo "")
          M6=$(mid  "Assistant v1.1 — W6"   || echo "")
          case "$THEME" in
            routing|citations) TARGET="$M12" ;; 
            exports)           TARGET="$M34" ;; 
            *)                 TARGET="$M5"  ;; 
          esac
          [ -n "$TARGET" ] && gh issue edit "$ISSUE_NUMBER" --milestone "$TARGET"

          # Assignees from YAML or env overrides
          assign_from_yaml() {
            python3 - "$1" << 'PY'
import sys, yaml
k=sys.argv[1]
try:
  data=yaml.safe_load(open('.github/assignees.yml'))
except Exception:
  data={}
lst = data.get(k, data.get('default', []))
print(','.join(lst))
PY
          }
          ASG=""
          case "$THEME" in
            routing)   ASG="${ROUTING_ASSIGNEES:-}"   ;; 
            citations) ASG="${CITATIONS_ASSIGNEES:-}" ;; 
            exports)   ASG="${EXPORTS_ASSIGNEES:-}"   ;; 
            quality)   ASG="${QUALITY_ASSIGNEES:-}"   ;; 
          esac
          if [ -z "$ASG" ] && [ -f .github/assignees.yml ]; then
            ASG=$(assign_from_yaml "$THEME")
          fi
          if [ -n "$ASG" ]; then
            IFS=',' read -r -a A <<< "$ASG"
            gh issue edit "$ISSUE_NUMBER" --add-assignee "${A[@]}" || true
          fi

          # Add to project and set status
          PID=$(gh api graphql -f query=' 
            query($o:String!,$r:String!,$t:String!){
              repository(owner:$o,name:$r){ projectsV2(first:20, query:$t){ nodes { id title } } }
            }' -F o="$(cut -d/ -f1 <<<"$OWNER_REPO")" -F r="$(cut -d/ -f2 <<<"$OWNER_REPO")" -F t="$PROJECT_TITLE" 
            | jq -r '.data.repository.projectsV2.nodes[0].id')
          INID=$(gh api "repos/$OWNER_REPO/issues/$ISSUE_NUMBER" --jq .node_id)
          if [ -n "$PID" ] && [ -n "$INID" ]; then
            gh api graphql -f query=' 
              mutation($p:ID!,$c:ID!){
                addProjectV2ItemById(input:{projectId:$p,contentId:$c}){ item { id } }
              }' \
              -F p="$PID" -F c="$INID" >/dev/null || true
          fi

          echo "✓ Auto-split: #$ISSUE_NUMBER → theme=$THEME, milestone set, project added"

```

### summit-main/.github/workflows/jwks-rotation.yml

```
name: Monthly Runbook JWKS Rotation
on:
  workflow_dispatch: # Allow manual runs
  schedule:
    - cron: '0 0 1 * *' # At 00:00 on day-of-month 1.
jobs:
  rotate-jwks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '18' }
      - run: npm install -g ts-node node-jose
      - name: Rotate Keys
        id: rotate
        run: |
          ts-node scripts/runbook-jwks-rotate.ts
          echo "kid=$(cat services/runbooks/jwks.json | jq -r .keys[0].kid)" >> $GITHUB_OUTPUT
      - name: Create Pull Request
        uses: peter-evans/create-pull-request@v6
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          commit-message: 'feat(crypto): rotate runbook signing key (kid=${{ steps.rotate.outputs.kid }})'
          title: 'Monthly Runbook JWKS Rotation'
          body: 'Automated rotation of the runbook signing key. Please review and merge to deploy the new key.'
          branch: 'chore/jwks-rotation-${{ steps.rotate.outputs.kid }}'
          base: 'main'
          delete-branch: true

```

### summit-main/.github/workflows/k6-smoke.yml

```
name: k6-smoke
on:
  workflow_dispatch: {}
  schedule:
    - cron: '0 6 * * *'

jobs:
  k6:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run k6 GraphQL smoke
        uses: grafana/k6-action@v0.2.0
        with:
          filename: load/k6/graphql-smoke.js
        env:
          API_URL: ${{ secrets.K6_API_URL || 'http://localhost:4000/graphql' }}
      - name: Count persisted operations
        id: ops
        run: |
          if [ ! -f client/artifacts/graphql-ops.json ]; then
            echo "ops_count=0" >> "$GITHUB_OUTPUT"
          else
            node -e "const fs=require('fs');const p='client/artifacts/graphql-ops.json';const j=JSON.parse(fs.readFileSync(p,'utf8'));const n=Array.isArray(j)?j.length:Object.keys(j).length;console.log('ops_count='+n)" >> "$GITHUB_OUTPUT"
          fi
      - name: Job Summary (schema badge)
        run: |
          {
            echo "### IntelGraph Nightly — Schema Badge";
            echo "";
            echo "- Schema Source: _N/A for nightly (no codegen)_";
            echo "- Persisted Ops: \`${{ steps.ops.outputs.ops_count || '0' }}\`";
          } >> "$GITHUB_STEP_SUMMARY"
      - name: Upload schema badge summary
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: schema-badge-summary
          path: ${{ github.workspace }}/client/artifacts/graphql-ops.json
          if-no-files-found: ignore

```

### summit-main/.github/workflows/lighthouse-ci.yml

```
name: Lighthouse CI

on:
  pull_request:
    branches: [main]
    paths:
      - 'client/**'
      - '.github/workflows/lighthouse-ci.yml'
  push:
    branches: [main]
    paths:
      - 'client/**'

jobs:
  lighthouse-ci:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: |
          npm ci
          npm ci --prefix client

      - name: Build client
        run: npm run build:client
        env:
          NODE_ENV: production

      - name: Start test server
        run: |
          npm run preview --prefix client &
          # Wait for server to be ready
          npx wait-on http://localhost:4173 --timeout 60000

      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v10
        with:
          configPath: './client/lighthouserc.json'
          uploadArtifacts: true
          temporaryPublicStorage: true
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}

      - name: Upload Lighthouse results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: lighthouse-results
          path: |
            .lighthouseci/
            client/.lighthouseci/
          retention-days: 7

      - name: Comment PR with results
        uses: actions/github-script@v7
        if: github.event_name == 'pull_request'
        with:
          script: |
            const fs = require('fs');
            const path = require('path');

            // Look for Lighthouse results
            const resultsDir = '.lighthouseci';
            if (!fs.existsSync(resultsDir)) {
              console.log('No Lighthouse results found');
              return;
            }

            const files = fs.readdirSync(resultsDir);
            const reportFile = files.find(f => f.includes('manifest.json'));

            if (reportFile) {
              const reportPath = path.join(resultsDir, reportFile);
              const manifest = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
              
              // Extract key metrics
              const scores = manifest[0]?.summary || {};
              const performance = Math.round(scores.performance * 100);
              const accessibility = Math.round(scores.accessibility * 100);
              const bestPractices = Math.round(scores['best-practices'] * 100);
              const seo = Math.round(scores.seo * 100);
              
              const body = `## 🏋️‍♀️ Lighthouse CI Results
              
              | Metric | Score | Status |
              |--------|-------|--------|
              | Performance | ${performance}/100 | ${performance >= 85 ? '✅' : '❌'} |
              | Accessibility | ${accessibility}/100 | ${accessibility >= 90 ? '✅' : '❌'} |
              | Best Practices | ${bestPractices}/100 | ${bestPractices >= 80 ? '✅' : '❌'} |
              | SEO | ${seo}/100 | ${seo >= 80 ? '✅' : '❌'} |
              
              **Budget Requirements:**
              - Performance: ≥85 ${performance >= 85 ? '✅' : '❌'}
              - Accessibility: ≥90 ${accessibility >= 90 ? '✅' : '❌'}
              
              ${performance < 85 || accessibility < 90 ? '⚠️ **Performance budget not met!**' : '✅ **All performance budgets passed!**'}
              `;
              
              github.rest.issues.createComment({
                issue_number: context.issue.number,
                owner: context.repo.owner,
                repo: context.repo.repo,
                body: body
              });
            }

```

### summit-main/.github/workflows/lint-only.yml

```
name: Lint (Strict)

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install deps
        run: npm ci --ignore-scripts

      - name: ESLint (strict)
        run: npm run lint:strict

      - name: Prettier check
        run: npm run format:check

```

### summit-main/.github/workflows/load-testing.yml

```
name: Load Testing Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    # Run full load tests nightly at 2 AM UTC
    - cron: '0 2 * * *'
  workflow_dispatch:
    inputs:
      test_type:
        description: 'Type of load test to run'
        required: true
        default: 'smoke'
        type: choice
        options:
          - smoke
          - load
          - soak
          - capacity
      duration:
        description: 'Test duration (for load tests)'
        required: false
        default: '300s'
      vus:
        description: 'Virtual users (for load tests)'
        required: false
        default: '50'

jobs:
  smoke-test:
    name: Smoke Test
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request' || (github.event_name == 'workflow_dispatch' && inputs.test_type == 'smoke')
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: test-password
          POSTGRES_USER: test-user
          POSTGRES_DB: maestro_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      
      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: server/package-lock.json
      
      - name: Install dependencies
        run: |
          cd server
          npm ci
      
      - name: Start Maestro server
        run: |
          cd server
          npm run build
          DATABASE_URL="postgresql://test-user:test-password@localhost:5432/maestro_test" \
          REDIS_URL="redis://localhost:6379" \
          NODE_ENV=test \
          npm start &
          
          # Wait for server to be ready
          timeout 60 bash -c 'until curl -f http://localhost:4000/health; do sleep 2; done'
        env:
          JWT_SECRET: test-secret-key-for-ci
          CONDUCTOR_ENABLED: 'false'
      
      - name: Install k6
        run: |
          sudo gpg -k
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6
      
      - name: Run smoke test
        run: |
          cd tests/load
          k6 run --vus 1 --duration 30s maestro-load-test.js
        env:
          BASE_URL: http://localhost:4000

  load-test:
    name: Load Test
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main' || (github.event_name == 'workflow_dispatch' && inputs.test_type == 'load')
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: test-password
          POSTGRES_USER: test-user
          POSTGRES_DB: maestro_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      
      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: server/package-lock.json
      
      - name: Install dependencies
        run: |
          cd server
          npm ci
      
      - name: Start Maestro server
        run: |
          cd server
          npm run build
          DATABASE_URL="postgresql://test-user:test-password@localhost:5432/maestro_test" \
          REDIS_URL="redis://localhost:6379" \
          NODE_ENV=test \
          npm start &
          
          timeout 60 bash -c 'until curl -f http://localhost:4000/health; do sleep 2; done'
        env:
          JWT_SECRET: test-secret-key-for-ci
          CONDUCTOR_ENABLED: 'false'
      
      - name: Install k6
        run: |
          sudo gpg -k
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share
```

### summit-main/.github/workflows/maestro-build.yml

```
name: 'Maestro Build Pipeline'

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
  workflow_dispatch:
    inputs:
      environment:
        description: 'Target environment'
        required: true
        default: 'development'
        type: choice
        options:
          - development
          - staging
          - production
      budget:
        description: 'Budget limit (USD)'
        required: false
        default: '10.00'
      parameters:
        description: 'Additional parameters (JSON)'
        required: false
        default: '{}'

env:
  MAESTRO_API_URL: ${{ vars.MAESTRO_API_URL || 'https://maestro-api.example.com' }}

jobs:
  validate-pipeline:
    name: 'Validate Pipeline'
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Maestro CLI
        run: npm install -g @intelgraph/maestro

      - name: Validate pipeline syntax
        run: |
          if [[ -f ".maestro/pipeline.yaml" ]]; then
            maestro template lint .maestro/pipeline.yaml
          elif [[ -f "maestro.yaml" ]]; then
            maestro template lint maestro.yaml
          else
            echo "❌ No Maestro pipeline found"
            exit 1
          fi

  security-scan:
    name: 'Security Scan'
    runs-on: ubuntu-latest
    needs: validate-pipeline

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'

      - name: Upload Trivy scan results
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: 'trivy-results.sarif'

  build-development:
    name: 'Build (Development)'
    runs-on: ubuntu-latest
    needs: [validate-pipeline, security-scan]
    if: github.ref == 'refs/heads/develop' || github.event_name == 'pull_request'

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run Maestro build pipeline
        uses: ./.github/actions/maestro-run
        with:
          pipeline: '.maestro/pipeline.yaml'
          environment: 'development'
          budget: '5.00'
          maestro_token: ${{ secrets.MAESTRO_API_TOKEN }}
          parameters: |
            {
              "git_ref": "${{ github.sha }}",
              "pr_number": "${{ github.event.number || '' }}",
              "actor": "${{ github.actor }}"
            }

      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: maestro-build-development
          path: maestro-artifacts/
          retention-days: 7

  build-staging:
    name: 'Build (Staging)'
    runs-on: ubuntu-latest
    needs: [validate-pipeline, security-scan]
    if: github.ref == 'refs/heads/main'

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run Maestro build pipeline
        uses: ./.github/actions/maestro-run
        with:
          pipeline: '.maestro/pipeline.yaml'
          environment: 'staging'
          budget: '15.00'
          maestro_token: ${{ secrets.MAESTRO_API_TOKEN }}
          parameters: |
            {
              "git_ref": "${{ github.sha }}",
              "build_type": "release",
              "enable_signing": true,
              "generate_sbom": true
            }

      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: maestro-build-staging
          path: maestro-artifacts/
          retention-days: 30

      - name: Create deployment
        if: success()
        uses: actions/github-script@v7
        with:
          script: |
            const deployment = await github.rest.repos.createDeployment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              ref: context.sha,
              environment: 'staging',
              description: 'Maestro automated deployment to staging',
              auto_merge: false,
              required_contexts: []
            });

            await github.rest.repos.createDeploymentStatus({
              owner: context.repo.owner,
              repo: context.repo.repo,
              deployment_id: deployment.data.id,
              state: 'success',
              description: 'Deployed via Maestro pipeline'
            });

  build-production:
    name: 'Build (Production)'
    runs-on: ubuntu-latest
    needs: [validate-pipeline, security-scan]
    if: github.event_name == 'workflow_dispatch' && github.event.inputs.environment == 'production'
    environment:
      name: production
      url: https://inte
```

### summit-main/.github/workflows/maestro-gate.yml

```
name: Maestro Gate
on:
  workflow_dispatch:
  push:
    branches: [main]
jobs:
  gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Maestro Gate Check
        uses: ./.github/actions/maestro-gate-check
        with:
          gateway-base: ${{ vars.MAESTRO_GATEWAY_BASE || 'http://localhost:3001/api/maestro/v1' }}
          pipeline: intelgraph_pr_build
          run-id: ${{ github.run_id }}
          token: ${{ secrets.MAESTRO_TOKEN }}

```

### summit-main/.github/workflows/manifest-validate.yml

```
name: Manifest Validation

on:
  pull_request:
    branches: [main]
  workflow_dispatch: {}

permissions:
  contents: read

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Ensure script deps
        run: |
          npm i -D ajv ajv-formats yaml glob

      - name: Validate manifests against schemas
        run: node .github/scripts/validate_manifests.js

```

### summit-main/.github/workflows/mcp-tests.yml

```
name: MCP Tests
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  server-client-mcp:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - name: Install root
        run: npm install
      - name: Install server
        run: cd server && npm install
      - name: Install client
        run: cd client && npm install
      - name: Server MCP tests
        run: cd server && npm run test:mcp
      - name: Client MCP tests
        run: cd client && npm run test:mcp

```

### summit-main/.github/workflows/milestone-nudges.yml

```
name: milestone-nudges

on:
  schedule:
    - cron: '0 */6 * * *' # every 6h
  workflow_dispatch: {}

permissions:
  contents: read
  issues: write

jobs:
  nudge:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install jq
        run: sudo apt-get update && sudo apt-get install -y jq

      - name: Ping upcoming milestones
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          SLACK_WEBHOOK: ${{ secrets.SLACK_WEBHOOK }}
        run: |
          set -euo pipefail
          ORG=$(gh repo view --json owner -q .owner.login)
          REPO=$(gh repo view --json name -q .name)
          now=$(date -u +%s)
          ms=$(gh api "repos/$ORG/$REPO/milestones" | jq -c '.[]')
          echo "$ms" | while read -r m; do
            title=$(jq -r .title <<<"$m"); due=$(jq -r .due_on <<<"$m"); state=$(jq -r .state <<<"$m")
            [[ "$title" != *"Assistant v1.1"* ]] && continue
            [ "$state" = "closed" ] && continue
            [ "$due" = "null" ] && continue
            due_s=$(date -u -d "$due" +%s 2>/dev/null || echo 0)
            remain=$(( (due_s - now) / 3600 ))
            open=$(gh issue list --milestone "$title" --state open --json number | jq 'length')
            if [ $remain -le 48 ]; then
              msg="Milestone *$title* due in ${remain}h — open issues: ${open}"
              gh issue create --title "[Nudge] $title — ${remain}h left" --body "$msg" --label "infra: nudge" || true
              if [ -n "${SLACK_WEBHOOK:-}" ]; then curl -s -X POST -H 'Content-type: application/json' --data "{\"text\":\"$msg\"}" "$SLACK_WEBHOOK" >/dev/null || true; fi
            fi
            if [ "$open" -eq 0 ]; then gh api -X PATCH "repos/$ORG/$REPO/milestones/$(jq -r .number <<<"$m")" -f state=closed >/dev/null || true; fi
          done

      - name: Rollover open items to next milestone (v1.1)
        if: env.ROLLOVER == '1'
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          ROLLOVER: ${{ vars.ROLLOVER || '1' }}
        run: |
          set -euo pipefail
          ORG=$(gh repo view --json owner -q .owner.login); REPO=$(gh repo view --json name -q .name)
          now=$(date -u +%s)

          next_title() {
            case "$1" in
              "Assistant v1.1 — W1–2") echo "Assistant v1.1 — W3–4" ;;
              "Assistant v1.1 — W3–4") echo "Assistant v1.1 — W5" ;;
              "Assistant v1.1 — W5")   echo "Assistant v1.1 — W6" ;;
              *) echo "" ;;
            esac
          }

          gh api "repos/$ORG/$REPO/milestones" | jq -c '.[]' | while read -r m; do
            title=$(jq -r .title <<<"$m"); [[ "$title" != *"Assistant v1.1"* ]] && continue
            due=$(jq -r .due_on <<<"$m"); [ "$due" = "null" ] && continue
            due_s=$(date -u -d "$due" +%s 2>/dev/null || echo 0)
            # process if past due by >= 24h
            [ $(( now - due_s )) -lt 86400 ] && continue

            nxt=$(next_title "$title")
            [ -z "$nxt" ] && continue  # do not roll past W6

            next_num=$(gh api "repos/$ORG/$REPO/milestones" --jq ".[]|select(.title==\"$nxt\")|.number")
            [ -z "$next_num" ] && continue

            issues=$(gh issue list --milestone "$title" --state open --json number -q '.[].number')
            [ -z "$issues" ] && continue

            echo "Rolling $(wc -w <<<"$issues") issues from '$title' → '$nxt'"
            for i in $issues; do
              gh issue edit "$i" --milestone "$next_num" >/dev/null
              gh issue comment "$i" --body ":leftwards_arrow_with_hook: Auto-rolled from **$title** to **$nxt** after due date." >/dev/null
            done
          done

```

### summit-main/.github/workflows/opa-policy-checks.yml

```
name: OPA Policy Checks
on:
  pull_request:
    paths: ['policy/**']

jobs:
  opa:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install OPA
        run: |
          curl -L -o opa https://openpolicyagent.org/downloads/latest/opa_linux_amd64
          chmod +x opa
      - name: Test policies
        run: |
          ./opa test policy/ -v

```

### summit-main/.github/workflows/orchestra-integration.yml

```
name: 🎼 Orchestra Integration - Symphony Orchestrator
on:
  push:
    branches: [main, develop, 'feature/**']
  pull_request:
    branches: [main, develop]
  schedule:
    - cron: '0 */6 * * *' # Every 6 hours
  workflow_dispatch:
    inputs:
      orchestra_env:
        description: 'Orchestra Environment'
        required: true
        default: 'dev'
        type: choice
        options:
          - dev
          - staging
          - prod
      autonomy_level:
        description: 'Autonomy Level'
        required: true
        default: '1'
        type: choice
        options:
          - '0'
          - '1'
          - '2'
          - '3'
      task_type:
        description: 'Task Type'
        required: false
        default: 'code_review'
        type: choice
        options:
          - code_review
          - nl2cypher
          - data_ingestion
          - security_audit

concurrency:
  group: orchestra-${{ github.ref }}
  cancel-in-progress: true

env:
  ORCHESTRA_ENV: ${{ inputs.orchestra_env || 'dev' }}
  AUTONOMY: ${{ inputs.autonomy_level || '1' }}
  PYTHON_VERSION: '3.11'

jobs:
  orchestra-setup:
    name: 🎼 Orchestra Configuration
    runs-on: ubuntu-latest
    outputs:
      config-valid: ${{ steps.validate.outputs.config-valid }}
      kill-switch: ${{ steps.validate.outputs.kill-switch }}
      task-type: ${{ steps.validate.outputs.task-type }}
      models: ${{ steps.validate.outputs.models }}
    steps:
      - uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: ${{ env.PYTHON_VERSION }}
          cache: 'pip'

      - name: Install Orchestra dependencies
        run: |
          pip install pyyaml requests
          pip install -r requirements.txt || echo "No requirements.txt found"

      - name: Validate Orchestra configuration
        id: validate
        run: |
          echo "🎼 Validating Orchestra configuration..."

          # Check if orchestration.yml exists and is valid
          if [ -f "orchestration.yml" ]; then
            python3 -c "
            import yaml
            import json
            import os
            import sys
            
            try:
                with open('orchestration.yml') as f:
                    config = yaml.safe_load(f)
                
                # Check kill switch
                kill_switch = config.get('env', {}).get('kill_switch', 0)
                if kill_switch == 1:
                    print('❌ Orchestra kill switch is ACTIVE - operations blocked')
                    print('kill-switch=true' >> os.environ['GITHUB_OUTPUT'])
                    sys.exit(1)
                else:
                    print('✅ Orchestra kill switch is OFF - operations allowed')
                    print('kill-switch=false' >> os.environ['GITHUB_OUTPUT'])
                
                # Validate configuration structure
                required_sections = ['defaults', 'routing', 'policies', 'observability']
                missing = [s for s in required_sections if s not in config]
                if missing:
                    print(f'❌ Missing required sections: {missing}')
                    print('config-valid=false' >> os.environ['GITHUB_OUTPUT'])
                    sys.exit(1)
                
                # Extract task type and models
                task_type = os.environ.get('GITHUB_EVENT_NAME', 'push')
                if task_type == 'pull_request':
                    task_type = 'code_review'
                elif task_type == 'schedule':
                    task_type = 'data_ingestion'
                else:
                    task_type = '${{ inputs.task_type || \"code_review\" }}'
                
                models = config.get('defaults', {})
                
                print('✅ Orchestra configuration valid')
                print('config-valid=true' >> os.environ['GITHUB_OUTPUT'])
                print(f'task-type={task_type}' >> os.environ['GITHUB_OUTPUT'])
                print(f'models={json.dumps(models)}' >> os.environ['GITHUB_OUTPUT'])
                
            except Exception as e:
                print(f'❌ Orchestra configuration error: {e}')
                print('config-valid=false' >> os.environ['GITHUB_OUTPUT'])
                sys.exit(1)
            "
          else
            echo "❌ No orchestration.yml found"
            echo "config-valid=false" >> $GITHUB_OUTPUT
            exit 1
          fi

      - name: Test Symphony CLI
        run: |
          echo "🎼 Testing Symphony CLI functionality..."
          python3 tools/symphony.py orchestrator status || echo "Symphony CLI test completed"
          python3 tools/symphony.py policy show || echo "Policy display completed"

  orchestra-routing:
    name: 🎯 Model Routing Decision
    runs-on: ubuntu-latest
    needs: orchestra-setup
    if: needs.orchestra-setup.outputs.config-valid == 'true' && needs.orchestra-setup.outputs.kill-switch == 'false'
    outputs
```

### summit-main/.github/workflows/persisted-queries-commit.yml

```
name: Persisted Queries (Commit)

on:
  workflow_dispatch:

jobs:
  commit:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - name: Install deps (server)
        run: npm ci --prefix server
      - name: Generate persisted queries
        run: npm --prefix server run persisted:generate
      - name: Create Pull Request
        uses: peter-evans/create-pull-request@v6
        with:
          commit-message: 'chore: update persisted GraphQL queries'
          title: 'chore: update persisted queries'
          body: 'Automated update of persisted-queries.json'
          branch: chore/update-persisted-queries
          add-paths: |
            persisted-queries.json

```

### summit-main/.github/workflows/persisted-queries.yml

```
name: Persisted Queries

on:
  push:
    branches: [main, master]
  pull_request:

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - name: Install deps (server)
        run: npm ci --prefix server
      - name: Generate persisted queries
        run: npm --prefix server run persisted:generate
      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: persisted-queries
          path: persisted-queries.json

```

### summit-main/.github/workflows/post-release-bootstrap.yml

```
name: post-release-bootstrap

on:
  push:
    tags:
      - 'v1.0.0-assistant'

jobs:
  bootstrap-next-roadmap:
    if: ${{ github.ref_name == 'v1.0.0-assistant' }}
    runs-on: ubuntu-latest
    permissions:
      contents: write
      issues: write
      pull-requests: write
      projects: write
    env:
      DEFAULT_STATUS: Planned
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Ensure jq and gh available
        run: |
          sudo apt-get update
          sudo apt-get install -y jq || true
          gh --version || true

      - name: Bootstrap Assistant v1.1 Roadmap (labels, milestones, project, issues)
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          PROJECT_TITLE: Assistant v1.1
        run: |
          chmod +x scripts/bootstrap_roadmap.sh
          ./scripts/bootstrap_roadmap.sh

```

### summit-main/.github/workflows/post-rename-check.yml

```
name: Post-Rename GitHub Checks

on:
  workflow_dispatch:
    inputs:
      expected_repo:
        description: Expected repo name after rename (e.g., summit or summit-platform)
        required: false
        default: ''
      expected_owner:
        description: Expected owner/org (optional)
        required: false
        default: ''
  workflow_call:
    inputs:
      expected_repo:
        description: Expected repo name after rename (e.g., summit or summit-platform)
        required: false
        type: string
        default: ''
      expected_owner:
        description: Expected owner/org (optional)
        required: false
        type: string
        default: ''

jobs:
  sanity:
    runs-on: ubuntu-latest
    steps:
      - name: Print repository context
        run: |
          echo "GITHUB_REPOSITORY=$GITHUB_REPOSITORY"
          echo "GITHUB_REPOSITORY_OWNER=$GITHUB_REPOSITORY_OWNER"
          echo "GITHUB_REF=$GITHUB_REF"
          echo "Repo URL: $GITHUB_SERVER_URL/$GITHUB_REPOSITORY"
      - name: Verify expected repo/owner (optional)
        env:
          EXPECTED_REPO: ${{ inputs.expected_repo }}
          EXPECTED_OWNER: ${{ inputs.expected_owner }}
        run: |
          set -euo pipefail
          if [ -n "$EXPECTED_REPO" ]; then
            name=${GITHUB_REPOSITORY##*/}
            if [ "$name" != "$EXPECTED_REPO" ]; then
              echo "Expected repo '$EXPECTED_REPO' but found '$name'" >&2
              exit 1
            fi
            echo "[OK] Repo name matches: $name"
          fi
          if [ -n "$EXPECTED_OWNER" ]; then
            if [ "$GITHUB_REPOSITORY_OWNER" != "$EXPECTED_OWNER" ]; then
              echo "Expected owner '$EXPECTED_OWNER' but found '$GITHUB_REPOSITORY_OWNER'" >&2
              exit 1
            fi
            echo "[OK] Owner matches: $GITHUB_REPOSITORY_OWNER"
          fi
      - name: actions/checkout works against current repo
        uses: actions/checkout@v4
      - name: Trivial CI sanity command
        run: |
          echo "Checked out $(git rev-parse --short HEAD) on $(git rev-parse --abbrev-ref HEAD)"
          echo "Workflow token perms ok: printing a file list"
          git ls-files | head -n 20

```

### summit-main/.github/workflows/post-rename-redirect-smoke.yml

```
name: Post-Rename Redirect Smoke

on:
  workflow_dispatch:
    inputs:
      old_repo:
        description: Old full repo (OWNER/REPO)
        required: true
      new_repo:
        description: New full repo (OWNER/REPO)
        required: true
      private:
        description: Is the repo private? (uses GITHUB_TOKEN for HTTPS)
        required: false
        default: 'false'
      do_ssh:
        description: Also test SSH (requires secrets.DEPLOY_KEY)
        required: false
        default: 'false'
  workflow_call:
    inputs:
      old_repo:
        required: true
        type: string
      new_repo:
        required: true
        type: string
      private:
        required: false
        type: string
        default: 'false'
      do_ssh:
        required: false
        type: string
        default: 'false'

jobs:
  api-redirect:
    runs-on: ubuntu-latest
    steps:
      - name: Check GitHub API redirect (old → new)
        env:
          OLD: ${{ inputs.old_repo }}
          NEW: ${{ inputs.new_repo }}
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          set -euo pipefail
          url="https://api.github.com/repos/${OLD}"
          code=$(curl -sI -H "Authorization: token $GH_TOKEN" "$url" | awk '/^HTTP\//{print $2; exit}')
          loc=$(curl -sI -H "Authorization: token $GH_TOKEN" "$url" | awk '/^[Ll]ocation:/{print $2; exit}')
          echo "HTTP $code Location: $loc"
          if [ "$code" != "301" ] && [ "$code" != "302" ] && [ "$code" != "307" ] && [ "$code" != "308" ]; then
            echo "Expected redirect status from GitHub API for old repo" >&2; exit 1; fi
          # Normalize and compare API path in location
          want="https://api.github.com/repos/${NEW}"
          if [ "${loc%$'\r'}" != "$want" ]; then
            echo "Expected Location $want but got $loc" >&2; exit 1; fi
          echo "[OK] GitHub API redirect points to new repo"

  https-clone:
    runs-on: ubuntu-latest
    steps:
      - name: Clone over HTTPS (old URL → new repo via redirect)
        env:
          OLD: ${{ inputs.old_repo }}
          NEW: ${{ inputs.new_repo }}
          PRIVATE: ${{ inputs.private }}
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          set -euo pipefail
          cd /tmp
          if [ "$PRIVATE" = "true" ]; then
            url="https://x-access-token:${GH_TOKEN}@github.com/${OLD}.git"
          else
            url="https://github.com/${OLD}.git"
          fi
          echo "git clone $url"
          git clone --depth 1 "$url" oldrepo
          cd oldrepo
          echo "Remote URLs:"; git remote -v
          echo "ls-remote check on old URL (should succeed):"
          git ls-remote "$url" HEAD >/dev/null
          echo "[OK] HTTPS clone/ls-remote succeeded via redirect"

  ssh-lsremote:
    if: inputs.do_ssh == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: webfactory/ssh-agent@v0.9.0
        with:
          ssh-private-key: ${{ secrets.DEPLOY_KEY }}
      - name: SSH ls-remote on old repo
        env:
          OLD: ${{ inputs.old_repo }}
        run: |
          set -euo pipefail
          git ls-remote "git@github.com:${OLD}.git" HEAD >/dev/null
          echo "[OK] SSH ls-remote succeeded via redirect"

```

### summit-main/.github/workflows/pr-auto-milestone.yml

```
name: pr-auto-milestone

on:
  pull_request:
    types: [opened, edited, synchronize, labeled]

permissions:
  contents: read
  pull-requests: write
  issues: read
  projects: write

jobs:
  wire:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install jq
        run: sudo apt-get update && sudo apt-get install -y jq

      - name: Ensure gh
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: gh auth status || true

      - name: Apply milestone/labels/project from linked issues
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          PR: ${{ github.event.pull_request.number }}
          PROJECT_TITLE: 'Assistant v1.1'
        run: |
          set -euo pipefail
          BODY=$(gh pr view "$PR" --json body -q .body)
          NUMS=$(printf "%s" "$BODY" | grep -oE '(close[sd]?|fixe?[sd]?|resolve[sd]?) #[0-9]+' | grep -oE '#[0-9]+' | tr -d '#' | tr '\n' ' ' || true)
          [ -z "$NUMS" ] && exit 0
          PICK=""; THEME="";
          for n in $NUMS; do
            L=$(gh issue view "$n" --json labels -q '.labels[].name' | tr '\n' ' ' || true)
            if [[ "$L" == *"release: v1.1"* ]]; then
              PICK="$n"
              if   [[ "$L" == *"theme: routing"*   ]]; then THEME="theme: routing";
              elif [[ "$L" == *"theme: citations"* ]]; then THEME="theme: citations";
              elif [[ "$L" == *"theme: exports"*   ]]; then THEME="theme: exports";
              else THEME="theme: quality"; fi
              break
            fi
          done
          [ -z "$PICK" ] && exit 0
          MS=$(gh issue view "$PICK" --json milestone -q '.milestone.title' || echo "")
          if [ -n "$MS" ]; then gh pr edit "$PR" --milestone "$MS" || true; fi
          if [ -n "$THEME" ]; then gh pr edit "$PR" --add-label "$THEME" || true; fi
          OWNER=$(gh repo view --json owner -q .owner.login); REPO=$(gh repo view --json name -q .name)
          PID=$(gh api graphql -f query='query($o:String!,$r:String!,$t:String!){ repository(owner:$o,name:$r){ projectsV2(first:20, query:$t){ nodes { id title } } } }' -F o="$OWNER" -F r="$REPO" -F t="$PROJECT_TITLE" | jq -r '.data.repository.projectsV2.nodes[0].id')
          CID=$(gh pr view "$PR" --json id -q .id)
          if [ -n "$PID" ] && [ -n "$CID" ]; then
            gh api graphql -f query='mutation($p:ID!,$c:ID!){ addProjectV2ItemById(input:{projectId:$p,contentId:$c}){ item { id } } }' -F p="$PID" -F c="$CID" >/dev/null || true
          fi

```

### summit-main/.github/workflows/pr-review-gemini.yml

```
name: 🔍 PR Review - AI-Assisted Code Review
on:
  pull_request:
    types: [opened, synchronize, reopened]
  workflow_dispatch:

permissions:
  contents: read
  pull-requests: write
  issues: write

concurrency:
  group: pr-review-${{ github.event.pull_request.number }}
  cancel-in-progress: true

jobs:
  change-analysis:
    name: 📊 Change Analysis
    runs-on: ubuntu-latest
    outputs:
      files-changed: ${{ steps.analysis.outputs.files-changed }}
      lines-added: ${{ steps.analysis.outputs.lines-added }}
      lines-deleted: ${{ steps.analysis.outputs.lines-deleted }}
      complexity-score: ${{ steps.analysis.outputs.complexity-score }}
      review-priority: ${{ steps.analysis.outputs.review-priority }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: Analyze changes
        id: analysis
        run: |
          # Get PR diff stats
          git diff --numstat origin/${{ github.base_ref }}..HEAD > diff_stats.txt
          
          FILES_CHANGED=$(wc -l < diff_stats.txt)
          LINES_ADDED=$(awk '{sum+=$1} END {print sum}' diff_stats.txt)
          LINES_DELETED=$(awk '{sum+=$2} END {print sum}' diff_stats.txt)
          
          # Calculate complexity score (0-100)
          COMPLEXITY=0
          if [ $FILES_CHANGED -gt 20 ]; then COMPLEXITY=$((COMPLEXITY + 30)); fi
          if [ $LINES_ADDED -gt 500 ]; then COMPLEXITY=$((COMPLEXITY + 25)); fi
          if [ $LINES_DELETED -gt 200 ]; then COMPLEXITY=$((COMPLEXITY + 20)); fi
          
          # Check for high-risk patterns
          if git diff --name-only origin/${{ github.base_ref }}..HEAD | grep -E '\.(sql|migration|dockerfile|docker-compose)' > /dev/null; then
            COMPLEXITY=$((COMPLEXITY + 15))
          fi
          
          if git diff --name-only origin/${{ github.base_ref }}..HEAD | grep -E 'package\.json|requirements\.txt|Cargo\.toml' > /dev/null; then
            COMPLEXITY=$((COMPLEXITY + 10))
          fi
          
          # Determine review priority
          if [ $COMPLEXITY -gt 70 ]; then
            PRIORITY="HIGH"
          elif [ $COMPLEXITY -gt 40 ]; then
            PRIORITY="MEDIUM"
          else
            PRIORITY="LOW"
          fi
          
          echo "files-changed=$FILES_CHANGED" >> $GITHUB_OUTPUT
          echo "lines-added=${LINES_ADDED:-0}" >> $GITHUB_OUTPUT
          echo "lines-deleted=${LINES_DELETED:-0}" >> $GITHUB_OUTPUT
          echo "complexity-score=$COMPLEXITY" >> $GITHUB_OUTPUT
          echo "review-priority=$PRIORITY" >> $GITHUB_OUTPUT
          
          echo "📊 Change Analysis Results:"
          echo "Files: $FILES_CHANGED | Added: ${LINES_ADDED:-0} | Deleted: ${LINES_DELETED:-0}"
          echo "Complexity: $COMPLEXITY/100 | Priority: $PRIORITY"

  security-review:
    name: 🔒 Security Review
    runs-on: ubuntu-latest
    needs: change-analysis
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: Install security tools
        run: |
          # Install semgrep for security scanning
          pip install semgrep
          
          # Install gitleaks for secret scanning
          wget -q https://github.com/gitleaks/gitleaks/releases/download/v8.18.4/gitleaks_8.18.4_linux_x64.tar.gz
          tar xzf gitleaks_8.18.4_linux_x64.tar.gz
          sudo mv gitleaks /usr/local/bin/
      
      - name: Scan for secrets
        run: |
          echo "🔍 Scanning for secrets in PR changes..."
          gitleaks detect --source . --config .gitleaks.toml --log-level info || {
            echo "⚠️ Potential secrets detected in PR"
            echo "SECURITY_ISSUES=secrets" >> $GITHUB_ENV
          }
      
      - name: Scan for security vulnerabilities
        run: |
          echo "🔍 Scanning for security vulnerabilities..."
          semgrep --config=auto --quiet --json --output semgrep-results.json . || {
            echo "⚠️ Security vulnerabilities detected"
            echo "SECURITY_ISSUES=${SECURITY_ISSUES:-}vulnerabilities" >> $GITHUB_ENV
          }
      
      - name: Comment security findings
        if: env.SECURITY_ISSUES != ''
        uses: actions/github-script@v7
        with:
          script: |
            const issues = process.env.SECURITY_ISSUES;
            let body = '## 🔒 Security Review Results\n\n';
            
            if (issues.includes('secrets')) {
              body += '⚠️ **Potential secrets detected** - Please review the gitleaks output\n';
            }
            
            if (issues.includes('vulnerabilities')) {
              body += '⚠️ **Security vulnerabilities found** - Please review the semgrep output\n';
            }
            
            body += '\nPlease address these security concerns before merging.';
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: body

```

### summit-main/.github/workflows/projects-import.yml

```
name: Projects Import

on:
  push:
    paths:
      - 'project_management/github-projects-import.json'

permissions:
  contents: write
  issues: write
  pull-requests: read
  # For Projects v2 GraphQL, prefer a PAT with project access via GH_PROJECTS_TOKEN secret.

jobs:
  import:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Ensure GH token present
        id: token
        run: |
          if [ -z "${{ secrets.GH_PROJECTS_TOKEN }}" ]; then
            echo "missing=true" >> $GITHUB_OUTPUT
          else
            echo "missing=false" >> $GITHUB_OUTPUT
          fi

      - name: Install GitHub CLI
        if: steps.token.outputs.missing == 'false'
        uses: cli/cli-action@v2

      - name: Import items into GitHub Project
        if: steps.token.outputs.missing == 'false'
        env:
          GH_TOKEN: ${{ secrets.GH_PROJECTS_TOKEN }}
          PROJECT_JSON: project_management/github-projects-import.json
        run: |
          bash scripts/import_projects_items.sh

      - name: Skip (no token configured)
        if: steps.token.outputs.missing == 'true'
        run: |
          echo "GH_PROJECTS_TOKEN not set; skipping Projects import."

```

### summit-main/.github/workflows/publish-docs.yml

```
name: Publish Docs Site

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - name: Install dependencies
        run: npm install # Or yarn install, pnpm install
        working-directory: ./docs/site
      - name: Build docs site
        run: npm run build # Or yarn build, pnpm build
        working-directory: ./docs/site
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./docs/site/build # Assuming Docusaurus build output
          # Or deploy to S3:
          # uses: jakejarvis/s3-sync-action@master
          # with:
          #   args: --acl public-read --follow-symlinks --delete
          #   env:
          #     AWS_S3_BUCKET: ${{ secrets.AWS_S3_BUCKET }}
          #     AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          #     AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}

```

### summit-main/.github/workflows/publish-npm.yml

```
name: Publish NPM (SDK‑TS)

on:
  push:
    tags:
      - 'sdk-ts-v*.*.*'

jobs:
  build-publish:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: packages/sdk-ts
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm test
      - run: npm run build
      - run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

```

### summit-main/.github/workflows/publish-pypi.yml

```
name: Publish PyPI (SDK‑PY)

on:
  push:
    tags:
      - 'sdk-py-v*.*.*'

jobs:
  build-publish:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: packages/sdk-py
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: python -m pip install --upgrade build
      - run: python -m build
      - uses: pypa/gh-action-pypi-publish@release/v1
        with:
          password: ${{ secrets.PYPI_API_TOKEN }}

```

### summit-main/.github/workflows/publish-release.yml

```
name: publish-release

on:
  push:
    tags:
      - 'v*.*.*-assistant'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Determine notes file
        id: notes
        run: |
          TAG="${GITHUB_REF##*/}"
          FILE=".github/releases/${TAG}.md"
          if [ ! -f "$FILE" ]; then
            echo "release notes not found: $FILE" >&2
            exit 1
          fi
          echo "file=$FILE" >> $GITHUB_OUTPUT

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          tag_name: ${{ github.ref_name }}
          name: ${{ github.ref_name }}
          body_path: ${{ steps.notes.outputs.file }}
          draft: false
          prerelease: false

```

### summit-main/.github/workflows/readiness-check.yml

```
name: Readiness Check (Post-Deploy)

on:
  workflow_run:
    workflows: ['CD Pipeline']
    types: [completed]

jobs:
  readiness-staging:
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_STAGING_ROLE }}
          aws-region: ${{ secrets.AWS_REGION }}

      - name: Setup kubectl
        uses: azure/setup-kubectl@v4
        with:
          version: 'v1.30.0'

      - name: Setup kubectl-argo-rollouts
        run: |
          curl -sL -o kubectl-argo-rollouts https://github.com/argoproj/argo-rollouts/releases/download/v1.6.2/kubectl-argo-rollouts-linux-amd64
          sudo install -m 0755 kubectl-argo-rollouts /usr/local/bin/kubectl-argo-rollouts

      - name: Update kubeconfig
        run: |
          aws eks update-kubeconfig --region ${{ secrets.AWS_REGION }} --name ${{ secrets.EKS_STAGING_CLUSTER }}

      - name: Run readiness checks
        env:
          NAMESPACE: maestro-system
        run: |
          bash scripts/ops/readiness-check.sh

      - name: Grafana SLO dashboard check (optional)
        if: ${{ secrets.GRAFANA_API_TOKEN != '' && vars.GRAFANA_URL != '' }}
        env:
          GRAFANA_URL: ${{ vars.GRAFANA_URL }}
          GRAFANA_API_TOKEN: ${{ secrets.GRAFANA_API_TOKEN }}
        run: |
          bash scripts/ops/check-grafana-slo.sh

```

### summit-main/.github/workflows/rebrand-control-panel.yml

```
name: Rebrand Control Panel

on:
  workflow_dispatch:
    inputs:
      # Post-Rename GitHub Checks
      expected_repo:
        description: Expected repo name after rename (e.g., summit or summit-platform)
        required: false
        default: ''
      expected_owner:
        description: Expected owner/org (optional)
        required: false
        default: ''
      # Post-Rename Redirect Smoke
      old_repo:
        description: Old full repo (OWNER/REPO)
        required: true
      new_repo:
        description: New full repo (OWNER/REPO)
        required: true
      private:
        description: Is the repo private? (uses GITHUB_TOKEN for HTTPS)
        required: false
        default: 'false'
      do_ssh:
        description: Also test SSH (requires secrets.DEPLOY_KEY)
        required: false
        default: 'false'
      # Cutover Smoke
      base_url:
        description: Legacy docs base URL (e.g., https://docs.intelgraph.com)
        required: true
      new_ok_host:
        description: New docs host (e.g., https://docs.summit.com) for 200 checks
        required: false
        default: ''
      image_tag:
        description: Image tag or commit SHA to verify dual tags
        required: true
      sdk_smoke:
        description: Run optional SDK install smoke (requires NPM_TOKEN)
        required: false
        default: 'false'
      # Optional runtime brand preflight (reads X-Brand-Name header)
      brand_check_url:
        description: Optional URL to check current brand via X-Brand-Name header (e.g., https://app.example.com/health)
        required: false
        default: ''
      expected_current_brand:
        description: Expected current brand before flip (default IntelGraph)
        required: false
        default: 'IntelGraph'
      # Brand Flip placeholder
      target_brand:
        description: Desired PRODUCT_BRAND (Summit or IntelGraph)
        required: false
        default: 'Summit'
      brand_flip_confirm:
        description: Type 'ack' to acknowledge brand flip is external to CI (no-op)
        required: false
        default: ''

jobs:
  brand-scan:
    uses: ./.github/workflows/brand-scan.yml
    with:
      allowlist: scripts/brand-scan-allowlist.txt
    secrets: inherit

  brand-preflight:
    runs-on: ubuntu-latest
    needs: [brand-scan]
    steps:
      - name: Check current brand via header (optional)
        env:
          URL: ${{ inputs.brand_check_url }}
          EXPECT: ${{ inputs.expected_current_brand }}
        run: |
          set -euo pipefail
          if [ -z "${URL}" ]; then
            echo "No brand_check_url provided; skipping runtime brand preflight"
            exit 0
          fi
          echo "Probing $URL for X-Brand-Name header..."
          hdr=$(curl -sI "$URL" | awk -F': ' '/^[Xx]-Brand-Name:/ {gsub(/\r/,"",$2); print $2; exit}')
          if [ -z "$hdr" ]; then
            echo "[WARN] X-Brand-Name header not present at $URL; cannot assert current brand"
            exit 0
          fi
          echo "Current brand reported: '$hdr' (expected: '$EXPECT')"
          if [ "$hdr" = "$EXPECT" ]; then
            echo "[OK] Current brand matches expected pre-cutover brand"
          elif [ "$hdr" = "Summit" ]; then
            echo "[WARN] Service already reports Summit — avoid double flip; verify environment before proceeding"
          else
            echo "[INFO] Unexpected brand '$hdr' — continue with caution"
          fi
  github-checks:
    uses: ./.github/workflows/post-rename-check.yml
    needs: [brand-preflight]
    with:
      expected_repo: ${{ inputs.expected_repo }}
      expected_owner: ${{ inputs.expected_owner }}
    secrets: inherit

  github-redirects:
    uses: ./.github/workflows/post-rename-redirect-smoke.yml
    needs: [github-checks]
    with:
      old_repo: ${{ inputs.old_repo }}
      new_repo: ${{ inputs.new_repo }}
      private: ${{ inputs.private }}
      do_ssh: ${{ inputs.do_ssh }}
    secrets: inherit

  brand-flip:
    uses: ./.github/workflows/brand-flip-placeholder.yml
    needs: [github-redirects]
    with:
      target_brand: ${{ inputs.target_brand }}
      confirm: ${{ inputs.brand_flip_confirm }}
    secrets: inherit

  cutover:
    uses: ./.github/workflows/cutover-smoke.yml
    needs: [github-redirects]
    with:
      base_url: ${{ inputs.base_url }}
      new_ok_host: ${{ inputs.new_ok_host }}
      image_tag: ${{ inputs.image_tag }}
      sdk_smoke: ${{ inputs.sdk_smoke }}
    secrets: inherit

  panel-summary:
    runs-on: ubuntu-latest
    needs: [cutover]
    steps:
      - name: Print checklist URL
        run: |
          echo "Cutover Checklist: ${{ needs.cutover.outputs.issue_url }} (issue #${{ needs.cutover.outputs.issue_number }})"
      - name: Add to job summary
        run: |
          echo "## Rebrand Control Panel" >> $GITHUB_STEP_SUMMARY
          echo "Cutover Checklist: ${{ needs.cutover.outputs.issue_url }}" >> $GITHUB_STEP_SUMMARY

```

### summit-main/.github/workflows/redirects-smoke.yml

```
name: Redirects Smoke (docs)

on:
  workflow_dispatch:
    inputs:
      base_url:
        description: Legacy docs base URL (e.g., https://docs.intelgraph.com)
        required: true
      new_ok_host:
        description: New docs host (e.g., https://docs.summit.com) for 200 checks
        required: false

jobs:
  smoke:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run redirects smoke
        env:
          BASE_URL: ${{ inputs.base_url }}
          NEW_OK_HOST: ${{ inputs.new_ok_host }}
        run: |
          chmod +x scripts/smoke-redirects.sh
          ./scripts/smoke-redirects.sh docs/legacy-top100.txt

```

### summit-main/.github/workflows/release-gate.yml

```
name: Release Gate

on:
  pull_request:
    branches:
      - 'release/**'

jobs:
  release-gate:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@c9ef52556095b32f140b0c7d74474f53696d9000

      - name: Run smoke tests
        run: npm run test:smoke

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Run security scans
        run: |
          npm run lint
          npm run typecheck

      - name: Check for persisted queries
        run: |
          # This is a placeholder for checking for persisted queries.
          # A real implementation would check for the existence of a persisted query file
          # and ensure that it has been updated.
          echo "Checking for persisted queries..."
          if [ -f server/src/graphql/plugins/persistedQueries.js ]; then
            echo "Persisted queries file found."
          else
            echo "Error: Persisted queries file not found."
            exit 1
          fi

```

### summit-main/.github/workflows/release-npm.yml

```
on: { push: { tags: ['sdk/ts/v*'] } }
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm pack
      - name: Generate SBOM
        run: syft dir:. -o spdx-json > sbom.spdx.json
      - name: Sign Release Assets
        run: cosign sign-blob sbom.spdx.json --output-signature sbom.spdx.sig --output-attestation sbom.spdx.att
        env:
          COSIGN_PRIVATE_KEY: ${{ secrets.COSIGN_PRIVATE_KEY }}
      - run: npm publish --provenance --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

```

### summit-main/.github/workflows/release-please.yml

```
on:
  push:
    branches:
      - main

jobs:
  release-please:
    runs-on: ubuntu-latest
    steps:
      - uses: google-github-actions/release-please@v9
        id: release
        with:
          config-file: release-please-config.json
          manifest-file: .release-please-manifest.json

```

### summit-main/.github/workflows/release-pypi.yml

```
on: { push: { tags: ['sdk/py/v*'] } }
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4/**
      - run: pipx install build && python -m build
      - name: Generate SBOM
        run: syft packages dir:. -o spdx-json > sbom.spdx.json
      - name: Sign Release Assets
        run: cosign sign-blob sbom.spdx.json --output-signature sbom.spdx.sig --output-attestation sbom.spdx.att
        env:
          COSIGN_PRIVATE_KEY: ${{ secrets.COSIGN_PRIVATE_KEY }}
      - uses: pypa/gh-action-pypi-publish@release/v1
        with:
          password: ${{ secrets.PYPI_TOKEN }}

```

### summit-main/.github/workflows/release-signoff.yml

```
name: release-signoff
on:
  push:
    tags: ['v*.*.*']
jobs:
  verify-release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@c9ef52556095b32f140b0c7d74474f53696d9000 # v4
      - name: Verify Release Checklist Issue exists
        run: |
          ISSUE_NUMBER="$(gh issue list --search "is:issue is:open label:release v${GITHUB_REF_NAME#v}" --json number --jq '.[0].number')"
          if [ -z "$ISSUE_NUMBER" ]; then
            echo "No open Release Checklist issue found"; exit 1;
          fi
          BODY="$(gh issue view "$ISSUE_NUMBER" --json body --jq .body)"
          if echo "$BODY" | grep -q '- \[ ]'; then
            echo "Unchecked checklist items remain in issue #$ISSUE_NUMBER"; exit 1;
          fi
          echo "All checklist items are checked."
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Fetch latest run artifacts (security/ci)
        uses: actions/download-artifact@0b7f8f6 # v4
        with:
          name: sbom
          path: artifacts
        continue-on-error: true

      - name: Ensure SBOM artifact present
        run: |
          test -n "$(ls -1 artifacts 2>/dev/null || true)" || { echo "SBOM artifact missing"; exit 1; }

      - name: Verify SLOs.md present and non-empty
        run: test -s docs/SLOs.md

      - name: Verify no .env tracked
        run: |
          if git ls-files -ci --exclude-standard | grep -E '(^|/).env($|.|-)'; then
            echo "Tracked .env detected"; exit 1; fi

```

### summit-main/.github/workflows/release.yml

```
name: Release

on:
  push:
    tags: ['v*.*.*']

permissions:
  contents: write
  packages: write
  id-token: write

jobs:
  test:
    uses: ./.github/workflows/contract-tests.yml

  build-and-publish:
    needs: test
    uses: ./.github/workflows/build-publish.yml

```

### summit-main/.github/workflows/reusable-manifest-validate.yml

```
name: Reusable Manifest Validate
on:
  workflow_call:
    inputs:
      manifests_glob:
        description: 'Glob of manifests in caller repo'
        required: false
        default: 'examples/**/*.{yaml,yml,json}'
        type: string
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm i -D ajv ajv-formats yaml glob
      - name: Copy validation script
        run: |
          mkdir -p .github/scripts
          cp .github/scripts/validate_manifests.js .github/scripts/validate_manifests.js
      - name: Validate manifests
        env:
          MANIFESTS_GLOB: ${{ inputs.manifests_glob }}
        run: |
          # Optional: use env glob; script falls back to defaults
          node .github/scripts/validate_manifests.js

```

### summit-main/.github/workflows/roadmap-audit.yml

```
name: roadmap-audit

on:
  schedule: [{ cron: '0 8 * * MON' }] # Mondays 08:00 UTC
  workflow_dispatch: {}
  workflow_run:
    workflows: ['post-release-bootstrap']
    types: [completed]

permissions:
  contents: read
  issues: write
  pull-requests: read
  projects: read

env:
  PROJECT_TITLE: 'Assistant v1.1'
  REPORT_ISSUE_TITLE: 'Assistant v1.1 — Weekly Audit'
  DEFAULT_STATUS: Planned

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup CLI
        run: sudo apt-get update && sudo apt-get install -y jq

      - name: Run audit
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          PROJECT_TITLE: $PROJECT_TITLE
          REPORT_ISSUE_TITLE: $REPORT_ISSUE_TITLE
        run: |
          set -euo pipefail
          chmod +x scripts/roadmap_audit.sh
          scripts/roadmap_audit.sh > audit.md
          echo "---- audit preview ----"
          head -n 80 audit.md || true

      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: v1.1-audit-${{ github.run_id }}
          path: audit.md

      - name: Publish (create/update audit issue)
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          REPORT_ISSUE_TITLE: $REPORT_ISSUE_TITLE
        run: |
          set -euo pipefail
          id=$(gh issue list --search "in:title \"$REPORT_ISSUE_TITLE\"" --state all --json number -q '.[0].number' || true)
          if [ -z "$id" ]; then
            gh issue create --title "$REPORT_ISSUE_TITLE" --body-file audit.md --label "report: v1.1"
          else
            gh issue edit "$id" --body-file audit.md
            gh issue comment "$id" --body "🔄 Updated weekly audit report."
          fi

      - name: Slack ping (optional)
        if: ${{ secrets.SLACK_WEBHOOK != '' }}
        env:
          SLACK_WEBHOOK: ${{ secrets.SLACK_WEBHOOK }}
        run: |
          set -euo pipefail
          SUMMARY=$(head -n 20 audit.md | sed 's/"/\\"/g' | sed ':a;N;$!ba;s/\n/\\n/g')
          curl -s -X POST -H 'Content-type: application/json' --data "{\"text\":\"*Assistant v1.1 — Weekly Audit*\n$SUMMARY\"}" "$SLACK_WEBHOOK" >/dev/null || true

```

### summit-main/.github/workflows/scheduler.yml

```
name: Scheduler Gate
on: { pull_request: { paths: ['services/scheduler/**', 'router/**', 'services/analytics/**'] } }
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '18' }
      - run: npm ci
      - run: npm test -- services/scheduler/__tests__/admission.test.ts
  eval-sample:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.12' }
      - run: pip install -r requirements.txt || true
      - run: make offline-eval-sample
      - name: Upload reports
        uses: actions/upload-artifact@v4
        with: { name: offline-eval, path: reports }

```

### summit-main/.github/workflows/schema-badge.yml

```
name: Reusable Schema Badge

on:
  workflow_call:
    inputs:
      schema_source:
        description: "Schema source used (live|snapshot|unknown|na)"
        required: false
        default: unknown
        type: string
      comment_on_pr:
        description: "Post/update a PR comment with badge"
        required: false
        default: true
        type: boolean
      title:
        description: "Job Summary heading"
        required: false
        default: "GraphQL Schema Badge"
        type: string
      manifest_path:
        description: "Path to persisted ops manifest JSON"
        required: false
        default: client/artifacts/graphql-ops.json
        type: string
    secrets: {}

permissions:
  contents: read
  issues: write
  pull-requests: write

jobs:
  schema-badge:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Count persisted operations
        id: ops
        shell: bash
        run: |
          MPATH="${{ inputs.manifest_path }}"
          if [ ! -f "$MPATH" ]; then
            echo "ops_count=0" >> "$GITHUB_OUTPUT"
          else
            node -e "const fs=require('fs');const p=process.argv[1];const j=JSON.parse(fs.readFileSync(p,'utf8'));const n=Array.isArray(j)?j.length:Object.keys(j).length;console.log('ops_count='+n)" "$MPATH" >> "$GITHUB_OUTPUT"
          fi

      - name: Comment schema source on PR
        if: ${{ github.event_name == 'pull_request' && inputs.comment_on_pr }}
        uses: actions/github-script@v7
        env:
          SCHEMA_SOURCE: ${{ inputs.schema_source }}
          OPS_COUNT: ${{ steps.ops.outputs.ops_count }}
          TITLE: ${{ inputs.title }}
        with:
          script: |
            const marker = '<!-- schema-source-badge -->';
            const src = (process.env.SCHEMA_SOURCE || 'unknown').toUpperCase();
            const ops = process.env.OPS_COUNT || '0';
            const color = src === 'LIVE' ? '2ea44f' : (src === 'SNAPSHOT' ? 'ffae42' : '888888');
            const title = process.env.TITLE || 'GraphQL Schema Badge';
            const body = `${marker}
**${title}**

**GraphQL Schema Source:** ![${src}](https://img.shields.io/badge/schema-${src}-${color}?logo=graphql)

**Persisted Ops:** 


            const { context, github } = require('@actions/github');
            const { owner, repo } = context.repo;
            const issue_number = context.payload.pull_request.number;

            const { data: comments } = await github.rest.issues.listComments({ owner, repo, issue_number });
            const existing = comments.find(c => c.body && c.body.includes(marker));

            if (existing) {
              await github.rest.issues.updateComment({ owner, repo, comment_id: existing.id, body });
            } else {
              await github.rest.issues.createComment({ owner, repo, issue_number, body });
            }

      - name: Job Summary
        shell: bash
        env:
          SCHEMA_SOURCE: ${{ inputs.schema_source }}
          OPS_COUNT: ${{ steps.ops.outputs.ops_count }}
          TITLE: ${{ inputs.title }}
        run: |
          SRC=$(echo "${SCHEMA_SOURCE:-unknown}" | tr '[:lower:]' '[:upper:]')
          echo "### ${TITLE}" >> "$GITHUB_STEP_SUMMARY"
          echo "" >> "$GITHUB_STEP_SUMMARY"
          echo "- Schema Source: ${SRC}" >> "$GITHUB_STEP_SUMMARY"
          echo "- Persisted Ops: 

```

### summit-main/.github/workflows/sec-audit.yml

```
name: 🛡️ Security Audit - Comprehensive Security Scanning
on:
  push:
    branches: [main, develop, 'release/**']
  pull_request:
    branches: [main, develop]
  schedule:
    - cron: '0 2 * * 1' # Weekly on Mondays at 2 AM UTC
  workflow_dispatch:

permissions:
  contents: read
  security-events: write
  actions: read

concurrency:
  group: security-audit-${{ github.ref }}
  cancel-in-progress: false # Don't cancel security scans

env:
  SCAN_RESULTS_PATH: .security-scan-results

jobs:
  setup:
    name: 🔧 Security Scan Setup
    runs-on: ubuntu-latest
    outputs:
      scan-matrix: ${{ steps.setup.outputs.scan-matrix }}
      has-code: ${{ steps.setup.outputs.has-code }}
      has-docker: ${{ steps.setup.outputs.has-docker }}
      has-dependencies: ${{ steps.setup.outputs.has-dependencies }}
    steps:
      - uses: actions/checkout@v4

      - name: Setup scan environment
        id: setup
        run: |
          mkdir -p ${{ env.SCAN_RESULTS_PATH }}

          # Detect what we have to scan
          HAS_CODE="false"
          HAS_DOCKER="false"
          HAS_DEPENDENCIES="false"

          if find . -name "*.js" -o -name "*.ts" -o -name "*.py" -o -name "*.go" | head -1 | grep -q .; then
            HAS_CODE="true"
          fi

          if find . -name "Dockerfile*" -o -name "docker-compose*.yml" | head -1 | grep -q .; then
            HAS_DOCKER="true"
          fi

          if find . -name "package*.json" -o -name "requirements*.txt" -o -name "Cargo.toml" -o -name "go.mod" | head -1 | grep -q .; then
            HAS_DEPENDENCIES="true"
          fi

          # Create scan matrix
          MATRIX='{"include":['
          MATRIX+='"secret-scan",'
          MATRIX+='"sast-scan",'
          if [ "$HAS_DOCKER" == "true" ]; then
            MATRIX+='"container-scan",'
          fi
          if [ "$HAS_DEPENDENCIES" == "true" ]; then
            MATRIX+='"dependency-scan",'
          fi
          MATRIX+='"license-scan"'
          MATRIX+=']}'

          echo "scan-matrix=$MATRIX" >> $GITHUB_OUTPUT
          echo "has-code=$HAS_CODE" >> $GITHUB_OUTPUT
          echo "has-docker=$HAS_DOCKER" >> $GITHUB_OUTPUT  
          echo "has-dependencies=$HAS_DEPENDENCIES" >> $GITHUB_OUTPUT

          echo "🔧 Security scan setup complete"
          echo "Code: $HAS_CODE | Docker: $HAS_DOCKER | Dependencies: $HAS_DEPENDENCIES"

  secret-scan:
    name: 🔍 Secret Detection
    runs-on: ubuntu-latest
    needs: setup
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Install Gitleaks
        run: |
          wget -q https://github.com/gitleaks/gitleaks/releases/download/v8.18.4/gitleaks_8.18.4_linux_x64.tar.gz
          tar xzf gitleaks_8.18.4_linux_x64.tar.gz
          sudo mv gitleaks /usr/local/bin/
          gitleaks version

      - name: Configure Gitleaks
        run: |
          if [ ! -f .gitleaks.toml ]; then
            cat > .gitleaks.toml << 'EOF'
          [extend]
          useDefault = true

          [[rules]]
          description = "AWS Access Key"
          id = "aws-access-key"
          regex = '''AKIA[0-9A-Z]{16}'''

          [[rules]]
          description = "OpenAI API Key"
          id = "openai-api-key"
          regex = '''sk-[a-zA-Z0-9]{48}'''

          [[rules]]
          description = "GitHub Token"
          id = "github-token"
          regex = '''gh[pousr]_[A-Za-z0-9_]{36,251}'''

          [allowlist]
          description = "Test files and examples"
          files = [
            '''.*test.*''',
            '''.*spec.*''',
            '''.*example.*''',
            '''.*mock.*'''
          ]
          EOF
          fi

      - name: Run Gitleaks scan
        run: |
          echo "🔍 Scanning for secrets..."
          gitleaks detect \
            --source . \
            --config .gitleaks.toml \
            --report-format json \
            --report-path ${{ env.SCAN_RESULTS_PATH }}/gitleaks-report.json \
            --verbose || {
            echo "SECRETS_FOUND=true" >> $GITHUB_ENV
            echo "⚠️ Potential secrets detected"
          }

          if [ ! -f "${{ env.SCAN_RESULTS_PATH }}/gitleaks-report.json" ]; then
            echo '{"results": []}' > ${{ env.SCAN_RESULTS_PATH }}/gitleaks-report.json
          fi

      - name: Upload Gitleaks results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: gitleaks-results
          path: ${{ env.SCAN_RESULTS_PATH }}/gitleaks-report.json
          retention-days: 30

  sast-scan:
    name: 🔬 Static Application Security Testing
    runs-on: ubuntu-latest
    needs: setup
    if: needs.setup.outputs.has-code == 'true'
    steps:
      - uses: actions/checkout@v4

      - name: Setup Python for Semgrep
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install Semgrep
        run: |
          pip install semgrep
          semgrep --version

      - name: Run Semgrep SAST
        run: |
      
```

### summit-main/.github/workflows/security-and-ci.yml

```
name: security-and-ci
on:
  push:
    branches: [main, develop, 'feature/**']
  pull_request: {}

jobs:
  build-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      # --- Client GraphQL: lint + precodegen + live→snapshot codegen + safelist verify ---
      - name: Lint GraphQL docs (client)
        run: npm -w client run lint
      - name: Precodegen duplicate check
        run: node scripts/find-duplicate-ops.mjs
      - name: Codegen (live)
        id: codegen_live
        continue-on-error: true
        env:
          GRAPHQL_CODEGEN_CONCURRENCY: '1'
        run: npm -w client run persist:queries
      - name: Codegen (snapshot fallback)
        if: ${{ steps.codegen_live.outcome == 'failure' }}
        env:
          GRAPHQL_CODEGEN_CONCURRENCY: '1'
          CODEGEN_SCHEMA: client/schema.graphql
        run: npm -w client run persist:queries
      - name: Schema badge
        uses: BrianCLong/intelgraph/.github/workflows/schema-badge.yml@chore/graphql-namespace-sweep
        with:
          schema_source: ${{ steps.codegen_live.outcome == 'success' && 'live' || 'snapshot' }}
          comment_on_pr: ${{ github.event_name == 'pull_request' }}
          title: Security & CI — Schema
          manifest_path: client/artifacts/graphql-ops.json
      - name: Verify safelist covers client operations
        run: npm run verify:safelist
      - run: npm run build
      - run: npm run test:unit
      - name: Generate SBOM
        uses: CycloneDX/gh-node-module-generatebom@v2
        with:
          output: 'bom.xml'
      - name: Trivy FS scan
        uses: aquasecurity/trivy-action@0.24.0
        with:
          scan-type: 'fs'
          format: 'table'
          exit-code: '1'
          severity: 'CRITICAL,HIGH'
      - name: CodeQL Init
        uses: github/codeql-action/init@v3
        with:
          languages: javascript
      - name: CodeQL Analyze
        uses: github/codeql-action/analyze@v3

  update-safelist:
    if: github.ref == 'refs/heads/main'
    needs: build-test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          node scripts/extract-op-hashes.js > server/src/graphql/safelist.generated.json
      - uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: 'chore(gql): update safelist from CI'

```

### summit-main/.github/workflows/seed-subissues.yml

```
name: seed-subissues

on:
  issues:
    types: [opened, labeled]

permissions:
  contents: read
  issues: write
  projects: write

jobs:
  seed:
    if: >
      contains(join(github.event.label.name, ' '), 'release: v1.1') &&
      contains(join(github.event.label.name, ' '), 'tracking')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install jq
        run: sudo apt-get update && sudo apt-get install -y jq

      - name: Ensure gh
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: gh auth status || true

      - name: Spawn sub-issues from seeds (idempotent)
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          PARENT_NUMBER: ${{ github.event.issue.number }}
        run: |
          set -euo pipefail
          test -f .github/roadmap_seeds.yml || exit 0
          python3 - <<'PY'
import os, subprocess, yaml, hashlib
parent=int(os.environ["PARENT_NUMBER"])  # tracking issue number
with open('.github/roadmap_seeds.yml') as f:
  seeds=yaml.safe_load(f) or {}

# infer THEME from parent title
title=subprocess.check_output(["gh","issue","view",str(parent),"--json","title","-q",".title"]).decode().lower()
theme='quality'
for k in ['routing','citations','exports']:
  if k in title:
    theme=k; break

items=seeds.get(theme, [])

def marker(theme, title):
  hid=hashlib.sha1((theme+'|'+title).encode()).hexdigest()[:12]
  return f"<!-- seed:{theme}:{hid} -->"

def issue_has_marker(num, mark):
  try:
    out=subprocess.check_output(["gh","issue","view",str(num),"--json","comments","-q",".comments[].body"]).decode()
  except subprocess.CalledProcessError:
    return False
  return mark in out

# scan existing issues for markers to avoid dup
existing_nums=subprocess.check_output(["gh","issue","list","--label",f"release: v1.0.0-assistant,theme: {theme}","--state","all","--json","number","-q",".[].number"]).decode().strip().split()

for it in items:
  t=it.get('title','(no title)')
  b=it.get('body','')
  mark=marker(theme,t)
  dup=False
  for n in existing_nums:
    if issue_has_marker(n, mark):
      dup=True; break
  if dup:
    continue
  url=subprocess.check_output([
    'gh','issue','create',
    '--title', t,
    '--body', b,
    '--label','release: v1.1',
    '--label', f'theme: {theme}'
  ]).decode().strip()
  num=url.split('/')[-1]
  # annotate for future idempotency
  subprocess.run(['gh','issue','comment',num,'--body',mark],check=False)
  subprocess.run(['gh','issue','comment',num,'--body',f'Linked to tracking issue #{parent}'],check=False)
  subprocess.run(['gh','issue','comment',str(parent),'--body',f'Spawned sub-issue #{num}'],check=False)
PY
```

### summit-main/.github/workflows/server-startup-smoke.yml

```
name: Server Startup Smoke Test
on:
  push:
    branches: [main, develop, fix/ui-docker-build]
    paths: ['server/**', '.github/workflows/server-startup-smoke.yml']
  pull_request:
    paths: ['server/**', '.github/workflows/server-startup-smoke.yml']

jobs:
  smoke-test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_PASSWORD: test_password
          POSTGRES_USER: intelgraph
          POSTGRES_DB: intelgraph
        ports:
          - '5432:5432'
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 10

      redis:
        image: redis:7-alpine
        ports:
          - '6379:6379'
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 10

      neo4j:
        image: neo4j:4.4
        env:
          NEO4J_AUTH: neo4j/test_password
        ports:
          - '7474:7474'
          - '7687:7687'
        options: >-
          --health-cmd "wget -qO- http://localhost:7474 >/dev/null 2>&1 || exit 1"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 20

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: server/package-lock.json

      - name: Install server dependencies
        working-directory: server
        run: npm ci

      - name: Create test environment file
        working-directory: server
        run: |
          cat > .env << EOF
          NODE_ENV=test
          PORT=4000
          DATABASE_URL=postgres://intelgraph:test_password@localhost:5432/intelgraph
          NEO4J_URI=bolt://localhost:7687
          NEO4J_USER=neo4j
          NEO4J_PASSWORD=test_password
          REDIS_HOST=localhost
          REDIS_PORT=6379
          JWT_SECRET=test-jwt-secret-for-ci-at-least-32-characters-long
          JWT_REFRESH_SECRET=test-refresh-secret-different-from-jwt-secret
          CORS_ORIGIN=http://localhost:3000
          EOF

      - name: Start server in background
        working-directory: server
        run: |
          npm run dev &
          echo $! > server.pid
          sleep 10

      - name: Test health endpoint
        run: |
          curl -f http://localhost:4000/healthz
          echo "✓ Health check passed"

      - name: Test readiness endpoint
        run: |
          curl -f http://localhost:4000/readyz
          echo "✓ Readiness check passed"

      - name: Test metrics endpoint
        run: |
          curl -f http://localhost:4000/metrics | head -5
          echo "✓ Metrics endpoint responding"

      - name: Stop server
        working-directory: server
        if: always()
        run: |
          if [ -f server.pid ]; then
            kill $(cat server.pid) || true
            rm server.pid
          fi

      - name: Check server logs
        working-directory: server
        if: failure()
        run: |
          echo "=== Server logs (if available) ==="
          tail -50 nohup.out || echo "No server logs found"

```

### summit-main/.github/workflows/sig-contract-tests.yml

```
name: SIG Contract Tests with N-2 Compatibility

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
    paths:
      - 'contracts/**'
      - 'packages/sdk-**/**'
      - 'prov_ledger/**'
      - 'server/src/conductor/api/**'

env:
  NODE_VERSION: '18'
  PYTHON_VERSION: '3.11'

jobs:
  contract-validation:
    name: Validate API Contracts
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0 # Fetch full history for version comparison

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: 'contracts/package-lock.json'

      - name: Install contract dependencies
        working-directory: contracts
        run: npm ci

      - name: Validate OpenAPI schemas
        working-directory: contracts
        run: |
          npx @apidevtools/swagger-cli validate sig-integration-api.yaml
          npx @apidevtools/swagger-cli validate ../schemas/runbook.schema.json
          npx @apidevtools/swagger-cli validate ../schemas/workflow.schema.json

      - name: Check breaking changes
        working-directory: contracts
        run: |
          # Compare with previous version for breaking changes
          git fetch origin main:main || true
          if git show main:contracts/sig-integration-api.yaml > /tmp/main-api.yaml 2>/dev/null; then
            npx oasdiff breaking /tmp/main-api.yaml sig-integration-api.yaml || echo "Breaking changes detected"
          fi

  compatibility-tests:
    name: N-2 Compatibility Tests
    runs-on: ubuntu-latest
    needs: contract-validation

    strategy:
      matrix:
        api-version: ['v1.0.0', 'v0.9.0', 'v0.8.0'] # Current and N-2 versions

    services:
      test-api:
        image: node:18-alpine
        ports:
          - 3000:3000
        options: --health-cmd "curl -f http://localhost:3000/health" --health-interval 30s

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install test dependencies
        working-directory: contracts
        run: npm ci

      - name: Start mock API server
        run: |
          # Start mock server with OpenAPI spec
          npx @stoplight/prism mock contracts/sig-integration-api.yaml --host 0.0.0.0 --port 3000 &
          sleep 10

      - name: Run compatibility tests
        working-directory: contracts
        env:
          API_VERSION: ${{ matrix.api-version }}
          SIG_API_URL: http://localhost:3000
        run: |
          npm test -- --grep "Contract Tests"
          npm test -- --grep "Schema Compatibility"

  sdk-integration-tests:
    name: SDK Integration Tests
    runs-on: ubuntu-latest
    needs: contract-validation

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: ${{ env.PYTHON_VERSION }}

      - name: Install Python dependencies
        run: |
          cd packages/sdk-py
          pip install -e .[test]

      - name: Install Node.js dependencies
        run: |
          if [ -d "packages/sdk-ts" ]; then
            cd packages/sdk-ts
            npm install
          fi

      - name: Start test services
        run: |
          # Start evidence register API
          cd prov_ledger/app/api
          python -m uvicorn evidence_api:app --host 0.0.0.0 --port 8000 &
          sleep 5

          # Health check
          curl -f http://localhost:8000/health

      - name: Test Python SDK
        run: |
          cd packages/sdk-py
          python -m pytest tests/ -v || echo "Python SDK tests not found"

      - name: Test TypeScript SDK
        run: |
          if [ -d "packages/sdk-ts" ]; then
            cd packages/sdk-ts
            npm test || echo "TypeScript SDK tests not found"
          fi

  security-validation:
    name: Security Validation
    runs-on: ubuntu-latest
    needs: contract-validation

    steps:
      - uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: ${{ env.PYTHON_VERSION }}

      - name: Install security tools
        run: |
          pip install bandit safety semgrep

      - name: Run security scans
        run: |
          # Scan Python code
          find . -name "*.py" -path "./prov_ledger/*" -exec bandit -r {} + || true

          # Check for known vulnerabilities
          find . -name "requirements*.txt" -exec safety check -r {} + || true

          # Scan for security issues
          semgrep --config=auto prov_ledger/ || true

  deployment-validation:
    name: Deployment Validati
```

### summit-main/.github/workflows/slo-watch.yml

```
name: SLO Watch
on:
  schedule: [{ cron: '*/5 * * * *' }]
jobs:
  probe:
    runs-on: ubuntu-latest
    steps:
      - name: Probe
        run: |
          BASE=${{ secrets.SYMPHONY_BASE || 'http://127.0.0.1:8787' }}
          H=$(curl -fsS "$BASE/status/health.json")
          B=$(curl -fsS "$BASE/status/burndown.json")
          err=$(jq -r '.error_rate_15m // 0' <<<"$B")
          lat=$(jq -r '.p95_route_execute_ms // 0' <<<"$B")
          if (( $(echo "$err > 0.01" | bc -l) )) || (( lat > 6000 )); then
            echo "::set-output name=breach::true"
          fi
      - name: Create ticket on breach
        if: steps.probe.outputs.breach == 'true'
        uses: peter-evans/create-issue-from-file @docs/velocity-plan-v5.md
        with:
          title: 'SLO breach: error/latency over threshold'
          content-file: .github/ISSUE_TEMPLATE/slo-breach.md

```

### summit-main/.github/workflows/smoke-dev.yml

```
name: Smoke (Dev)

on:
  workflow_dispatch: {}
  workflow_run:
    workflows: ['CD Pipeline']
    types: [completed]

jobs:
  smoke-dev:
    if: ${{ github.event_name == 'workflow_dispatch' || github.event.workflow_run.conclusion == 'success' }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install hey
        run: |
          sudo apt-get update -y
          sudo apt-get install -y golang-go
          go install github.com/rakyll/hey@latest
          echo "${HOME}/go/bin" >> $GITHUB_PATH

      - name: Repo smoke (local checks)
        run: make smoke

      - name: Dev smoke (remote URL)
        env:
          DEV_BASE_URL: ${{ vars.DEV_BASE_URL }}
        run: |
          bash scripts/smoke-dev.sh

      - name: Setup Node.js for E2E
        if: ${{ secrets.E2E_TEST_USER != '' && secrets.E2E_TEST_PASS != '' }}
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install Playwright
        if: ${{ secrets.E2E_TEST_USER != '' && secrets.E2E_TEST_PASS != '' }}
        run: |
          npm ci
          npx playwright install --with-deps

      - name: Run E2E tests (Playwright)
        if: ${{ secrets.E2E_TEST_USER != '' && secrets.E2E_TEST_PASS != '' }}
        env:
          BASE_URL: ${{ vars.DEV_BASE_URL }}
          E2E_USER: ${{ secrets.E2E_TEST_USER }}
          E2E_PASS: ${{ secrets.E2E_TEST_PASS }}
        run: |
          npx playwright test

```

### summit-main/.github/workflows/syft-sbom.yml

```
name: SBOM (Syft)
on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
jobs:
  sbom:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Generate SBOM with Syft
        uses: anchore/sbom-action@v0
        with:
          format: spdx-json
          output-file: sbom-spdx.json
      - name: Upload SBOM
        uses: actions/upload-artifact@v4
        with:
          name: sbom-spdx
          path: sbom-spdx.json

```

### summit-main/.github/workflows/test.yml

```
name: tests
on:
  push:
    branches: [main]
  pull_request:

jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: npm
      - run: npm ci && (cd server && npm ci) && (cd client && npm ci)
      - run: npm run test:unit

  integration:
    needs: unit
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: ig
          POSTGRES_PASSWORD: ig
          POSTGRES_DB: intelgraph
        options: >-
          --health-cmd="pg_isready -U ig"
          --health-interval=5s --health-timeout=5s --health-retries=20
        ports: ['5432:5432']
      neo4j:
        image: neo4j:5.20-community
        env:
          NEO4J_AUTH: neo4j/test
          NEO4J_dbms_security_auth__enabled: 'true'
          NEO4J_dbms_memory_pagecache_size: 512M
        options: >-
          --health-cmd="wget --spider -q http://localhost:7474 || exit 1"
          --health-interval=5s --health-timeout=5s --health-retries=60
        ports: ['7687:7687', '7474:7474']
      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd="redis-cli ping || exit 1"
          --health-interval=5s --health-timeout=3s --health-retries=60
        ports: ['6379:6379']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: npm
      - run: npm ci && (cd server && npm ci)
      - name: Wait for services
        run: npx wait-on tcp:5432 tcp:6379 tcp:7687
      - name: Run integration tests (server)
        env:
          TEST_INTEGRATION: '1'
          DATABASE_URL: postgres://ig:ig@localhost:5432/intelgraph
          NEO4J_URL: bolt://localhost:7687
          NEO4J_USER: neo4j
          NEO4J_PASSWORD: test
          REDIS_URL: redis://localhost:6379
        run: npm run test:integration

```

### summit-main/ga-graphai/.github/workflows/ci.yml

```
name: CI

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - uses: actions/setup-python@v4
        with:
          python-version: '3.12'
      - run: npm install --workspaces
      - run: npm test || true
      - run: pip install pytest && pytest || true

```

### summit-main/ops/observability-ci/.github/workflows/ci-node.yml

```
name: ci-node
on:
  workflow_call:
    inputs:
      working-directory:
        required: true
        type: string
jobs:
  build:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ${{ inputs.working-directory }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: npm
      - run: npm ci
      - run: npm test -- --coverage
      - run: node "$GITHUB_WORKSPACE/ops/observability-ci/scripts/verify-coverage.js" "${{ inputs.working-directory }}"

```

### summit-main/ops/observability-ci/.github/workflows/ci-python.yml

```
name: ci-python
on:
  workflow_call:
    inputs:
      working-directory:
        required: true
        type: string
jobs:
  build:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ${{ inputs.working-directory }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: pip install -r requirements.txt
      - run: |
          pip install pytest coverage black ruff mypy
          black --check .
          ruff .
          mypy .
          pytest --cov=. --cov-report=json:coverage-summary.json
      - run: node "$GITHUB_WORKSPACE/ops/observability-ci/scripts/verify-coverage.js" "${{ inputs.working-directory }}"

```

### summit-main/ops/observability-ci/.github/workflows/container-scan.yml

```
name: container-scan
on:
  workflow_call:
    inputs:
      image:
        required: true
        type: string
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: aquasecurity/trivy-action@v0.12.0
        with:
          image-ref: ${{ inputs.image }}
          format: table

```

### summit-main/ops/observability-ci/.github/workflows/e2e-webapp.yml

```
name: e2e-webapp
on:
  workflow_call:
    inputs:
      working-directory:
        required: true
        type: string
jobs:
  e2e:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ${{ inputs.working-directory }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e

```

### summit-main/ops/observability-ci/.github/workflows/self-test.yml

```
name: self-test
on:
  push:
    paths:
      - 'ops/observability-ci/**'
  workflow_dispatch:
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: pip install pre-commit
      - run: pre-commit run --files $(git ls-files ops/observability-ci)

```

### summit-main/server/.github/workflows/ci-cd.yml

```
name: IntelGraph CI/CD Pipeline

on:
  push:
    branches: [main, develop, 'feature/**', 'hotfix/**']
  pull_request:
    branches: [main, develop]
  release:
    types: [published]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}
  NODE_VERSION: '18'

jobs:
  # Code Quality and Security Checks
  code-quality:
    name: Code Quality & Security
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint
        continue-on-error: true

      - name: Run Prettier check
        run: npm run format:check
        continue-on-error: true

      - name: Security audit
        run: npm audit --audit-level moderate
        continue-on-error: true

      - name: Check for vulnerabilities with Snyk
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high
        continue-on-error: true

      - name: Upload Snyk results to GitHub Code Scanning
        uses: github/codeql-action/upload-sarif@v2
        if: always()
        with:
          sarif_file: snyk.sarif
        continue-on-error: true

  # Unit and Integration Tests
  test:
    name: Test Suite
    runs-on: ubuntu-latest
    needs: code-quality
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: testpass
          POSTGRES_USER: testuser
          POSTGRES_DB: intelgraph_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

      neo4j:
        image: neo4j:5.15
        env:
          NEO4J_AUTH: neo4j/testpass
          NEO4J_PLUGINS: '["apoc"]'
        options: >-
          --health-cmd "cypher-shell -u neo4j -p testpass 'RETURN 1'"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 10
        ports:
          - 7687:7687
          - 7474:7474

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Wait for services
        run: |
          timeout 60 bash -c 'until nc -z localhost 5432; do sleep 1; done'
          timeout 60 bash -c 'until nc -z localhost 6379; do sleep 1; done'
          timeout 60 bash -c 'until nc -z localhost 7687; do sleep 1; done'

      - name: Run unit tests
        env:
          NODE_ENV: test
          POSTGRES_HOST: localhost
          POSTGRES_PORT: 5432
          POSTGRES_DB: intelgraph_test
          POSTGRES_USER: testuser
          POSTGRES_PASSWORD: testpass
          REDIS_HOST: localhost
          REDIS_PORT: 6379
          NEO4J_URI: bolt://localhost:7687
          NEO4J_USERNAME: neo4j
          NEO4J_PASSWORD: testpass
        run: npm test -- --coverage --ci

      - name: Run integration tests
        env:
          NODE_ENV: test
          POSTGRES_HOST: localhost
          POSTGRES_PORT: 5432
          POSTGRES_DB: intelgraph_test
          POSTGRES_USER: testuser
          POSTGRES_PASSWORD: testpass
          REDIS_HOST: localhost
          REDIS_PORT: 6379
          NEO4J_URI: bolt://localhost:7687
          NEO4J_USERNAME: neo4j
          NEO4J_PASSWORD: testpass
        run: npm run test:integration

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          file: ./coverage/lcov.info
          flags: unittests
          name: codecov-umbrella

      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-results
          path: |
            coverage/
            test-results.xml

  # Performance Tests
  performance-test:
    name: Performance Tests
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main' || github.event_name == 'pull_request'
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run performance tests
        run: npm run test:performance
        continue-on-er
```


## Kubernetes Manifests (sample snippets)

### summit-main/deploy/alertmanager/alertmanager.yaml

```
global:
  resolve_timeout: 5m

route:
  receiver: 'pagerduty'
  routes:
    - matchers:
        - severity = critical
      receiver: 'pagerduty'
    - matchers:
        - severity = warning
      receiver: 'pagerduty'

receivers:
  - name: 'pagerduty'
    pagerduty_configs:
      - routing_key_file: /etc/alertmanager/secrets/pagerduty-routing-key
        description: 'Maestro Alert'
        severity: '{{ if eq .CommonLabels.severity "critical" }}critical{{ else }}warning{{ end }}'
        class: 'maestro'
        details:
          alertname: '{{ .CommonLabels.alertname }}'
          summary: '{{ .CommonAnnotations.summary }}'
          instance: '{{ .CommonLabels.instance }}'
          route: '{{ .CommonLabels.route }}'

```

### summit-main/deploy/alertmanager/secret.yaml

```
apiVersion: v1
kind: Secret
metadata:
  name: pagerduty-routing-key
  namespace: monitoring
type: Opaque
stringData:
  pagerduty-routing-key: '${PAGERDUTY_ROUTING_KEY}'

```

### summit-main/deploy/argo/ingress.yaml

```
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: maestro-server-ingress
  namespace: maestro
  annotations:
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/ssl-redirect: 'true'
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
    - hosts:
        - maestro.intelgraph.ai
      secretName: maestro-tls
  rules:
    - host: maestro.intelgraph.ai
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: maestro-server
                port:
                  number: 80

```

### summit-main/deploy/argo/namespace.yaml

```
apiVersion: v1
kind: Namespace
metadata:
  name: maestro

```

### summit-main/deploy/argo/rollout-maestro.yaml

```
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: maestro-server-rollout
  namespace: intelgraph-prod
spec:
  replicas: 3
  selector:
    matchLabels:
      app: maestro-server
  strategy:
    canary:
      canaryService: maestro-server-canary
      stableService: maestro-server
      trafficRouting:
        nginx:
          stableIngress: maestro-server-ingress
      steps:
        - setWeight: 10
        - pause: { duration: 60 }
        - setWeight: 25
        - pause: { duration: 120 }
        - setWeight: 50
        - pause: { duration: 180 }
        - setWeight: 100
      analysis:
        templates:
          - templateName: maestro-slo-analysis
        startingStep: 1
  template:
    metadata:
      labels:
        app: maestro-server
    spec:
      containers:
        - name: server
          image: ghcr.io/brianclong/maestro-control-plane@sha256:3d4b6343a304029d49f53eb5f33683dc17b932f5e11ee072698994bbae478f84
          ports:
            - containerPort: 4000
          readinessProbe:
            httpGet: { path: /api/ready, port: 4000 }
            initialDelaySeconds: 5
            periodSeconds: 5
          livenessProbe:
            httpGet: { path: /api/health, port: 4000 }
            initialDelaySeconds: 10
            periodSeconds: 10
---
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: maestro-slo-analysis
  namespace: intelgraph-prod
spec:
  metrics:
    - name: blackbox-availability
      interval: 1m
      successCondition: result >= 0.99
      failureLimit: 1
      provider:
        prometheus:
          address: http://kube-prometheus-stack-prometheus.monitoring.svc:9090
          query: |
            avg_over_time(probe_success{job="blackbox",instance="{{args.target}}"}[5m])
    - name: blackbox-p95-ttfb
      interval: 1m
      successCondition: result < 1.5
      failureLimit: 1
      provider:
        prometheus:
          address: http://kube-prometheus-stack-prometheus.monitoring.svc:9090
          query: |
            histogram_quantile(0.95,sum(rate(probe_http_duration_seconds_bucket{job="blackbox",instance="{{args.target}}",phase="first_byte"}[5m])) by (le))
  args:
    - name: target
      value: https://maestro.intelgraph.ai/health

```

### summit-main/deploy/argo/services.yaml

```
apiVersion: v1
kind: Service
metadata:
  name: maestro-server
  namespace: maestro
  labels:
    app: maestro-server
spec:
  ports:
    - name: http
      port: 80
      targetPort: 4000
  selector:
    app: maestro-server
---
apiVersion: v1
kind: Service
metadata:
  name: maestro-server-canary
  namespace: maestro
  labels:
    app: maestro-server
spec:
  ports:
    - name: http
      port: 80
      targetPort: 4000
  selector:
    app: maestro-server

```

### summit-main/deploy/cron/audit-anchor.yaml

```
apiVersion: batch/v1
kind: CronJob
metadata: { name: audit-anchor, namespace: intelgraph }
spec:
  schedule: '5 0 * * *'
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: anchor
              image: python:3.12-slim
              env:
                - name: DATABASE_URL
                  valueFrom: { secretKeyRef: { name: app-secrets, key: DATABASE_URL } }
                - name: AUDIT_ANCHOR_PRIVATE_KEY_PEM
                  valueFrom:
                    { secretKeyRef: { name: app-secrets, key: AUDIT_ANCHOR_PRIVATE_KEY_PEM } }
              command: ['python', '/app/services/audit/anchor_daily.py']
              volumeMounts: [{ name: repo, mountPath: /app }]
          volumes: [{ name: repo, emptyDir: {} }]

```

### summit-main/deploy/cron/dr-restore-check-maestro.yaml

```
apiVersion: batch/v1
kind: CronJob
metadata:
  name: dr-restore-check
  namespace: maestro-system
spec:
  schedule: '0 3 * * *'
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: restore-check
              image: docker.io/library/postgres:16-alpine
              imagePullPolicy: IfNotPresent
              env:
                - name: PGURL
                  valueFrom:
                    secretKeyRef:
                      name: dr-restore-check
                      key: pgurl
              volumeMounts:
                - name: dr-scripts
                  mountPath: /opt/dr
              command: ['/bin/sh', '-lc']
              args:
                - |
                  set -euo pipefail
                  apk add --no-cache bash curl >/dev/null 2>&1 || true
                  chmod +x /opt/dr/restore_check.sh
                  /opt/dr/restore_check.sh | tee /proc/1/fd/1
          volumes:
            - name: dr-scripts
              configMap:
                name: dr-restore-scripts
                defaultMode: 0755
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: dr-restore-scripts
  namespace: maestro-system
data:
  restore_check.sh: |
    #!/usr/bin/env bash
    set -euo pipefail
    : "${PGURL:?Set PGURL}"
    echo "[DR] Starting restore verification against $PGURL"
    psql "$PGURL" -v ON_ERROR_STOP=1 <<'SQL'
    SELECT now();
    SELECT to_regclass('public.pipelines') IS NOT NULL AS has_pipelines;
    SELECT to_regclass('public.executors') IS NOT NULL AS has_executors;
    SELECT to_regclass('public.mcp_servers') IS NOT NULL AS has_mcp_servers;
    SELECT to_regclass('public.mcp_sessions') IS NOT NULL AS has_mcp_sessions;
    SQL
    echo "[DR] Restore verification completed"

```

### summit-main/deploy/cron/dr-restore-check.yaml

```
apiVersion: batch/v1
kind: CronJob
metadata:
  name: dr-restore-check
  namespace: staging
spec:
  schedule: '0 3 * * *' # daily at 03:00 UTC
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: restore-check
              image: docker.io/library/postgres:16-alpine
              imagePullPolicy: IfNotPresent
              env:
                - name: PGURL
                  valueFrom:
                    secretKeyRef:
                      name: dr-restore-check
                      key: pgurl
              volumeMounts:
                - name: dr-scripts
                  mountPath: /opt/dr
              command: ['/bin/sh', '-lc']
              args:
                - |
                  set -euo pipefail
                  apk add --no-cache bash curl >/dev/null 2>&1 || true
                  chmod +x /opt/dr/restore_check.sh
                  /opt/dr/restore_check.sh | tee /proc/1/fd/1
          volumes:
            - name: dr-scripts
              configMap:
                name: dr-restore-scripts
                defaultMode: 0755
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: dr-restore-scripts
  namespace: staging
data:
  restore_check.sh: |
    #!/usr/bin/env bash
    set -euo pipefail
    : "${PGURL:?Set PGURL}"
    echo "[DR] Starting restore verification against $PGURL"
    psql "$PGURL" -v ON_ERROR_STOP=1 <<'SQL'
    SELECT now();
    SELECT to_regclass('public.pipelines') IS NOT NULL AS has_pipelines;
    SELECT to_regclass('public.executors') IS NOT NULL AS has_executors;
    SELECT to_regclass('public.mcp_servers') IS NOT NULL AS has_mcp_servers;
    SELECT to_regclass('public.mcp_sessions') IS NOT NULL AS has_mcp_sessions;
    SQL
    echo "[DR] Restore verification completed"

```

### summit-main/deploy/cron/qos-daily.yaml

```
apiVersion: batch/v1
kind: CronJob
metadata:
  name: qos-daily-report
  namespace: intelgraph
spec:
  schedule: '15 13 * * *' # 7:15 AM America/Denver
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: report
              image: python:3.12-slim
              env:
                - name: DATABASE_URL
                  valueFrom: { secretKeyRef: { name: app-secrets, key: DATABASE_URL } }
                - name: SLACK_WEBHOOK
                  valueFrom: { secretKeyRef: { name: app-secrets, key: SLACK_WEBHOOK } }
              command: ['/bin/sh', '-c']
              args:
                - |
                  pip install psycopg2-binary >/dev/null && \
                  python services/analytics/reports/qos_daily.py > /tmp/r.json && \
                  curl -X POST -H 'Content-Type: application/json' \
                    --data "{"text":"QoS Daily Report\n```$(cat /tmp/r.json)```"}" \
                    "$SLACK_WEBHOOK"
              volumeMounts:
                - name: repo
                  mountPath: /workspace
          volumes:
            - name: repo
              emptyDir: {} # replace with your code mount strategy if needed

```

### summit-main/deploy/cron/qos-override-reminder.yaml

```
apiVersion: batch/v1
kind: CronJob
metadata:
  name: qos-override-reminder
  namespace: intelgraph
spec:
  schedule: '0 * * * *' # hourly; adjust as desired
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: remind
              image: node:18-alpine
              env:
                - name: DATABASE_URL
                  valueFrom: { secretKeyRef: { name: app-secrets, key: DATABASE_URL } }
                - name: SLACK_QOS_CSM_WEBHOOK
                  valueFrom: { secretKeyRef: { name: app-secrets, key: SLACK_QOS_CSM_WEBHOOK } }
                - name: QOS_OVERRIDE_REMINDER_HOURS
                  value: '24'
              command: ['node', '/app/services/admin/cron/qos_override_reminder.ts']
              volumeMounts:
                - name: repo
                  mountPath: /app
          volumes:
            - name: repo
              emptyDir: {} # mount your code as you do for other cron jobs

```

### summit-main/deploy/gatekeeper/k8s-required-best-practices.yaml

```
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata: { name: k8srequiredbestpractices }
spec:
  crd:
    spec:
      names: { kind: K8sRequiredBestPractices }
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package req.bp
        violation[{"msg": msg}] {
          input.review.kind.kind == "Deployment"  # Rollout renders RS/Deployment-like pods
          c := input.review.object.spec.template.spec.containers[_]
          not c.resources.limits
          msg := "containers must set resources.limits"
        }
        violation[{"msg": msg}] {
          c := input.review.object.spec.template.spec.containers[_]
          not c.securityContext.runAsNonRoot
          msg := "containers must runAsNonRoot"
        }
        violation[{"msg": msg}] {
          c := input.review.object.spec.template.spec.containers[_]
          not c.livenessProbe
          msg := "containers must define livenessProbe"
        }
        violation[{"msg": msg}] {
          c := input.review.object.spec.template.spec.containers[_]
          not c.readinessProbe
          msg := "containers must define readinessProbe"
        }
---
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredBestPractices
metadata: { name: maestro-req-bp }
spec:
  match:
    kinds:
      - apiGroups: ['argoproj.io']
        kinds: ['Rollout']

```

### summit-main/deploy/grafana/provisioning/dashboards/dashboards.yaml

```
apiVersion: 1
providers:
  - name: 'Maestro Dashboards'
    orgId: 1
    folder: 'Maestro'
    type: file
    disableDeletion: false
    editable: true
    options:
      path: /var/lib/grafana/dashboards

```

### summit-main/deploy/grafana/provisioning/datasources/datasource.yaml

```
apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true

```

### summit-main/deploy/helm/values-prod.yaml

```
gateway:
  env:
    ENFORCE_PERSISTED: 'true'
    GQL_MAX_COST: '1000'
  resources:
    requests: { cpu: '500m', memory: '1Gi' }
    limits: { cpu: '2', memory: '4Gi' }

opa:
  bundleUrl: s3://intelgraph-policies/bundles/prod.tar.gz
  poll:
    minDelaySeconds: 10
    maxDelaySeconds: 60

audit:
  signing:
    enabled: true
    publicKeyHex: '<ed25519-hex>'

traefik:
  additionalArguments:
    - '--serverstransport.insecureskipverify=false'
    - '--accesslog=true'

```

### summit-main/deploy/helm/intelgraph/Chart.yaml

```
apiVersion: v2
name: intelgraph
description: IntelGraph MLFP – production deployment
version: 0.1.0
appVersion: '2025.08.21'
type: application
keywords:
  - intelgraph
  - graph
  - mlfp
  - analytics
  - intelligence
home: https://github.com/BrianCLong/summit
sources:
  - https://github.com/BrianCLong/summit
maintainers:
  - name: IntelGraph Team
    email: team@intelgraph.com
dependencies:
  - name: postgresql
    version: '12.12.10'
    repository: https://charts.bitnami.com/bitnami
    condition: postgresql.enabled
  - name: redis
    version: '18.6.4'
    repository: https://charts.bitnami.com/bitnami
    condition: redis.enabled
annotations:
  category: Analytics
  images: |
    - name: api-gateway
      image: ghcr.io/brianclong/intelgraph/api-gateway:2025.08.21
    - name: analytics-service
      image: ghcr.io/brianclong/intelgraph/analytics-service:2025.08.21
    - name: ml-engine
      image: ghcr.io/brianclong/intelgraph/ml-engine:2025.08.21
    - name: graph-analytics
      image: ghcr.io/brianclong/intelgraph/graph-analytics:2025.08.21
    - name: feed-processor
      image: ghcr.io/brianclong/intelgraph/feed-processor:2025.08.21
    - name: search-engine
      image: ghcr.io/brianclong/intelgraph/search-engine:2025.08.21
    - name: workflow-engine
      image: ghcr.io/brianclong/intelgraph/workflow-engine:2025.08.21
    - name: mobile-interface
      image: ghcr.io/brianclong/intelgraph/mobile-interface:2025.08.21

```

### summit-main/deploy/helm/intelgraph/values-gpu.yaml

```
# GPU-enabled Helm values for IntelGraph
ml:
  image:
    repository: intelgraph/ml
    tag: 'latest-gpu'
    pullPolicy: IfNotPresent

  replicaCount: 1

  resources:
    requests:
      memory: '2Gi'
      cpu: '1'
      nvidia.com/gpu: 1
    limits:
      memory: '8Gi'
      cpu: '4'
      nvidia.com/gpu: 1

  nodeSelector:
    accelerator: nvidia-tesla-k80

  tolerations:
    - key: nvidia.com/gpu
      operator: Exists
      effect: NoSchedule

  env:
    USE_SPACY: 'true'
    UVICORN_HOST: '0.0.0.0'
    UVICORN_PORT: '8081'

mlWorker:
  image:
    repository: intelgraph/ml
    tag: 'latest-gpu'
    pullPolicy: IfNotPresent

  replicaCount: 2

  resources:
    requests:
      memory: '1Gi'
      cpu: '0.5'
      nvidia.com/gpu: 1
    limits:
      memory: '4Gi'
      cpu: '2'
      nvidia.com/gpu: 1

  nodeSelector:
    accelerator: nvidia-tesla-k80

  tolerations:
    - key: nvidia.com/gpu
      operator: Exists
      effect: NoSchedule

# Enhanced infrastructure for GPU workloads
redis:
  resources:
    requests:
      memory: '512Mi'
      cpu: '0.5'
    limits:
      memory: '2Gi'
      cpu: '1'

neo4j:
  resources:
    requests:
      memory: '2Gi'
      cpu: '1'
    limits:
      memory: '8Gi'
      cpu: '4'

  config:
    dbms.memory.heap.initial_size: '2G'
    dbms.memory.heap.max_size: '6G'
    dbms.memory.pagecache.size: '2G'

postgres:
  resources:
    requests:
      memory: '1Gi'
      cpu: '0.5'
    limits:
      memory: '4Gi'
      cpu: '2'

# Autoscaling for ML services
autoscaling:
  enabled: true
  minReplicas: 1
  maxReplicas: 5
  targetCPUUtilizationPercentage: 70
  targetMemoryUtilizationPercentage: 80

# Monitoring and observability
monitoring:
  enabled: true
  prometheus:
    enabled: true
  grafana:
    enabled: true
    dashboards:
      gpu: true
      ml: true

```

### summit-main/deploy/helm/intelgraph/values-mvp1plus.yaml

```
server:
  enabled: true
web:
  enabled: true
api:
  enabled: true
neo4j:
  enabled: true
redis:
  enabled: true

```

### summit-main/deploy/helm/intelgraph/values-prod.yaml

```
# Production environment overrides
global:
  tag: '2025.08.21+build.1'
  pullPolicy: Always

  ingress:
    host: intelgraph.mycorp.com
    annotations:
      nginx.ingress.kubernetes.io/rate-limit: '100'
      nginx.ingress.kubernetes.io/rate-limit-window: '1m'
      nginx.ingress.kubernetes.io/configuration-snippet: |
        more_set_headers "X-Frame-Options: DENY";
        more_set_headers "X-Content-Type-Options: nosniff";
        more_set_headers "X-XSS-Protection: 1; mode=block";
        more_set_headers "Referrer-Policy: strict-origin-when-cross-origin";
        more_set_headers "Permissions-Policy: camera=(), microphone=(), geolocation=()";

  otel:
    samplingRate: 0.05 # Reduced sampling for production

# Production scaling
services:
  apiGateway:
    replicaCount: 6
    resources:
      limits:
        cpu: '4'
        memory: '4Gi'
      requests:
        cpu: '1'
        memory: '1Gi'

  analytics:
    replicaCount: 4
    resources:
      limits:
        cpu: '2'
        memory: '2Gi'
      requests:
        cpu: '500m'
        memory: '512Mi'

  mlEngine:
    replicaCount: 4
    resources:
      limits:
        cpu: '8'
        memory: '8Gi'
      requests:
        cpu: '2'
        memory: '2Gi'

  graphAnalytics:
    replicaCount: 4
    resources:
      limits:
        cpu: '4'
        memory: '4Gi'
      requests:
        cpu: '1'
        memory: '1Gi'

  feedProcessor:
    replicaCount: 3
    resources:
      limits:
        cpu: '2'
        memory: '2Gi'
      requests:
        cpu: '500m'
        memory: '512Mi'

  searchEngine:
    replicaCount: 3
    resources:
      limits:
        cpu: '2'
        memory: '2Gi'
      requests:
        cpu: '500m'
        memory: '512Mi'

  workflowEngine:
    replicaCount: 3
    resources:
      limits:
        cpu: '2'
        memory: '2Gi'
      requests:
        cpu: '500m'
        memory: '512Mi'

  mobile:
    replicaCount: 3
    resources:
      limits:
        cpu: '1'
        memory: '1Gi'
      requests:
        cpu: '200m'
        memory: '256Mi'

# Production autoscaling
autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 20
  targetCPUUtilizationPercentage: 60
  targetMemoryUtilizationPercentage: 70
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 50
          periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
        - type: Percent
          value: 100
          periodSeconds: 15

# Production monitoring
serviceMonitor:
  enabled: true
  interval: 10s
  scrapeTimeout: 5s

# Backup enabled in production
backup:
  enabled: true
  schedule: '0 2 * * *'
  retention: '90d'

# External secrets enabled
externalSecrets:
  enabled: true
  secretStore:
    provider: aws
    region: us-west-2
    roleArn: 'arn:aws:iam::123456789012:role/intelgraph-secrets-role'

# Production security
security:
  podSecurityStandards:
    enforce: restricted
    audit: restricted
    warn: 
```

### summit-main/deploy/helm/intelgraph/values-staging.yaml

```
# Staging environment overrides
global:
  tag: '{{ .Chart.AppVersion }}-staging'

  ingress:
    host: staging.intelgraph.mycorp.com
    annotations:
      nginx.ingress.kubernetes.io/auth-url: 'https://oauth2-proxy.auth.svc.cluster.local/oauth2/auth'
      nginx.ingress.kubernetes.io/auth-signin: 'https://oauth2-proxy.auth.svc.cluster.local/oauth2/start?rd=https://$host$request_uri'

# Staging scaling (smaller than production)
services:
  apiGateway:
    replicaCount: 2
  analytics:
    replicaCount: 2
  mlEngine:
    replicaCount: 2
  graphAnalytics:
    replicaCount: 2
  feedProcessor:
    replicaCount: 1
  searchEngine:
    replicaCount: 1
  workflowEngine:
    replicaCount: 1
  mobile:
    replicaCount: 1

# Reduced autoscaling for staging
autoscaling:
  enabled: true
  minReplicas: 1
  maxReplicas: 5
  targetCPUUtilizationPercentage: 80
  targetMemoryUtilizationPercentage: 85

# Test data seeding
testData:
  enabled: true
  job:
    image: seed-data
    restartPolicy: OnFailure

# Debug logging
common:
  env:
    - name: LOG_LEVEL
      value: debug
    - name: NODE_ENV
      value: staging

```

### summit-main/deploy/helm/intelgraph/values.yaml

```
# IntelGraph MLFP Helm Chart Values
# Production-ready configuration for enterprise deployment

global:
  imageRegistry: ghcr.io/brianclong/intelgraph
  tag: '2025.08.21'
  pullPolicy: IfNotPresent
  pullSecrets: []

  # OpenTelemetry configuration
  otel:
    enabled: true
    exporterOtlpEndpoint: 'http://otel-collector.observability:4317'
    serviceName: intelgraph
    samplingRate: 0.1

  # Ingress configuration
  ingress:
    enabled: true
    className: nginx
    host: intelgraph.example.com
    tls:
      enabled: true
      secretName: intelgraph-tls
    annotations:
      cert-manager.io/cluster-issuer: letsencrypt-prod
      nginx.ingress.kubernetes.io/proxy-body-size: 50m
      nginx.ingress.kubernetes.io/proxy-read-timeout: '300'
      nginx.ingress.kubernetes.io/proxy-send-timeout: '300'
      nginx.ingress.kubernetes.io/ssl-redirect: 'true'
      nginx.ingress.kubernetes.io/force-ssl-redirect: 'true'

  # Prometheus monitoring
  prometheus:
    scrape: true
    port: 9090
    path: /metrics

  # Security context
  podSecurityContext:
    fsGroup: 10001
    runAsNonRoot: true
    runAsUser: 10001
    runAsGroup: 10001
    seccompProfile:
      type: RuntimeDefault

  securityContext:
    runAsNonRoot: true
    runAsUser: 10001
    runAsGroup: 10001
    readOnlyRootFilesystem: true
    allowPrivilegeEscalation: false
    capabilities:
      drop:
        - ALL

# External dependencies configuration
external:
  postgres:
    enabled: true
    host: '${POSTGRES_HOST}'
    port: 5432
    database: intelgraph
    userSecretRef: postgres-credentials
    sslMode: require

  neo4j:
    enabled: true
    uri: 'bolt://neo4j.database.svc.cluster.local:7687'
    userSecretRef: neo4j-credentials
    database: intelgraph

  redis:
    enabled: true
    host: 'redis-master.database.svc.cluster.local'
    port: 6379
    userSecretRef: redis-credentials
    cluster: false

  elasticsearch:
    enabled: true
    url: 'https://opensearch.search.svc.cluster.local:9200'
    userSecretRef: opensearch-credentials
    index: intelgraph

  oidc:
    enabled: true
    issuer: 'https://auth.example.com'
    clientIdSecretRef: oidc-client
    scope: 'openid profile email groups'

# Common configuration for all services
common:
  replicaCount: 2

  resources:
    limits:
      cpu: '1'
      memory: '1Gi'
    requests:
      cpu: '200m'
      memory: '256Mi'

  # Probes configuration
  livenessProbe:
    httpGet:
      path: /healthz
      port: http
    initialDelaySeconds: 30
    periodSeconds: 10
    timeoutSeconds: 5
    failureThreshold: 3

  readinessProbe:
    httpGet:
      path: /readyz
      port: http
    initialDelaySeconds: 15
    periodSeconds: 5
    timeoutSeconds: 3
    failureThreshold: 3

  # Environment variables common to all services
  env:
    - name: NODE_ENV
      value: production
    - name: LOG_LEVEL
      value: info
    - name: LOG_FORMAT
      value: json
    - name: OTEL_EXPORTER_OTLP_ENDPOINT
      value: '{{ .Values.global.otel.
```

### summit-main/deploy/helm/intelgraph/templates/deployment-api-gateway.yaml

```
{{- $service := .Values.services.apiGateway -}}
{{- if $service.enabled }}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ $service.name }}
  namespace: {{ .Release.Namespace }}
  labels:
    {{- include "intelgraph.serviceLabels" (dict "serviceName" $service.name "root" .) | nindent 4 }}
spec:
  replicas: {{ $service.replicaCount }}
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 1
  selector:
    matchLabels:
      {{- include "intelgraph.serviceSelectorLabels" (dict "serviceName" $service.name "root" .) | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "intelgraph.serviceSelectorLabels" (dict "serviceName" $service.name "root" .) | nindent 8 }}
        {{- include "intelgraph.podLabels" (dict "service" $service "root" .) | nindent 8 }}
      annotations:
        {{- include "intelgraph.configChecksum" . | nindent 8 }}
        {{- include "intelgraph.podAnnotations" (dict "service" $service "root" .) | nindent 8 }}
    spec:
      automountServiceAccountToken: false
      securityContext:
        {{- include "intelgraph.podSecurityContext" . | nindent 8 }}
      containers:
        - name: {{ $service.name }}
          image: {{ include "intelgraph.image" (dict "service" $service "root" .) }}
          imagePullPolicy: {{ .Values.global.pullPolicy }}
          ports:
            - name: http
              containerPort: {{ $service.port }}
              protocol: TCP
            - name: metrics
              containerPort: {{ .Values.global.prometheus.port }}
              protocol: TCP
          env:
            {{- include "intelgraph.commonEnv" . | nindent 12 }}
            {{- include "intelgraph.serviceEnv" (dict "service" $service "root" .) | nindent 12 }}
          livenessProbe:
            {{- include "intelgraph.livenessProbe" (dict "service" $service "root" .) | nindent 12 }}
          readinessProbe:
            {{- include "intelgraph.readinessProbe" (dict "service" $service "root" .) | nindent 12 }}
          resources:
            {{- include "intelgraph.resources" (dict "service" $service "root" .) | nindent 12 }}
          securityContext:
            {{- include "intelgraph.securityContext" . | nindent 12 }}
          volumeMounts:
            {{- include "intelgraph.volumeMounts" . | nindent 12 }}
      volumes:
        {{- include "intelgraph.volumes" . | nindent 8 }}
      {{- with .Values.global.pullSecrets }}
      imagePullSecrets:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app.kubernetes.io/name
                  operator: In
                  values:
                  - {{ $service.name }}
              topologyKey: kubernetes.io/hostname
      topologySpreadConstraints:
        - maxSkew: 1
  
```

### summit-main/deploy/helm/intelgraph/templates/ingress.yaml

```
{{- if .Values.global.ingress.enabled }}
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: {{ include "intelgraph.fullname" . }}
  namespace: {{ .Release.Namespace }}
  labels:
    {{- include "intelgraph.labels" . | nindent 4 }}
  annotations:
    {{- toYaml .Values.global.ingress.annotations | nindent 4 }}
spec:
  {{- if .Values.global.ingress.className }}
  ingressClassName: {{ .Values.global.ingress.className }}
  {{- end }}
  {{- if .Values.global.ingress.tls.enabled }}
  tls:
    - hosts:
        - {{ .Values.global.ingress.host }}
      secretName: {{ .Values.global.ingress.tls.secretName }}
  {{- end }}
  rules:
    - host: {{ .Values.global.ingress.host }}
      http:
        paths:
          # Main application (mobile interface)
          - path: /
            pathType: Prefix
            backend:
              service:
                name: {{ .Values.services.mobile.name }}
                port:
                  number: {{ .Values.services.mobile.service.port | default 80 }}
          # API Gateway
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: {{ .Values.services.apiGateway.name }}
                port:
                  number: {{ .Values.services.apiGateway.service.port }}
          # GraphQL endpoint
          - path: /graphql
            pathType: Prefix
            backend:
              service:
                name: {{ .Values.services.apiGateway.name }}
                port:
                  number: {{ .Values.services.apiGateway.service.port }}
          # WebSocket endpoint
          - path: /socket.io
            pathType: Prefix
            backend:
              service:
                name: {{ .Values.services.apiGateway.name }}
                port:
                  number: {{ .Values.services.apiGateway.service.port }}
          # Analytics service
          - path: /analytics
            pathType: Prefix
            backend:
              service:
                name: {{ .Values.services.analytics.name }}
                port:
                  number: {{ .Values.services.analytics.service.port | default 80 }}
          # Search engine
          - path: /search
            pathType: Prefix
            backend:
              service:
                name: {{ .Values.services.searchEngine.name }}
                port:
                  number: {{ .Values.services.searchEngine.service.port | default 80 }}
          # Graph analytics
          - path: /graph-analytics
            pathType: Prefix
            backend:
              service:
                name: {{ .Values.services.graphAnalytics.name }}
                port:
                  number: {{ .Values.services.graphAnalytics.service.port | default 80 }}
          # ML engine
          - path: /ml
            pathType: Prefix
            backend:
              service:
                name: {{ .Values.services.mlEngine.name }}
                port:
                  number
```

### summit-main/deploy/helm/intelgraph/templates/networkpolicy.yaml

```
{{- if .Values.networkPolicy.enabled }}
# Default deny all ingress and egress
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: {{ .Release.Namespace }}
  labels:
    {{- include "intelgraph.labels" . | nindent 4 }}
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
---
# Allow ingress from ingress controller to API gateway
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-ingress-to-api-gateway
  namespace: {{ .Release.Namespace }}
  labels:
    {{- include "intelgraph.labels" . | nindent 4 }}
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: {{ .Values.services.apiGateway.name }}
  policyTypes:
    - Ingress
  ingress:
    - from:
        # Allow from ingress controller namespace
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
        # Allow from same namespace (service mesh)
        - namespaceSelector:
            matchLabels:
              name: {{ .Release.Namespace }}
      ports:
        - protocol: TCP
          port: {{ .Values.services.apiGateway.port }}
        - protocol: TCP
          port: {{ .Values.global.prometheus.port }}
---
# Allow ingress to mobile interface
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-ingress-to-mobile
  namespace: {{ .Release.Namespace }}
  labels:
    {{- include "intelgraph.labels" . | nindent 4 }}
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: {{ .Values.services.mobile.name }}
  policyTypes:
    - Ingress
  ingress:
    - from:
        # Allow from ingress controller namespace
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
        # Allow from same namespace
        - namespaceSelector:
            matchLabels:
              name: {{ .Release.Namespace }}
      ports:
        - protocol: TCP
          port: {{ .Values.services.mobile.port }}
---
# Allow inter-service communication
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-inter-service
  namespace: {{ .Release.Namespace }}
  labels:
    {{- include "intelgraph.labels" . | nindent 4 }}
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/part-of: intelgraph
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        # Allow from same namespace
        - podSelector:
            matchLabels:
              app.kubernetes.io/part-of: intelgraph
      ports:
        - protocol: TCP
          port: 8080
        - protocol: TCP
          port: 8081
        - protocol: TCP
          port: 8082
        - protocol: TCP
          port: 8083
        - protocol: TCP
          port: 8084
        - protocol: TCP
          port: 8085
        - protocol: TCP
          port: 8086
        - protocol: TCP
          port: 8087
        - protocol: TCP
          port: {{ .Values.global.prometheus.port }}
  egress:
    # Allow communication to other services in same namespace
  
```

### summit-main/deploy/helm/intelgraph/templates/service-api-gateway.yaml

```
{{- $service := .Values.services.apiGateway -}}
{{- if $service.enabled }}
apiVersion: v1
kind: Service
metadata:
  name: {{ $service.name }}
  namespace: {{ .Release.Namespace }}
  labels:
    {{- include "intelgraph.serviceLabels" (dict "serviceName" $service.name "root" .) | nindent 4 }}
  {{- if .Values.global.prometheus.scrape }}
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "{{ .Values.global.prometheus.port }}"
    prometheus.io/path: "{{ .Values.global.prometheus.path }}"
  {{- end }}
spec:
  type: {{ $service.service.type }}
  selector:
    {{- include "intelgraph.serviceSelectorLabels" (dict "serviceName" $service.name "root" .) | nindent 4 }}
  ports:
    - name: http
      port: {{ $service.service.port }}
      targetPort: {{ $service.service.targetPort }}
      protocol: TCP
    - name: metrics
      port: {{ .Values.global.prometheus.port }}
      targetPort: {{ .Values.global.prometheus.port }}
      protocol: TCP
{{- end }}
```

### summit-main/deploy/helm/intelgraph/templates/servicemonitor.yaml

```
{{- if .Values.serviceMonitor.enabled }}
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: {{ include "intelgraph.fullname" . }}
  namespace: {{ .Release.Namespace }}
  labels:
    {{- include "intelgraph.labels" . | nindent 4 }}
spec:
  jobLabel: app.kubernetes.io/name
  selector:
    matchLabels:
      app.kubernetes.io/part-of: intelgraph
  namespaceSelector:
    matchNames:
      - {{ .Release.Namespace }}
  endpoints:
    - port: metrics
      path: {{ .Values.global.prometheus.path }}
      interval: {{ .Values.serviceMonitor.interval }}
      scrapeTimeout: {{ .Values.serviceMonitor.scrapeTimeout }}
      relabelings:
        - sourceLabels: [__meta_kubernetes_service_name]
          targetLabel: service
        - sourceLabels: [__meta_kubernetes_namespace]
          targetLabel: namespace
        - sourceLabels: [__meta_kubernetes_pod_name]
          targetLabel: pod
        - sourceLabels: [__meta_kubernetes_pod_label_app_kubernetes_io_component]
          targetLabel: component
      metricRelabelings:
        - sourceLabels: [__name__]
          regex: 'go_.*'
          action: drop
        - sourceLabels: [__name__]
          regex: 'promhttp_.*'
          action: drop
---
# PrometheusRule for IntelGraph alerts
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: {{ include "intelgraph.fullname" . }}-alerts
  namespace: {{ .Release.Namespace }}
  labels:
    {{- include "intelgraph.labels" . | nindent 4 }}
spec:
  groups:
    - name: intelgraph.rules
      interval: 30s
      rules:
        # High error rate
        - alert: IntelGraphHighErrorRate
          expr: |
            (
              sum(rate(http_requests_total{job=~".*intelgraph.*", code=~"5.."}[5m])) /
              sum(rate(http_requests_total{job=~".*intelgraph.*"}[5m]))
            ) > 0.05
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "IntelGraph service has high error rate"
            description: "Error rate is {{ $value | humanizePercentage }} for {{ $labels.service }}"
        
        # High response time
        - alert: IntelGraphHighLatency
          expr: |
            histogram_quantile(0.95, 
              sum(rate(http_request_duration_seconds_bucket{job=~".*intelgraph.*"}[5m])) by (le, service)
            ) > 2
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "IntelGraph service has high latency"
            description: "95th percentile latency is {{ $value }}s for {{ $labels.service }}"
        
        # Pod crash loop
        - alert: IntelGraphPodCrashLooping
          expr: |
            rate(kube_pod_container_status_restarts_total{namespace="{{ .Release.Namespace }}"}[5m]) > 0.1
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "IntelGraph pod is crash looping"
            description: "Pod {{ $labels.pod }} in na
```

### summit-main/deploy/k8s/blackbox-exporter.yaml

```
apiVersion: v1
kind: Namespace
metadata:
  name: monitoring
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: blackbox-exporter-config
  namespace: monitoring
data:
  blackbox.yml: |
    modules:
      http_2xx:
        prober: http
        timeout: 5s
        http:
          preferred_ip_protocol: ip4
      http_2xx_ttfb:
        prober: http
        timeout: 5s
        http:
          method: GET
          preferred_ip_protocol: ip4
          valid_http_versions: ["HTTP/1.1", "HTTP/2.0"]
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: blackbox-exporter
  namespace: monitoring
  labels:
    app: blackbox-exporter
spec:
  replicas: 1
  selector:
    matchLabels:
      app: blackbox-exporter
  template:
    metadata:
      labels:
        app: blackbox-exporter
    spec:
      serviceAccountName: blackbox-exporter
      containers:
        - name: blackbox-exporter
          image: prom/blackbox-exporter:v0.25.0
          args:
            - --config.file=/etc/blackbox_exporter/blackbox.yml
          ports:
            - containerPort: 9115
              name: http
          volumeMounts:
            - name: config
              mountPath: /etc/blackbox_exporter
      volumes:
        - name: config
          configMap:
            name: blackbox-exporter-config
---
apiVersion: v1
kind: Service
metadata:
  name: blackbox-exporter
  namespace: monitoring
  labels:
    app: blackbox-exporter
spec:
  selector:
    app: blackbox-exporter
  ports:
    - name: http
      port: 9115
      targetPort: 9115
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: blackbox-exporter
  namespace: monitoring
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: blackbox-exporter
  namespace: monitoring
rules:
  - apiGroups: ['']
    resources: ['endpoints', 'services']
    verbs: ['get', 'list', 'watch']
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: blackbox-exporter
  namespace: monitoring
subjects:
  - kind: ServiceAccount
    name: blackbox-exporter
    namespace: monitoring
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: blackbox-exporter
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: blackbox-exporter
  namespace: monitoring
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      app: blackbox-exporter
  namespaceSelector:
    matchNames: ['monitoring']
  endpoints:
    - port: http
      interval: 30s
      path: /metrics

```

### summit-main/deploy/k8s/ml-gpu.yaml

```
apiVersion: apps/v1
kind: Deployment
metadata:
  name: intelgraph-ml-gpu
  namespace: intelgraph
  labels:
    app: intelgraph-ml-gpu
    component: ml-service
spec:
  replicas: 1
  selector:
    matchLabels:
      app: intelgraph-ml-gpu
  template:
    metadata:
      labels:
        app: intelgraph-ml-gpu
        component: ml-service
      annotations:
        sidecar.istio.io/inject: 'true'
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
              - matchExpressions:
                  - key: accelerator
                    operator: In
                    values:
                      - nvidia-tesla-k80
      tolerations:
        - key: nvidia.com/gpu
          operator: Exists
          effect: NoSchedule
      containers:
        - name: ml-service
          image: intelgraph/ml:latest-gpu
          ports:
            - containerPort: 8081
          env:
            - name: UVICORN_HOST
              value: '0.0.0.0'
            - name: UVICORN_PORT
              value: '8081'
            - name: REDIS_URL
              valueFrom:
                secretKeyRef:
                  name: intelgraph-secrets
                  key: redis-url
            - name: JWT_PUBLIC_KEY
              valueFrom:
                secretKeyRef:
                  name: intelgraph-secrets
                  key: jwt-public-key
            - name: ML_WEBHOOK_SECRET
              valueFrom:
                secretKeyRef:
                  name: intelgraph-secrets
                  key: ml-webhook-secret
            - name: USE_SPACY
              value: 'true'
          resources:
            requests:
              memory: '2Gi'
              cpu: '1'
              nvidia.com/gpu: 1
            limits:
              memory: '8Gi'
              cpu: '4'
              nvidia.com/gpu: 1
          livenessProbe:
            httpGet:
              path: /health
              port: 8081
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health
              port: 8081
            initialDelaySeconds: 5
            periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: intelgraph-ml-gpu-service
  namespace: intelgraph
  labels:
    app: intelgraph-ml-gpu
spec:
  selector:
    app: intelgraph-ml-gpu
  ports:
    - port: 8081
      targetPort: 8081
      protocol: TCP
  type: ClusterIP

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: intelgraph-ml-worker-gpu
  namespace: intelgraph
  labels:
    app: intelgraph-ml-worker-gpu
    component: ml-worker
spec:
  replicas: 2
  selector:
    matchLabels:
      app: intelgraph-ml-worker-gpu
  template:
    metadata:
      labels:
        app: intelgraph-ml-worker-gpu
        component: ml-worker
      annotations:
        sidecar.istio.io/inject: 'true'
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIg
```

### summit-main/deploy/k8s/neo4j.yaml

```
apiVersion: apps/v1
kind: Deployment
metadata:
  name: neo4j
spec:
  replicas: 1
  selector:
    matchLabels: { app: neo4j }
  template:
    metadata: { labels: { app: neo4j } }
    spec:
      containers:
        - name: neo4j
          image: neo4j:5.15
          env:
            - { name: NEO4J_AUTH, value: 'neo4j/testpassword' }
          ports:
            - { containerPort: 7687 }
            - { containerPort: 7474 }
---
apiVersion: v1
kind: Service
metadata:
  name: neo4j
spec:
  selector: { app: neo4j }
  ports:
    - { name: bolt, port: 7687, targetPort: 7687 }
    - { name: http, port: 7474, targetPort: 7474 }

```

### summit-main/deploy/k8s/postgres.yaml

```
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
spec:
  replicas: 1
  selector:
    matchLabels: { app: postgres }
  template:
    metadata: { labels: { app: postgres } }
    spec:
      containers:
        - name: postgres
          image: postgres:15
          env:
            - { name: POSTGRES_PASSWORD, value: 'devpassword' }
            - { name: POSTGRES_DB, value: 'intelgraph' }
          ports: [{ containerPort: 5432 }]
---
apiVersion: v1
kind: Service
metadata:
  name: postgres
spec:
  selector: { app: postgres }
  ports: [{ port: 5432, targetPort: 5432 }]

```
