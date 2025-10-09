# Summit v0.1.0 Quick Start Guide

## Prerequisites

- Docker 24+ 
- Docker Compose v2.20+
- 8GB RAM available
- Open ports: 80, 3000, 4000, 5432, 6379, 7474, 7687, 9090

## Setup

1. Clone Summit repo next to this pack (or adjust build contexts)
```bash
git clone https://github.com/BrianCLong/summit.git
cd summit-release-v0.1.0
```

2. Configure environment
```bash
cp .env.example .env
# Edit secrets, then:
export $(grep -v '^#' .env | xargs)
```

3. Bring up core stack
```bash
make up            # equivalent: docker compose -f compose/docker-compose.yml up -d --build
```

4. (Optional) Add observability and AI
```bash
make up-obs        # Prometheus/Grafana/Loki/Tempo/OTel
make up-ai         # AI services
make up-kafka      # Kafka stack
```

5. Verify health
```bash
make smoke
```

## Access Points

- UI:         http://localhost
- Client:     http://localhost:3000
- GraphQL:    http://localhost:4000/graphql
- Neo4j UI:   http://localhost:7474  (user: neo4j / pass from .env)
- Adminer:    http://localhost:8080
- Grafana:    http://localhost:3001 (admin/admin; change at first login)