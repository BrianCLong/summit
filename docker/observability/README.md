# Summit Local Observability Stack

This directory contains configuration and documentation for the Summit local observability stack.

## Components

- **Prometheus**: Metrics collection and storage.
- **Grafana**: Dashboarding and visualization.
- **Loki**: Log aggregation.
- **Promtail**: Log collection from Docker containers.

## Usage

To spin up the observability stack, run:

```bash
docker-compose -f docker-compose.observability.yml up -d
```

## Dashboards

Once the stack is running, you can access Grafana at [http://localhost:3001](http://localhost:3001).

Default credentials:
- Username: `admin`
- Password: `admin`

Pre-configured dashboards can be found in the `Summit` folder.

## Metrics

The following services are configured for scraping:
- `summit-api`: http://api:4000
- `summit-gateway`: http://gateway:4100
- `summit-worker`: http://ai-worker:8000

## Logs

Logs are collected automatically from all Docker containers and sent to Loki. You can query them in Grafana using the `Loki` datasource.
